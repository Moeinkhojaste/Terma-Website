using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class ProductReviewTests
{
    [Fact]
    public void Create_ValidReview_InitializesWithPendingStatus()
    {
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var review = new ProductReview(
            productId,
            customerId,
            userId,
            "رضا محمدی",
            5,
            "کیفیت عالی",
            "ترمه بسیار زیبا و با کیفیتی بود، کاملاً راضی هستم.");

        Assert.Equal(productId, review.ProductId);
        Assert.Equal(customerId, review.CustomerId);
        Assert.Equal(userId, review.UserId);
        Assert.Equal("رضا محمدی", review.CustomerName);
        Assert.Equal(5, review.Rating);
        Assert.Equal("کیفیت عالی", review.Title);
        Assert.Equal("ترمه بسیار زیبا و با کیفیتی بود، کاملاً راضی هستم.", review.Comment);
        Assert.Equal(ReviewStatus.Pending, review.Status);
        Assert.Null(review.AdminResponse);
        Assert.Null(review.RejectionReason);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(6)]
    public void Create_InvalidRating_ThrowsDomainException(int rating)
    {
        Assert.Throws<DomainException>(() => new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            rating,
            "عنوان",
            "متن نظر معتبر"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ab")]
    public void Create_InvalidComment_ThrowsDomainException(string comment)
    {
        Assert.Throws<DomainException>(() => new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            4,
            "عنوان",
            comment));
    }

    [Fact]
    public void Approve_ChangesStatusToApproved()
    {
        var review = new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            5,
            "عنوان",
            "متن نظر تستی");

        review.Approve();

        Assert.Equal(ReviewStatus.Approved, review.Status);
        Assert.Null(review.RejectionReason);
    }

    [Fact]
    public void Reject_SetsStatusToRejectedAndRecordsReason()
    {
        var review = new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            1,
            "عنوان",
            "متن نظر نامناسب");

        review.Reject("متن حاوی تبلیغات یا محتوای نامربوط است.");

        Assert.Equal(ReviewStatus.Rejected, review.Status);
        Assert.Equal("متن حاوی تبلیغات یا محتوای نامربوط است.", review.RejectionReason);
    }

    [Fact]
    public void SetAdminResponse_SetsAdminResponse()
    {
        var review = new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            5,
            "عنوان",
            "کیفیت عالی");

        review.SetAdminResponse("با تشکر از نظر ارزشمند شما، رضایت شما افتخار ماست.");

        Assert.Equal("با تشکر از نظر ارزشمند شما، رضایت شما افتخار ماست.", review.AdminResponse);
    }

    [Fact]
    public void Update_ModifiesContentAndResetsToPending()
    {
        var review = new ProductReview(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "کاربر",
            5,
            "عنوان اول",
            "متن نظر اول");

        review.Approve();
        Assert.Equal(ReviewStatus.Approved, review.Status);

        review.Update(4, "عنوان ویرایش شده", "متن ویرایش شده جدید");

        Assert.Equal(4, review.Rating);
        Assert.Equal("عنوان ویرایش شده", review.Title);
        Assert.Equal("متن ویرایش شده جدید", review.Comment);
        Assert.Equal(ReviewStatus.Pending, review.Status);
    }
}
