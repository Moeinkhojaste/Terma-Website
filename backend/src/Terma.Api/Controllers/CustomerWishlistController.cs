using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Customers;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer/wishlist")]
[Authorize(Policy = CustomerAuthorization.Policy)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CustomerWishlistController(
    ICustomerAccountService accounts,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<WishlistItemDto>> List(CancellationToken cancellationToken) =>
        accounts.GetWishlistAsync(CurrentUserId(), cancellationToken);

    [HttpGet("ids")]
    public Task<IReadOnlyList<Guid>> ListIds(CancellationToken cancellationToken) =>
        accounts.GetWishlistProductIdsAsync(CurrentUserId(), cancellationToken);

    [HttpPost("{productId:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<object>> Toggle(Guid productId, CancellationToken cancellationToken)
    {
        var added = await accounts.ToggleWishlistAsync(CurrentUserId(), productId, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "ToggleWishlist", $"{productId} -> {(added ? "Added" : "Removed")}", "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return Ok(new { added });
    }

    [HttpDelete("{productId:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Remove(Guid productId, CancellationToken cancellationToken)
    {
        await accounts.RemoveFromWishlistAsync(CurrentUserId(), productId, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "RemoveFromWishlist", productId.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return NoContent();
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
