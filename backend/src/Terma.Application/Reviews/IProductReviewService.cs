using Terma.Application.Common.Models;
using Terma.Domain.Entities;

namespace Terma.Application.Reviews;

public interface IProductReviewService
{
    Task<ProductReviewsSummaryDto> GetProductReviewsSummaryAsync(
        string productIdentifier,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<CustomerReviewDto> SubmitReviewAsync(
        Guid userId,
        CreateReviewRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CustomerReviewDto>> GetCustomerReviewsAsync(
        Guid userId,
        CancellationToken cancellationToken);

    Task<CustomerReviewDto?> GetCustomerProductReviewAsync(
        Guid userId,
        Guid productId,
        CancellationToken cancellationToken);

    Task<PagedResult<AdminProductReviewDto>> GetAdminReviewsAsync(
        AdminReviewListRequest request,
        CancellationToken cancellationToken);

    Task<AdminProductReviewDto> ApproveReviewAsync(
        Guid reviewId,
        CancellationToken cancellationToken);

    Task<AdminProductReviewDto> RejectReviewAsync(
        Guid reviewId,
        string? reason,
        CancellationToken cancellationToken);

    Task<AdminProductReviewDto> ReplyReviewAsync(
        Guid reviewId,
        string response,
        CancellationToken cancellationToken);

    Task DeleteReviewAsync(
        Guid reviewId,
        CancellationToken cancellationToken);
}
