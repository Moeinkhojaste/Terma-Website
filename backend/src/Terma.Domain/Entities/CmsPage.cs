using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public enum CmsPageStatus
{
    Draft,
    Scheduled,
    Published,
    Archived
}

public sealed class CmsPage : BaseEntity
{
    private static readonly HashSet<string> ReservedSlugs = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "api", "products", "cart", "checkout", "order", "style-guide"
    };

    public string Slug { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public bool IsSystem { get; private set; }
    public CmsPageStatus Status { get; private set; } = CmsPageStatus.Draft;
    public Guid? DraftRevisionId { get; private set; }
    public Guid? PublishedRevisionId { get; private set; }
    public Guid? ScheduledRevisionId { get; private set; }
    public DateTime? PublishAtUtc { get; private set; }
    public long RowVersion { get; private set; } = 1;

    private CmsPage() { }

    public CmsPage(string slug, string name, bool isSystem = false)
    {
        Slug = NormalizeSlug(slug, isSystem);
        Name = Required(name, "Page name", 200);
        IsSystem = isSystem;
    }

    public void Rename(string slug, string name)
    {
        if (IsSystem && !string.Equals(Slug, slug, StringComparison.OrdinalIgnoreCase))
            throw new DomainException("System page slugs cannot be changed.");

        Slug = NormalizeSlug(slug, IsSystem);
        Name = Required(name, "Page name", 200);
        Touch();
    }

    public void SaveDraft(Guid revisionId)
    {
        EnsureActive();
        DraftRevisionId = revisionId;
        if (PublishedRevisionId is null) Status = CmsPageStatus.Draft;
        Touch();
    }

    public void Publish(Guid revisionId)
    {
        EnsureActive();
        DraftRevisionId = revisionId;
        PublishedRevisionId = revisionId;
        ScheduledRevisionId = null;
        PublishAtUtc = null;
        Status = CmsPageStatus.Published;
        Touch();
    }

    public void Schedule(Guid revisionId, DateTime publishAtUtc, DateTime nowUtc)
    {
        EnsureActive();
        if (publishAtUtc <= nowUtc) throw new DomainException("Scheduled publish time must be in the future.");
        DraftRevisionId = revisionId;
        ScheduledRevisionId = revisionId;
        PublishAtUtc = DateTime.SpecifyKind(publishAtUtc, DateTimeKind.Utc);
        Status = CmsPageStatus.Scheduled;
        Touch();
    }

    public void PublishScheduled(DateTime nowUtc)
    {
        if (Status != CmsPageStatus.Scheduled || ScheduledRevisionId is null || PublishAtUtc is null || PublishAtUtc > nowUtc)
            return;
        Publish(ScheduledRevisionId.Value);
    }

    public void Archive()
    {
        if (IsSystem) throw new DomainException("System pages cannot be archived.");
        Status = CmsPageStatus.Archived;
        ScheduledRevisionId = null;
        PublishAtUtc = null;
        Touch();
    }

    private void EnsureActive()
    {
        if (Status == CmsPageStatus.Archived) throw new DomainException("Archived pages cannot be edited.");
    }

    private void Touch()
    {
        RowVersion++;
        MarkUpdated();
    }

    private static string NormalizeSlug(string value, bool isSystem)
    {
        var slug = Required(value, "Slug", 120).Trim('/').ToLowerInvariant();
        if (slug.Length == 0 || slug.Any(ch => !(char.IsAsciiLetterOrDigit(ch) || ch == '-')) || slug.StartsWith('-') || slug.EndsWith('-') || slug.Contains("--"))
            throw new DomainException("Slug may only contain lowercase English letters, numbers and single hyphens.");
        if (!isSystem && ReservedSlugs.Contains(slug)) throw new DomainException($"Slug '{slug}' is reserved.");
        return slug;
    }

    private static string Required(string value, string field, int maxLength)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length == 0 || normalized.Length > maxLength) throw new DomainException($"{field} is required and must be at most {maxLength} characters.");
        return normalized;
    }
}
