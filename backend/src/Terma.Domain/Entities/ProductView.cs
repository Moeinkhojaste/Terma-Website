using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class ProductView : BaseEntity
{
    public Guid ProductId { get; private set; }
    public string? VisitorHash { get; private set; }
    public DateTime ViewedAtUtc { get; private set; }

    private ProductView() { }

    public ProductView(Guid productId, string? visitorHash = null, DateTime? viewedAtUtc = null)
    {
        ProductId = productId;
        VisitorHash = string.IsNullOrWhiteSpace(visitorHash) ? null : visitorHash.Trim();
        ViewedAtUtc = viewedAtUtc ?? DateTime.UtcNow;
    }
}
