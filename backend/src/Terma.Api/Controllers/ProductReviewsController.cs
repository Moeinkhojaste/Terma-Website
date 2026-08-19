using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Reviews;

namespace Terma.Api.Controllers;

[ApiController]
public sealed class ProductReviewsController(
    IProductReviewService reviewService,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("api/products/{identifier}/reviews")]
    [ProducesResponseType<ProductReviewsSummaryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductReviewsSummaryDto>> GetProductReviews(
        string identifier,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var summary = await reviewService.GetProductReviewsSummaryAsync(identifier, page, pageSize, cancellationToken);
        return Ok(summary);
    }

    [HttpPost("api/customer/reviews")]
    [Authorize(Policy = CustomerAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<CustomerReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerReviewDto>> SubmitReview(
        [FromBody] CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.SubmitReviewAsync(CurrentUserId(), request, cancellationToken);
        await auditService.LogAsync(
            CurrentUserId().ToString(),
            "SubmitProductReview",
            $"Product {request.ProductId} -> Rating {request.Rating}",
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("api/customer/reviews")]
    [Authorize(Policy = CustomerAuthorization.Policy)]
    [ProducesResponseType<IReadOnlyList<CustomerReviewDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CustomerReviewDto>>> GetMyReviews(CancellationToken cancellationToken)
    {
        var reviews = await reviewService.GetCustomerReviewsAsync(CurrentUserId(), cancellationToken);
        return Ok(reviews);
    }

    [HttpGet("api/customer/reviews/products/{productId:guid}/my-review")]
    [Authorize(Policy = CustomerAuthorization.Policy)]
    [ProducesResponseType<CustomerReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult<CustomerReviewDto>> GetMyReviewForProduct(
        Guid productId,
        CancellationToken cancellationToken)
    {
        var review = await reviewService.GetCustomerProductReviewAsync(CurrentUserId(), productId, cancellationToken);
        if (review == null) return NoContent();
        return Ok(review);
    }

    private Guid CurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
