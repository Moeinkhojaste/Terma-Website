using Terma.Application.Reviews;

namespace Terma.UnitTests.Application;

public sealed class ReviewValidatorsTests
{
    private readonly CreateReviewRequestValidator _createValidator = new();
    private readonly AdminReplyReviewRequestValidator _replyValidator = new();

    [Fact]
    public void CreateReviewRequest_ValidData_PassesValidation()
    {
        var request = new CreateReviewRequest
        {
            ProductId = Guid.NewGuid(),
            Rating = 5,
            Title = "عالی",
            Comment = "بسیار باکیفیت و اصیل"
        };

        var result = _createValidator.Validate(request);
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void CreateReviewRequest_InvalidRating_FailsValidation(int rating)
    {
        var request = new CreateReviewRequest
        {
            ProductId = Guid.NewGuid(),
            Rating = rating,
            Comment = "تست نظر"
        };

        var result = _createValidator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateReviewRequest.Rating));
    }

    [Theory]
    [InlineData("")]
    [InlineData("a")]
    public void CreateReviewRequest_InvalidComment_FailsValidation(string comment)
    {
        var request = new CreateReviewRequest
        {
            ProductId = Guid.NewGuid(),
            Rating = 4,
            Comment = comment
        };

        var result = _createValidator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateReviewRequest.Comment));
    }

    [Fact]
    public void AdminReplyReviewRequest_ValidData_PassesValidation()
    {
        var request = new AdminReplyReviewRequest
        {
            Response = "پاسخ مدیریت فروشگاه"
        };

        var result = _replyValidator.Validate(request);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void AdminReplyReviewRequest_EmptyResponse_FailsValidation()
    {
        var request = new AdminReplyReviewRequest
        {
            Response = ""
        };

        var result = _replyValidator.Validate(request);
        Assert.False(result.IsValid);
    }
}
