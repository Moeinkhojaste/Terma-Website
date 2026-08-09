using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class ProductMedia : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = null!;
    public string PublicUrl { get; private set; } = string.Empty;
    public string AltText { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }
    public bool IsPrimary { get; private set; }

    private ProductMedia() { }

    public ProductMedia(Guid productId, string publicUrl, string altText, int sortOrder, bool isPrimary)
    {
        ProductId = productId;
        PublicUrl = publicUrl.Trim();
        AltText = altText.Trim();
        SortOrder = sortOrder;
        IsPrimary = isPrimary;
    }

    public void Update(string altText, int sortOrder, bool isPrimary)
    {
        AltText = altText.Trim();
        SortOrder = sortOrder;
        IsPrimary = isPrimary;
        MarkUpdated();
    }
}
