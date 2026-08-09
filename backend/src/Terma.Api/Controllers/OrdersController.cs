using Microsoft.AspNetCore.Mvc;
using Terma.Application.Store;
using Microsoft.AspNetCore.RateLimiting;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class OrdersController(IStoreOperationsService service) : ControllerBase
{
    [HttpPost("checkout/quote")]
    [EnableRateLimiting("public-write")]
    public Task<CheckoutQuoteDto> Quote(CheckoutRequest request, CancellationToken ct) => service.QuoteAsync(request, ct);

    [HttpPost("orders")]
    [EnableRateLimiting("public-write")]
    public Task<CreatedOrderDto> Create(CheckoutRequest request, CancellationToken ct) => service.CreateOrderAsync(request, Request.Headers.TryGetValue("Idempotency-Key", out var value) ? value.FirstOrDefault() : null, ct);

    [HttpGet("orders/track/{token}")]
    public Task<AdminOrderDto> Track(string token, CancellationToken ct) => service.TrackOrderAsync(token, ct);
}
