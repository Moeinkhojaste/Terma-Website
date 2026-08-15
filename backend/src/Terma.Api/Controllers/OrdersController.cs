using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Store;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class OrdersController(
    IStoreOperationsService service,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpPost("checkout/quote")]
    [EnableRateLimiting("checkout-quote")]
    [ValidateApiAntiforgeryToken(RequireAuthenticatedOnly = true)]
    public Task<CheckoutQuoteDto> Quote(CheckoutRequest request, CancellationToken ct) =>
        service.QuoteAsync(request, ct);

    [HttpPost("orders")]
    [EnableRateLimiting("order-create")]
    [ValidateApiAntiforgeryToken(RequireAuthenticatedOnly = true)]
    public async Task<CreatedOrderDto> Create(CheckoutRequest request, CancellationToken ct)
    {
        var authentication = await HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        Guid? userId = null;
        string? verifiedPhone = null;
        if (authentication.Succeeded && authentication.Principal is not null)
        {
            if (Guid.TryParse(authentication.Principal.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed))
                userId = parsed;
            verifiedPhone = authentication.Principal.FindFirstValue(ClaimTypes.MobilePhone);
        }

        var idempotencyKey = Request.Headers.TryGetValue("Idempotency-Key", out var value)
            ? value.FirstOrDefault()
            : null;

        var order = await service.CreateOrderAsync(request, idempotencyKey, userId, verifiedPhone, ct);

        var actor = verifiedPhone ?? request.Phone;
        await auditService.LogAsync(actor, "OrderCreate", order.Number, "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);

        return order;
    }

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
