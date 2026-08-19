using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public class ProductReview : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = null!;

    public Guid CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;

    public Guid UserId { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public int Rating { get; private set; }
    public string? Title { get; private set; }
    public string Comment { get; private set; } = string.Empty;
    public ReviewStatus Status { get; private set; } = ReviewStatus.Pending;
    public string? AdminResponse { get; private set; }
    public string? RejectionReason { get; private set; }

    private ProductReview() { }

    public ProductReview(
        Guid productId,
        Guid customerId,
        Guid userId,
        string customerName,
        int rating,
        string? title,
        string comment)
    {
        if (productId == Guid.Empty)
            throw new DomainException("Product ID is required.");
        if (customerId == Guid.Empty)
            throw new DomainException("Customer ID is required.");
        if (userId == Guid.Empty)
            throw new DomainException("User ID is required.");

        ProductId = productId;
        CustomerId = customerId;
        UserId = userId;
        CustomerName = string.IsNullOrWhiteSpace(customerName) ? "کاربر ترما" : customerName.Trim();
        Status = ReviewStatus.Pending;

        SetContent(rating, title, comment);
    }

    public void Update(int rating, string? title, string comment)
    {
        SetContent(rating, title, comment);
        Status = ReviewStatus.Pending; // Re-requires approval upon edit
        RejectionReason = null;
        MarkUpdated();
    }

    public void Approve()
    {
        Status = ReviewStatus.Approved;
        RejectionReason = null;
        MarkUpdated();
    }

    public void Reject(string? reason)
    {
        Status = ReviewStatus.Rejected;
        RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        MarkUpdated();
    }

    public void SetAdminResponse(string? response)
    {
        AdminResponse = string.IsNullOrWhiteSpace(response) ? null : response.Trim();
        MarkUpdated();
    }

    private void SetContent(int rating, string? title, string comment)
    {
        if (rating < 1 || rating > 5)
            throw new DomainException("امتیاز باید بین ۱ تا ۵ ستاره باشد.");

        if (string.IsNullOrWhiteSpace(comment) || comment.Trim().Length < 3)
            throw new DomainException("متن نظر باید حداقل شامل ۳ کاراکتر باشد.");

        if (comment.Trim().Length > 1000)
            throw new DomainException("متن نظر نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد.");

        if (!string.IsNullOrWhiteSpace(title) && title.Trim().Length > 150)
            throw new DomainException("عنوان نظر نمی‌تواند بیشتر از ۱۵۰ کاراکتر باشد.");

        Rating = rating;
        Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim();
        Comment = comment.Trim();
    }
}
