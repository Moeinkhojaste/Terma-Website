using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Customers;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize(Policy = CustomerAuthorization.Policy)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CustomerProfileController(
    ICustomerAccountService accounts,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("dashboard")]
    public Task<CustomerDashboardDto> Dashboard(CancellationToken cancellationToken) =>
        accounts.GetDashboardAsync(CurrentUserId(), cancellationToken);

    [HttpGet("profile")]
    public Task<CustomerProfileDto> Profile(CancellationToken cancellationToken) =>
        accounts.GetProfileAsync(CurrentUserId(), cancellationToken);

    [HttpPut("profile")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await accounts.UpdateProfileAsync(CurrentUserId(), request, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "UpdateProfile", request.FullName, "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return Ok(result);
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
