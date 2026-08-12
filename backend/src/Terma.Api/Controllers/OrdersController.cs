using Microsoft.AspNetCore.Mvc;
using Terma.Application.Store;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class OrdersController(IStoreOperationsService service) : ControllerBase
{
    [HttpPost("checkout/quote")]
    [EnableRateLimiting("public-write")]
    [ValidateApiAntiforgeryToken]
    public Task<CheckoutQuoteDto> Quote(CheckoutRequest request, CancellationToken ct) => service.QuoteAsync(request, ct);

    [HttpPost("orders")]
    [EnableRateLimiting("public-write")]
    [ValidateApiAntiforgeryToken]
    public async Task<CreatedOrderDto> Create(CheckoutRequest request, CancellationToken ct)
    {
        var authentication = await HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        Guid? userId = null;
        string? verifiedPhone = null;
        if (authentication.Succeeded && authentication.Principal is not null)
        {
            if (Guid.TryParse(authentication.Principal.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed)) userId = parsed;
            verifiedPhone = authentication.Principal.FindFirstValue(ClaimTypes.MobilePhone);
        }
        return await service.CreateOrderAsync(request, Request.Headers.TryGetValue("Idempotency-Key", out var value) ? value.FirstOrDefault() : null, userId, verifiedPhone, ct);
    }

    [HttpGet("orders/track/{token}")]
    public Task<AdminOrderDto> Track(string token, CancellationToken ct) => service.TrackOrderAsync(token, ct);
}
