using Terma.Application.Common.Models;
using Terma.Domain.Entities;

namespace Terma.Application.Reviews;

public sealed record ProductReviewDto(
    Guid Id,
    Guid ProductId,
    string CustomerName,
    int Rating,
    string? Title,
    string Comment,
    string? AdminResponse,
    DateTime CreatedAt);

public sealed record RatingDistributionDto(
    int OneStar,
    int TwoStars,
    int ThreeStars,
    int FourStars,
    int FiveStars);

public sealed record ProductReviewsSummaryDto(
    double AverageRating,
    int TotalReviewsCount,
    RatingDistributionDto Distribution,
    PagedResult<ProductReviewDto> Reviews);

public sealed record CustomerReviewDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    string? ProductImage,
    int Rating,
    string? Title,
    string Comment,
    ReviewStatus Status,
    string? AdminResponse,
    string? RejectionReason,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record AdminProductReviewDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    Guid CustomerId,
    string CustomerName,
    string CustomerPhone,
    int Rating,
    string? Title,
    string Comment,
    ReviewStatus Status,
    string? AdminResponse,
    string? RejectionReason,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed class CreateReviewRequest
{
    public Guid ProductId { get; init; }
    public int Rating { get; init; }
    public string? Title { get; init; }
    public string Comment { get; init; } = string.Empty;
}

public sealed class AdminReplyReviewRequest
{
    public string Response { get; init; } = string.Empty;
}

public sealed class RejectReviewRequest
{
    public string? Reason { get; init; }
}

public sealed class AdminReviewListRequest
{
    public ReviewStatus? Status { get; init; }
    public Guid? ProductId { get; init; }
    public string? Search { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
