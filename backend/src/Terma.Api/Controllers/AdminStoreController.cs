using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminAuthorization.Policy)]
[Route("api/admin")]
public sealed class AdminStoreController(IStoreOperationsService service, IConfiguration configuration) : ControllerBase
{
    [HttpGet("dashboard")]
    public Task<DashboardDto> Dashboard(CancellationToken ct) => service.DashboardAsync(ct);

    [HttpGet("settings")]
    public object Settings() => new
    {
        reservationHours = configuration.GetValue("Store:ReservationHours", 24),
        lowStockDefaultThreshold = configuration.GetValue("Store:LowStockDefaultThreshold", 2),
        currency = "تومان"
    };

    [HttpGet("reports/sales")]
    public Task<SalesReportDto> SalesReport([FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc, CancellationToken ct) => service.SalesReportAsync(fromUtc, toUtc, ct);

    [HttpGet("orders")]
    public Task<IReadOnlyList<AdminOrderDto>> Orders([FromQuery] OrderStatus? status, CancellationToken ct) => service.OrdersAsync(status, ct);

    [HttpGet("products/{productId:guid}/variants")]
    public Task<IReadOnlyList<ProductVariantDto>> Variants(Guid productId, CancellationToken ct) => service.VariantsAsync(productId, ct);

    [HttpPost("products/{productId:guid}/variants")]
    [ValidateApiAntiforgeryToken]
    public Task<ProductVariantDto> CreateVariant(Guid productId, ProductVariantWriteRequest request, CancellationToken ct) => service.CreateVariantAsync(productId, request, ct);

    [HttpPut("variants/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public Task<ProductVariantDto> UpdateVariant(Guid id, ProductVariantWriteRequest request, CancellationToken ct) => service.UpdateVariantAsync(id, request, ct);

    [HttpDelete("variants/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteVariant(Guid id, CancellationToken ct) { await service.DeleteVariantAsync(id, ct); return NoContent(); }

    [HttpGet("products/{productId:guid}/media")]
    public Task<IReadOnlyList<ProductMediaDto>> Media(Guid productId, CancellationToken ct) => service.MediaAsync(productId, ct);

    [HttpPost("products/{productId:guid}/media")]
    [ValidateApiAntiforgeryToken]
    public Task<ProductMediaDto> AddMedia(Guid productId, ProductMediaWriteRequest request, CancellationToken ct) => service.AddMediaAsync(productId, request, ct);

    [HttpPut("media/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public Task<ProductMediaDto> UpdateMedia(Guid id, ProductMediaWriteRequest request, CancellationToken ct) => service.UpdateMediaAsync(id, request, ct);

    [HttpDelete("media/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteMedia(Guid id, CancellationToken ct) { await service.DeleteMediaAsync(id, ct); return NoContent(); }

    [HttpPut("orders/{id:guid}/status")]
    [ValidateApiAntiforgeryToken]
    public Task<AdminOrderDto> ChangeOrderStatus(Guid id, [FromBody] OrderStatusRequest request, CancellationToken ct) => service.ChangeOrderStatusAsync(id, request.Status, ct);

    [HttpGet("customers")]
    public Task<IReadOnlyList<AdminCustomerDto>> Customers(CancellationToken ct) => service.CustomersAsync(ct);

    [HttpGet("promotions")]
    public Task<IReadOnlyList<PromotionDto>> Promotions(CancellationToken ct) => service.PromotionsAsync(ct);

    [HttpPost("promotions")]
    [ValidateApiAntiforgeryToken]
    public Task<PromotionDto> CreatePromotion(PromotionWriteRequest request, CancellationToken ct) => service.CreatePromotionAsync(request, ct);

    [HttpPut("promotions/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public Task<PromotionDto> UpdatePromotion(Guid id, PromotionWriteRequest request, CancellationToken ct) => service.UpdatePromotionAsync(id, request, ct);

    [HttpDelete("promotions/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeletePromotion(Guid id, CancellationToken ct) { await service.DeletePromotionAsync(id, ct); return NoContent(); }

    [HttpGet("shipping-rules")]
    public Task<IReadOnlyList<ShippingRuleDto>> ShippingRules(CancellationToken ct) => service.ShippingRulesAsync(ct);

    [HttpPost("shipping-rules")]
    [ValidateApiAntiforgeryToken]
    public Task<ShippingRuleDto> CreateShippingRule(ShippingRuleWriteRequest request, CancellationToken ct) => service.CreateShippingRuleAsync(request, ct);

    [HttpPut("shipping-rules/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public Task<ShippingRuleDto> UpdateShippingRule(Guid id, ShippingRuleWriteRequest request, CancellationToken ct) => service.UpdateShippingRuleAsync(id, request, ct);

    [HttpDelete("shipping-rules/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteShippingRule(Guid id, CancellationToken ct) { await service.DeleteShippingRuleAsync(id, ct); return NoContent(); }

    [HttpGet("content")]
    public Task<IReadOnlyList<StoreContentDto>> Content([FromQuery] string? page, CancellationToken ct) => service.ContentAsync(page, true, ct);

    [HttpPut("content")]
    [ValidateApiAntiforgeryToken]
    public Task<StoreContentDto> UpsertContent(StoreContentWriteRequest request, CancellationToken ct) => service.UpsertContentAsync(request, ct);

    [HttpDelete("content/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteContent(Guid id, CancellationToken ct) { await service.DeleteContentAsync(id, ct); return NoContent(); }

    [HttpGet("messages")]
    public Task<IReadOnlyList<ContactMessageDto>> Messages([FromQuery] ContactMessageStatus? status, CancellationToken ct) => service.MessagesAsync(status, ct);

    [HttpPut("messages/{id:guid}/status")]
    [ValidateApiAntiforgeryToken]
    public Task<ContactMessageDto> ChangeMessageStatus(Guid id, [FromBody] ContactMessageStatusRequest request, CancellationToken ct) => service.ChangeMessageStatusAsync(id, request.Status, ct);
}

public sealed class ContactMessageStatusRequest { public ContactMessageStatus Status { get; init; } }
