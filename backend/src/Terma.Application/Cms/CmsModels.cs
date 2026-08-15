using System.Text.Json;
using Terma.Domain.Entities;

namespace Terma.Application.Cms;

public sealed class CmsDocumentDto
{
    public int SchemaVersion { get; init; } = 1;
    public CmsSeoDto Seo { get; init; } = new();
    public IReadOnlyList<CmsBlockDto> Blocks { get; init; } = [];
}

public sealed class CmsSeoDto
{
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? CanonicalPath { get; init; }
    public string? OgImageUrl { get; init; }
    public bool NoIndex { get; init; }
}

public sealed class CmsBlockDto
{
    public string Id { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public JsonElement Data { get; init; }
}

public sealed class CreateCmsPageRequest
{
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public sealed class SaveCmsDraftRequest
{
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public CmsDocumentDto Document { get; init; } = new();
}

public sealed class ScheduleCmsPageRequest
{
    public DateTime PublishAtUtc { get; init; }
}

public sealed class UpdateMediaAssetRequest
{
    public string Name { get; init; } = string.Empty;
    public string AltText { get; init; } = string.Empty;
}

public sealed record CmsPageSummaryDto(Guid Id, string Slug, string Name, CmsPageStatus Status, bool IsSystem, int LatestRevisionNumber, DateTime? PublishAtUtc, DateTime CreatedAt, DateTime? UpdatedAt, string RowVersion);
public sealed record CmsPageDetailDto(Guid Id, string Slug, string Name, CmsPageStatus Status, bool IsSystem, Guid? DraftRevisionId, Guid? PublishedRevisionId, DateTime? PublishAtUtc, CmsDocumentDto Document, string RowVersion);
public sealed record CmsRevisionDto(Guid Id, int Number, DateTime CreatedAt, string CreatedBy, bool IsPublished, bool IsDraft);
public sealed record CmsPublishedPageDto(string Slug, string Name, CmsDocumentDto Document, DateTime PublishedAt);
public sealed record MediaAssetDto(Guid Id, string StorageKey, string PublicUrl, string Name, string AltText, string ContentType, long Length, DateTime CreatedAt);

public interface ICmsService
{
    Task<IReadOnlyList<CmsPageSummaryDto>> ListPagesAsync(string? search, CmsPageStatus? status, CancellationToken cancellationToken);
    Task<CmsPageDetailDto> GetPageAsync(Guid id, CancellationToken cancellationToken);
    Task<CmsPublishedPageDto> GetPublishedPageAsync(string slug, CancellationToken cancellationToken);
    Task<CmsPublishedPageDto> GetPublishedSiteAsync(CancellationToken cancellationToken);
    Task<CmsPageDetailDto> CreatePageAsync(CreateCmsPageRequest request, string actor, CancellationToken cancellationToken);
    Task<CmsPageDetailDto> SaveDraftAsync(Guid id, SaveCmsDraftRequest request, string ifMatch, string actor, CancellationToken cancellationToken);
    Task<CmsPageDetailDto> PublishAsync(Guid id, string ifMatch, string actor, CancellationToken cancellationToken);
    Task<CmsPageDetailDto> ScheduleAsync(Guid id, ScheduleCmsPageRequest request, string ifMatch, string actor, CancellationToken cancellationToken);
    Task<CmsPageDetailDto> RestoreAsync(Guid id, Guid revisionId, string ifMatch, string actor, CancellationToken cancellationToken);
    Task ArchiveAsync(Guid id, string ifMatch, CancellationToken cancellationToken);
    Task<IReadOnlyList<CmsRevisionDto>> RevisionsAsync(Guid id, CancellationToken cancellationToken);
    Task PublishScheduledAsync(DateTime nowUtc, CancellationToken cancellationToken);
    Task<IReadOnlyList<MediaAssetDto>> ListMediaAsync(string? search, CancellationToken cancellationToken);
    Task<MediaAssetDto> RegisterMediaAsync(string storageKey, string publicUrl, string name, string altText, string contentType, long length, CancellationToken cancellationToken);
    Task<MediaAssetDto> UpdateMediaAsync(Guid id, UpdateMediaAssetRequest request, CancellationToken cancellationToken);
    Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken);
}
