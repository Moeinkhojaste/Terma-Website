using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Application.Reviews;

namespace Terma.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminAuthorization.Policy)]
[Route("api/admin/reviews")]
public sealed class AdminReviewsController(
    IProductReviewService reviewService,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<AdminProductReviewDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AdminProductReviewDto>>> List(
        [FromQuery] AdminReviewListRequest request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.GetAdminReviewsAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}/approve")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<AdminProductReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminProductReviewDto>> Approve(Guid id, CancellationToken cancellationToken)
    {
        var result = await reviewService.ApproveReviewAsync(id, cancellationToken);
        await auditService.LogAsync(
            GetActor(),
            "ApproveProductReview",
            id.ToString(),
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{id:guid}/reject")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<AdminProductReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminProductReviewDto>> Reject(
        Guid id,
        [FromBody] RejectReviewRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.RejectReviewAsync(id, request?.Reason, cancellationToken);
        await auditService.LogAsync(
            GetActor(),
            "RejectProductReview",
            $"{id} (Reason: {request?.Reason ?? "None"})",
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{id:guid}/reply")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<AdminProductReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminProductReviewDto>> Reply(
        Guid id,
        [FromBody] AdminReplyReviewRequest request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.ReplyReviewAsync(id, request.Response, cancellationToken);
        await auditService.LogAsync(
            GetActor(),
            "ReplyProductReview",
            id.ToString(),
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await reviewService.DeleteReviewAsync(id, cancellationToken);
        await auditService.LogAsync(
            GetActor(),
            "DeleteProductReview",
            id.ToString(),
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            cancellationToken);

        return NoContent();
    }

    private string GetActor() => User.Identity?.Name ?? "admin";

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
