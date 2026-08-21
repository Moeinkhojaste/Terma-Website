using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public sealed class WishlistItem : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = null!;

    private WishlistItem() { }

    public WishlistItem(Guid userId, Guid productId)
    {
        if (userId == Guid.Empty) throw new DomainException("UserId cannot be empty.");
        if (productId == Guid.Empty) throw new DomainException("ProductId cannot be empty.");
        UserId = userId;
        ProductId = productId;
    }
}
