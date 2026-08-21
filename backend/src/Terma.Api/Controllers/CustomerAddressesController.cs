using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Customers;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer/addresses")]
[Authorize(Policy = CustomerAuthorization.Policy)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CustomerAddressesController(
    ICustomerAccountService accounts,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<CustomerAddressDto>> List(CancellationToken cancellationToken) =>
        accounts.GetAddressesAsync(CurrentUserId(), cancellationToken);

    [HttpPost]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerAddressDto>> Create([FromBody] AddressWriteRequest request, CancellationToken cancellationToken)
    {
        var result = await accounts.CreateAddressAsync(CurrentUserId(), request, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "CreateAddress", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerAddressDto>> Update(Guid id, [FromBody] AddressWriteRequest request, CancellationToken cancellationToken)
    {
        var result = await accounts.UpdateAddressAsync(CurrentUserId(), id, request, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "UpdateAddress", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await accounts.DeleteAddressAsync(CurrentUserId(), id, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "DeleteAddress", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/default")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerAddressDto>> SetDefault(Guid id, CancellationToken cancellationToken)
    {
        var result = await accounts.SetDefaultAddressAsync(CurrentUserId(), id, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "SetDefaultAddress", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
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
