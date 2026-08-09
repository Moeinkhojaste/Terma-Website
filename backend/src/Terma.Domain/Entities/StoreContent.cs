using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class StoreContent : BaseEntity
{
    public string PageKey { get; private set; } = string.Empty;
    public string SectionKey { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public string? LinkUrl { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? SeoTitle { get; private set; }
    public string? SeoDescription { get; private set; }
    public bool IsPublished { get; private set; } = true;
    private StoreContent() { }
    public StoreContent(string pageKey, string sectionKey, string title, string body, string? linkUrl, string? imageUrl, string? seoTitle, string? seoDescription)
    { PageKey = pageKey.Trim(); SectionKey = sectionKey.Trim(); Title = title.Trim(); Body = body.Trim(); LinkUrl = linkUrl?.Trim(); ImageUrl = imageUrl?.Trim(); SeoTitle = seoTitle?.Trim(); SeoDescription = seoDescription?.Trim(); }
    public void Update(string title, string body, string? linkUrl, string? imageUrl, string? seoTitle, string? seoDescription, bool published)
    { Title = title.Trim(); Body = body.Trim(); LinkUrl = linkUrl?.Trim(); ImageUrl = imageUrl?.Trim(); SeoTitle = seoTitle?.Trim(); SeoDescription = seoDescription?.Trim(); IsPublished = published; MarkUpdated(); }
}
