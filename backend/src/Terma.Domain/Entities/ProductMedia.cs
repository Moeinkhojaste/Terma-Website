using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public enum ProductMediaKind
{
    Full,
    Table,
    Folded,
    Texture,
    Stitching,
    Lining,
    Other
}

public sealed class ProductMedia : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = null!;
    public string PublicUrl { get; private set; } = string.Empty;
    public string AltText { get; private set; } = string.Empty;
    public ProductMediaKind Kind { get; private set; } = ProductMediaKind.Other;
    public int SortOrder { get; private set; }
    public bool IsPrimary { get; private set; }

    private ProductMedia() { }

    public ProductMedia(Guid productId, string publicUrl, string altText, ProductMediaKind kind, int sortOrder, bool isPrimary)
    {
        if (productId == Guid.Empty) throw new DomainException("Product is required.");
        ProductId = productId;
        PublicUrl = Required(publicUrl, "Media URL");
        Apply(altText, kind, sortOrder, isPrimary);
    }

    public void Update(string publicUrl, string altText, ProductMediaKind kind, int sortOrder, bool isPrimary)
    {
        PublicUrl = Required(publicUrl, "Media URL");
        Apply(altText, kind, sortOrder, isPrimary);
        MarkUpdated();
    }

    private void Apply(string altText, ProductMediaKind kind, int sortOrder, bool isPrimary)
    {
        if (!Enum.IsDefined(kind)) throw new DomainException("Media kind is invalid.");
        if (sortOrder < 0) throw new DomainException("Media sort order cannot be negative.");
        AltText = Required(altText, "Media alt text");
        Kind = kind;
        SortOrder = sortOrder;
        IsPrimary = isPrimary;
    }

    private static string Required(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new DomainException($"{fieldName} is required.");
        return value.Trim();
    }
}
