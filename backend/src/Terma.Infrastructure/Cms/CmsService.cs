using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Terma.Application.Cms;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Cms;

public sealed class CmsService(TermaDbContext db, IMediaStorage mediaStorage, TimeProvider timeProvider) : ICmsService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<CmsPageSummaryDto>> ListPagesAsync(string? search, CmsPageStatus? status, CancellationToken cancellationToken)
    {
        var query = db.CmsPages.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Name.Contains(term) || x.Slug.Contains(term));
        }
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var pages = await query.OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt).ToListAsync(cancellationToken);
        var pageIds = pages.Select(x => x.Id).ToArray();
        var revisionNumbers = await db.CmsRevisions.AsNoTracking().Where(x => pageIds.Contains(x.PageId)).GroupBy(x => x.PageId)
            .Select(x => new { PageId = x.Key, Number = x.Max(r => r.Number) }).ToDictionaryAsync(x => x.PageId, x => x.Number, cancellationToken);
        return pages.Select(x => new CmsPageSummaryDto(x.Id, x.Slug, x.Name, x.Status, x.IsSystem, revisionNumbers.GetValueOrDefault(x.Id), x.PublishAtUtc, x.CreatedAt, x.UpdatedAt, ETag(x.RowVersion))).ToList();
    }

    public async Task<CmsPageDetailDto> GetPageAsync(Guid id, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, false, cancellationToken);
        return await MapDetailAsync(page, cancellationToken);
    }

    public Task<CmsPublishedPageDto> GetPublishedSiteAsync(CancellationToken cancellationToken) => GetPublishedPageAsync("site-settings", cancellationToken);

    public async Task<CmsPublishedPageDto> GetPublishedPageAsync(string slug, CancellationToken cancellationToken)
    {
        var page = await db.CmsPages.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == slug.ToLower() && x.Status != CmsPageStatus.Archived, cancellationToken)
            ?? throw new NotFoundException($"CMS page '{slug}' was not found.");
        if (page.PublishedRevisionId is null) throw new NotFoundException($"CMS page '{slug}' is not published.");
        var revision = await db.CmsRevisions.AsNoTracking().SingleAsync(x => x.Id == page.PublishedRevisionId, cancellationToken);
        var doc = Deserialize(revision.DocumentJson);

        if (string.Equals(slug, "contact", StringComparison.OrdinalIgnoreCase))
        {
            var sitePage = await db.CmsPages.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == "site-settings" && x.Status != CmsPageStatus.Archived, cancellationToken);
            if (sitePage?.PublishedRevisionId != null)
            {
                var siteRev = await db.CmsRevisions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == sitePage.PublishedRevisionId.Value, cancellationToken);
                if (siteRev != null)
                {
                    var siteDoc = Deserialize(siteRev.DocumentJson);
                    doc = MergeContactWithSiteSettings(doc, siteDoc);
                }
            }
        }

        return new(page.Slug, page.Name, doc, revision.CreatedAt);
    }

    public async Task<CmsPageDetailDto> CreatePageAsync(CreateCmsPageRequest request, string actor, CancellationToken cancellationToken)
    {
        if (await db.CmsPages.AnyAsync(x => x.Slug == request.Slug.Trim().ToLower(), cancellationToken)) throw new ConflictException("A page with this slug already exists.");
        var page = new CmsPage(request.Slug, request.Name);
        var document = new CmsDocumentDto { Seo = new() { Title = request.Name }, Blocks = [] };
        CmsDocumentValidator.Validate(document);
        var revision = new CmsRevision(page.Id, 1, Serialize(document), actor);
        page.SaveDraft(revision.Id);
        await db.CmsPages.AddAsync(page, cancellationToken);
        await db.CmsRevisions.AddAsync(revision, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return MapDetail(page, document);
    }

    public async Task<CmsPageDetailDto> SaveDraftAsync(Guid id, SaveCmsDraftRequest request, string ifMatch, string actor, CancellationToken cancellationToken)
    {
        CmsDocumentValidator.Validate(request.Document);
        var page = await PageAsync(id, true, cancellationToken);
        CheckVersion(page, ifMatch);
        if (!string.Equals(page.Slug, request.Slug.Trim(), StringComparison.OrdinalIgnoreCase) && await db.CmsPages.AnyAsync(x => x.Id != id && x.Slug == request.Slug.Trim().ToLower(), cancellationToken))
            throw new ConflictException("A page with this slug already exists.");
        page.Rename(request.Slug, request.Name);
        var revision = new CmsRevision(page.Id, await NextRevisionNumberAsync(page.Id, cancellationToken), Serialize(request.Document), actor);
        page.SaveDraft(revision.Id);
        await db.CmsRevisions.AddAsync(revision, cancellationToken);
        await SyncContactInfoAsync(page, request.Document, isPublish: false, actor, cancellationToken);
        await SaveAsync(cancellationToken);
        return MapDetail(page, request.Document);
    }

    public async Task<CmsPageDetailDto> PublishAsync(Guid id, string ifMatch, string actor, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, true, cancellationToken);
        CheckVersion(page, ifMatch);
        if (page.DraftRevisionId is null) throw new ConflictException("This page has no draft to publish.");
        page.Publish(page.DraftRevisionId.Value);
        var pubRev = await db.CmsRevisions.SingleAsync(x => x.Id == page.DraftRevisionId.Value, cancellationToken);
        var pubDoc = Deserialize(pubRev.DocumentJson);
        await SyncContactInfoAsync(page, pubDoc, isPublish: true, actor, cancellationToken);
        await SaveAsync(cancellationToken);
        return await MapDetailAsync(page, cancellationToken);
    }

    public async Task<CmsPageDetailDto> ScheduleAsync(Guid id, ScheduleCmsPageRequest request, string ifMatch, string actor, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, true, cancellationToken);
        CheckVersion(page, ifMatch);
        if (page.DraftRevisionId is null) throw new ConflictException("This page has no draft to schedule.");
        page.Schedule(page.DraftRevisionId.Value, request.PublishAtUtc.ToUniversalTime(), timeProvider.GetUtcNow().UtcDateTime);
        await SaveAsync(cancellationToken);
        return await MapDetailAsync(page, cancellationToken);
    }

    public async Task<CmsPageDetailDto> RestoreAsync(Guid id, Guid revisionId, string ifMatch, string actor, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, true, cancellationToken);
        CheckVersion(page, ifMatch);
        var source = await db.CmsRevisions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == revisionId && x.PageId == id, cancellationToken)
            ?? throw new NotFoundException("CMS revision was not found.");
        var revision = new CmsRevision(id, await NextRevisionNumberAsync(id, cancellationToken), source.DocumentJson, actor);
        page.SaveDraft(revision.Id);
        await db.CmsRevisions.AddAsync(revision, cancellationToken);
        await SaveAsync(cancellationToken);
        return MapDetail(page, Deserialize(source.DocumentJson));
    }

    public async Task ArchiveAsync(Guid id, string ifMatch, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, true, cancellationToken);
        CheckVersion(page, ifMatch);
        page.Archive();
        await SaveAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CmsRevisionDto>> RevisionsAsync(Guid id, CancellationToken cancellationToken)
    {
        var page = await PageAsync(id, false, cancellationToken);
        return await db.CmsRevisions.AsNoTracking().Where(x => x.PageId == id).OrderByDescending(x => x.Number)
            .Select(x => new CmsRevisionDto(x.Id, x.Number, x.CreatedAt, x.CreatedBy, x.Id == page.PublishedRevisionId, x.Id == page.DraftRevisionId)).ToListAsync(cancellationToken);
    }

    public async Task PublishScheduledAsync(DateTime nowUtc, CancellationToken cancellationToken)
    {
        var pages = await db.CmsPages.Where(x => x.Status == CmsPageStatus.Scheduled && x.PublishAtUtc <= nowUtc).ToListAsync(cancellationToken);
        foreach (var page in pages) page.PublishScheduled(nowUtc);
        if (pages.Count > 0) await SaveAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MediaAssetDto>> ListMediaAsync(string? search, CancellationToken cancellationToken)
    {
        var query = db.MediaAssets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Name.Contains(search.Trim()) || x.AltText.Contains(search.Trim()));
        return await query.OrderByDescending(x => x.CreatedAt).Select(x => MapMedia(x)).ToListAsync(cancellationToken);
    }

    public async Task<MediaAssetDto> RegisterMediaAsync(string storageKey, string publicUrl, string name, string altText, string contentType, long length, CancellationToken cancellationToken)
    {
        var asset = new MediaAsset(storageKey, publicUrl, name, altText, contentType, length);
        await db.MediaAssets.AddAsync(asset, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return MapMedia(asset);
    }

    public async Task<MediaAssetDto> UpdateMediaAsync(Guid id, UpdateMediaAssetRequest request, CancellationToken cancellationToken)
    {
        var asset = await db.MediaAssets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException("Media asset was not found.");
        asset.Update(request.Name, request.AltText);
        await db.SaveChangesAsync(cancellationToken);
        return MapMedia(asset);
    }

    public async Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken)
    {
        var asset = await db.MediaAssets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException("Media asset was not found.");
        var activeReferences = await db.CmsPages.AsNoTracking().Where(x => x.Status != CmsPageStatus.Archived)
            .Select(x => new { x.DraftRevisionId, x.PublishedRevisionId }).ToListAsync(cancellationToken);
        var activeRevisionIds = activeReferences.SelectMany(x => new[] { x.DraftRevisionId, x.PublishedRevisionId }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        if (await db.CmsRevisions.AsNoTracking().AnyAsync(x => activeRevisionIds.Contains(x.Id) && x.DocumentJson.Contains(asset.PublicUrl), cancellationToken))
            throw new ConflictException("This image is used by CMS content and cannot be deleted.");
        await mediaStorage.DeleteAsync(asset.StorageKey, cancellationToken);
        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<CmsPage> PageAsync(Guid id, bool tracked, CancellationToken cancellationToken)
    {
        var query = tracked ? db.CmsPages.AsQueryable() : db.CmsPages.AsNoTracking();
        return await query.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException("CMS page was not found.");
    }

    private async Task<CmsPageDetailDto> MapDetailAsync(CmsPage page, CancellationToken cancellationToken)
    {
        var revisionId = page.DraftRevisionId ?? page.PublishedRevisionId ?? throw new ConflictException("CMS page has no revision.");
        var revision = await db.CmsRevisions.AsNoTracking().SingleAsync(x => x.Id == revisionId, cancellationToken);
        return MapDetail(page, Deserialize(revision.DocumentJson));
    }

    private static CmsPageDetailDto MapDetail(CmsPage page, CmsDocumentDto document) =>
        new(page.Id, page.Slug, page.Name, page.Status, page.IsSystem, page.DraftRevisionId, page.PublishedRevisionId, page.PublishAtUtc, document, ETag(page.RowVersion));

    private async Task<int> NextRevisionNumberAsync(Guid pageId, CancellationToken cancellationToken) =>
        (await db.CmsRevisions.Where(x => x.PageId == pageId).MaxAsync(x => (int?)x.Number, cancellationToken) ?? 0) + 1;

    private static void CheckVersion(CmsPage page, string ifMatch)
    {
        if (string.IsNullOrWhiteSpace(ifMatch)) throw new PreconditionFailedException("If-Match header is required.");
        if (!string.Equals(ETag(page.RowVersion), ifMatch.Trim(), StringComparison.Ordinal)) throw new PreconditionFailedException("This content was changed in another session. Reload the latest version before saving.");
    }

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { throw new PreconditionFailedException("This content was changed in another session. Reload the latest version before saving."); }
    }

    private static CmsDocumentDto MergeContactWithSiteSettings(CmsDocumentDto contactDoc, CmsDocumentDto siteDoc)
    {
        var siteContactBlock = siteDoc.Blocks.FirstOrDefault(b => string.Equals(b.Type, "contactInfo", StringComparison.OrdinalIgnoreCase));
        if (siteContactBlock is null) return contactDoc;

        var siteDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(siteContactBlock.Data.GetRawText(), JsonOptions) ?? new();
        string? GetSiteStr(string key) =>
            siteDict.TryGetValue(key, out var val) && val.ValueKind == JsonValueKind.String ? val.GetString() : null;

        var contactBlock = contactDoc.Blocks.FirstOrDefault(b => string.Equals(b.Type, "contactInfo", StringComparison.OrdinalIgnoreCase));
        if (contactBlock is null) return contactDoc;

        var contactDict = JsonSerializer.Deserialize<Dictionary<string, object?>>(contactBlock.Data.GetRawText(), JsonOptions) ?? new();

        void OverrideIfSiteHas(string key)
        {
            var siteVal = GetSiteStr(key);
            if (!string.IsNullOrWhiteSpace(siteVal))
            {
                contactDict[key] = siteVal;
            }
        }

        OverrideIfSiteHas("email");
        OverrideIfSiteHas("phone");
        OverrideIfSiteHas("instagramUrl");
        OverrideIfSiteHas("telegramUrl");
        OverrideIfSiteHas("whatsappUrl");
        OverrideIfSiteHas("responseHours");

        if (contactDict.TryGetValue("text", out var textObj) && textObj?.ToString() is string textStr && (textStr.Contains("۸۸۸۸۸۸۸۸") || textStr.Contains("info@terma.ir")))
        {
            contactDict["text"] = "برای راهنمایی انتخاب محصول، پیگیری سفارش، پیشنهاد همکاری یا هر پرسش دیگر، با ما در ارتباط باشید.";
        }

        var newElement = JsonSerializer.SerializeToElement(contactDict, JsonOptions);
        var newBlocks = contactDoc.Blocks.Select(b => b.Id == contactBlock.Id ? new CmsBlockDto { Id = b.Id, Type = b.Type, Data = newElement } : b).ToList();

        return new CmsDocumentDto
        {
            SchemaVersion = contactDoc.SchemaVersion,
            Seo = contactDoc.Seo,
            Blocks = newBlocks
        };
    }

    private async Task SyncContactInfoAsync(CmsPage sourcePage, CmsDocumentDto sourceDoc, bool isPublish, string actor, CancellationToken cancellationToken)
    {
        string targetSlug;
        if (string.Equals(sourcePage.Slug, "site-settings", StringComparison.OrdinalIgnoreCase))
            targetSlug = "contact";
        else if (string.Equals(sourcePage.Slug, "contact", StringComparison.OrdinalIgnoreCase))
            targetSlug = "site-settings";
        else
            return;

        var sourceContactBlock = sourceDoc.Blocks.FirstOrDefault(b => string.Equals(b.Type, "contactInfo", StringComparison.OrdinalIgnoreCase));
        if (sourceContactBlock is null) return;

        var sourceDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(sourceContactBlock.Data.GetRawText(), JsonOptions) ?? new();
        string? GetSourceStr(string key) =>
            sourceDict.TryGetValue(key, out var val) && val.ValueKind == JsonValueKind.String ? val.GetString() : null;

        var targetPage = await db.CmsPages.SingleOrDefaultAsync(x => x.Slug == targetSlug && x.Status != CmsPageStatus.Archived, cancellationToken);
        if (targetPage is null) return;

        var targetRevisionId = isPublish ? (targetPage.PublishedRevisionId ?? targetPage.DraftRevisionId) : (targetPage.DraftRevisionId ?? targetPage.PublishedRevisionId);
        if (targetRevisionId is null) return;

        var targetRevision = await db.CmsRevisions.SingleOrDefaultAsync(x => x.Id == targetRevisionId.Value, cancellationToken);
        if (targetRevision is null) return;

        var targetDoc = Deserialize(targetRevision.DocumentJson);
        var targetBlock = targetDoc.Blocks.FirstOrDefault(b => string.Equals(b.Type, "contactInfo", StringComparison.OrdinalIgnoreCase));
        if (targetBlock is null) return;

        var targetDict = JsonSerializer.Deserialize<Dictionary<string, object?>>(targetBlock.Data.GetRawText(), JsonOptions) ?? new();

        void CopyProp(string propName)
        {
            var str = GetSourceStr(propName);
            if (!string.IsNullOrWhiteSpace(str))
            {
                targetDict[propName] = str;
            }
        }

        CopyProp("email");
        CopyProp("phone");
        CopyProp("instagramUrl");
        CopyProp("telegramUrl");
        CopyProp("whatsappUrl");
        CopyProp("responseHours");

        if (targetSlug == "contact" && targetDict.TryGetValue("text", out var txtObj) && txtObj?.ToString() is string txtStr && (txtStr.Contains("۸۸۸۸۸۸۸۸") || txtStr.Contains("info@terma.ir")))
        {
            targetDict["text"] = "برای راهنمایی انتخاب محصول، پیگیری سفارش، پیشنهاد همکاری یا هر پرسش دیگر، با ما در ارتباط باشید.";
        }

        var newTargetBlockData = JsonSerializer.SerializeToElement(targetDict, JsonOptions);
        var updatedBlocks = targetDoc.Blocks.Select(b => b.Id == targetBlock.Id ? new CmsBlockDto { Id = b.Id, Type = b.Type, Data = newTargetBlockData } : b).ToList();
        var updatedTargetDoc = new CmsDocumentDto
        {
            SchemaVersion = targetDoc.SchemaVersion,
            Seo = targetDoc.Seo,
            Blocks = updatedBlocks
        };

        var newRevisionNumber = await NextRevisionNumberAsync(targetPage.Id, cancellationToken);
        var newRevision = new CmsRevision(targetPage.Id, newRevisionNumber, Serialize(updatedTargetDoc), actor);
        await db.CmsRevisions.AddAsync(newRevision, cancellationToken);

        if (isPublish)
        {
            targetPage.Publish(newRevision.Id);
        }
        else
        {
            targetPage.SaveDraft(newRevision.Id);
        }
    }

    private static string ETag(long version) => $"\"{version}\"";
    private static string Serialize(CmsDocumentDto document) => JsonSerializer.Serialize(document, JsonOptions);
    private static CmsDocumentDto Deserialize(string json) => JsonSerializer.Deserialize<CmsDocumentDto>(json, JsonOptions) ?? throw new InvalidOperationException("CMS document is invalid.");
    private static MediaAssetDto MapMedia(MediaAsset x) => new(x.Id, x.StorageKey, x.PublicUrl, x.Name, x.AltText, x.ContentType, x.Length, x.CreatedAt);
}
