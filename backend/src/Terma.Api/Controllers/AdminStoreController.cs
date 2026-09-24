using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Categories;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminAuthorization.Policy)]
[Route("api/admin")]
public sealed class AdminStoreController(
    IStoreOperationsService service,
    IProductService productService,
    ICategoryService categoryService,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("dashboard")]
    public Task<DashboardDto> Dashboard(CancellationToken ct) => service.DashboardAsync(ct);

    [HttpGet("analytics")]
    public Task<AdminAnalyticsDto> Analytics(CancellationToken ct) => service.AnalyticsAsync(ct);

    [HttpGet("abandoned-carts")]
    public Task<AbandonedCartsReportDto> AbandonedCarts([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        service.AbandonedCartsAsync(page, pageSize, ct);

    [HttpGet("loyal-customers")]
    public Task<IReadOnlyList<LoyalCustomerDto>> LoyalCustomers([FromQuery] int limit = 20, CancellationToken ct = default) =>
        service.LoyalCustomersAsync(limit, ct);

    [HttpGet("products/top-selling")]
    public Task<IReadOnlyList<TopSellingProductDto>> TopSellingProducts([FromQuery] int days = 30, [FromQuery] int limit = 10, CancellationToken ct = default) =>
        service.TopSellingProductsAsync(days, limit, ct);

    [HttpGet("products/top-viewed")]
    public Task<IReadOnlyList<TopViewedProductDto>> TopViewedProducts([FromQuery] int days = 30, [FromQuery] int limit = 10, CancellationToken ct = default) =>
        service.TopViewedProductsAsync(days, limit, ct);

    [HttpGet("settings")]
    public Task<StoreSettingsDto> Settings(CancellationToken ct) =>
        service.GetStoreSettingsAsync(ct);

    [HttpPut("settings/packaging")]
    [ValidateApiAntiforgeryToken]
    public async Task<StoreSettingsDto> UpdatePackagingSettings([FromBody] UpdatePackagingSettingsRequest request, CancellationToken ct)
    {
        var result = await service.UpdatePackagingSettingsAsync(request, ct);
        await auditService.LogAsync(GetActor(), "UpdatePackagingSettings", $"Price: {request.GiftPackagingPrice}, Enabled: {request.IsGiftPackagingEnabled}", "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpGet("reports/sales")]
    public Task<SalesReportDto> SalesReport([FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc, CancellationToken ct) =>
        service.SalesReportAsync(fromUtc, toUtc, ct);

    [HttpGet("orders")]
    public Task<IReadOnlyList<AdminOrderDto>> Orders([FromQuery] OrderStatus? status, CancellationToken ct) =>
        service.OrdersAsync(status, ct);

    [HttpPut("orders/{id:guid}/status")]
    [ValidateApiAntiforgeryToken]
    public async Task<AdminOrderDto> ChangeOrderStatus(Guid id, [FromBody] OrderStatusRequest request, CancellationToken ct)
    {
        var result = await service.ChangeOrderStatusAsync(id, request.Status, request.PostalTrackingCode, ct);
        await auditService.LogAsync(GetActor(), "ChangeOrderStatus", $"{id} -> {request.Status} (tracking: {request.PostalTrackingCode ?? "none"})", "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    // Products Management
    [HttpGet("products")]
    public Task<PagedResult<ProductDto>> Products([FromQuery] ProductListRequest request, CancellationToken ct) =>
        productService.ListAdminAsync(request, ct);

    [HttpGet("products/{id:guid}", Name = nameof(GetProduct))]
    public Task<ProductDto> GetProduct(Guid id, CancellationToken ct) =>
        productService.GetAdminByIdAsync(id, ct);

    [HttpPost("products")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<ProductDto>> CreateProduct(CreateProductRequest request, CancellationToken ct)
    {
        var result = await productService.CreateAsync(request, ct);
        await auditService.LogAsync(GetActor(), "CreateProduct", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return CreatedAtAction(nameof(GetProduct), new { id = result.Id }, result);
    }

    [HttpPut("products/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ProductDto> UpdateProduct(Guid id, UpdateProductRequest request, CancellationToken ct)
    {
        var result = await productService.UpdateAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateProduct", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("products/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken ct)
    {
        await productService.DeleteAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteProduct", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Categories Management
    [HttpGet("categories")]
    public Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken ct) =>
        categoryService.ListAdminAsync(ct);

    [HttpGet("categories/{id:guid}", Name = nameof(GetCategory))]
    public Task<CategoryDto> GetCategory(Guid id, CancellationToken ct) =>
        categoryService.GetAdminByIdAsync(id, ct);

    [HttpPost("categories")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CategoryDto>> CreateCategory(CreateCategoryRequest request, CancellationToken ct)
    {
        var result = await categoryService.CreateAsync(request, ct);
        await auditService.LogAsync(GetActor(), "CreateCategory", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return CreatedAtAction(nameof(GetCategory), new { id = result.Id }, result);
    }

    [HttpPut("categories/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<CategoryDto> UpdateCategory(Guid id, UpdateCategoryRequest request, CancellationToken ct)
    {
        var result = await categoryService.UpdateAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateCategory", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("categories/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await categoryService.DeleteAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteCategory", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Product Variants
    [HttpGet("products/{productId:guid}/variants")]
    public Task<IReadOnlyList<ProductVariantDto>> Variants(Guid productId, CancellationToken ct) =>
        service.VariantsAsync(productId, ct);

    [HttpPost("products/{productId:guid}/variants")]
    [ValidateApiAntiforgeryToken]
    public async Task<ProductVariantDto> CreateVariant(Guid productId, ProductVariantWriteRequest request, CancellationToken ct)
    {
        var result = await service.CreateVariantAsync(productId, request, ct);
        await auditService.LogAsync(GetActor(), "CreateVariant", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpPut("variants/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ProductVariantDto> UpdateVariant(Guid id, ProductVariantWriteRequest request, CancellationToken ct)
    {
        var result = await service.UpdateVariantAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateVariant", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("variants/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteVariant(Guid id, CancellationToken ct)
    {
        await service.DeleteVariantAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteVariant", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Media
    [HttpGet("products/{productId:guid}/media")]
    public Task<IReadOnlyList<ProductMediaDto>> Media(Guid productId, CancellationToken ct) =>
        service.MediaAsync(productId, ct);

    [HttpPost("products/{productId:guid}/media")]
    [ValidateApiAntiforgeryToken]
    public async Task<ProductMediaDto> AddMedia(Guid productId, ProductMediaWriteRequest request, CancellationToken ct)
    {
        var result = await service.AddMediaAsync(productId, request, ct);
        await auditService.LogAsync(GetActor(), "AddMedia", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpPut("media/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ProductMediaDto> UpdateMedia(Guid id, ProductMediaWriteRequest request, CancellationToken ct)
    {
        var result = await service.UpdateMediaAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateMedia", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("media/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteMedia(Guid id, CancellationToken ct)
    {
        await service.DeleteMediaAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteMedia", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Customers
    [HttpGet("customers")]
    public Task<IReadOnlyList<AdminCustomerDto>> Customers(CancellationToken ct) =>
        service.CustomersAsync(ct);

    // Promotions
    [HttpGet("promotions")]
    public Task<IReadOnlyList<PromotionDto>> Promotions(CancellationToken ct) =>
        service.PromotionsAsync(ct);

    [HttpPost("promotions")]
    [ValidateApiAntiforgeryToken]
    public async Task<PromotionDto> CreatePromotion(PromotionWriteRequest request, CancellationToken ct)
    {
        var result = await service.CreatePromotionAsync(request, ct);
        await auditService.LogAsync(GetActor(), "CreatePromotion", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpPut("promotions/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<PromotionDto> UpdatePromotion(Guid id, PromotionWriteRequest request, CancellationToken ct)
    {
        var result = await service.UpdatePromotionAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdatePromotion", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("promotions/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeletePromotion(Guid id, CancellationToken ct)
    {
        await service.DeletePromotionAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeletePromotion", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Shipping Rules
    [HttpGet("shipping-rules")]
    public Task<IReadOnlyList<ShippingRuleDto>> ShippingRules(CancellationToken ct) =>
        service.ShippingRulesAsync(ct);

    [HttpPost("shipping-rules")]
    [ValidateApiAntiforgeryToken]
    public async Task<ShippingRuleDto> CreateShippingRule(ShippingRuleWriteRequest request, CancellationToken ct)
    {
        var result = await service.CreateShippingRuleAsync(request, ct);
        await auditService.LogAsync(GetActor(), "CreateShippingRule", result.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpPut("shipping-rules/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<ShippingRuleDto> UpdateShippingRule(Guid id, ShippingRuleWriteRequest request, CancellationToken ct)
    {
        var result = await service.UpdateShippingRuleAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateShippingRule", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("shipping-rules/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteShippingRule(Guid id, CancellationToken ct)
    {
        await service.DeleteShippingRuleAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteShippingRule", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Content
    [HttpGet("content")]
    public Task<IReadOnlyList<StoreContentDto>> Content([FromQuery] string? page, CancellationToken ct) =>
        service.ContentAsync(page, true, ct);

    [HttpPut("content")]
    [ValidateApiAntiforgeryToken]
    public async Task<StoreContentDto> UpsertContent(StoreContentWriteRequest request, CancellationToken ct)
    {
        var result = await service.UpsertContentAsync(request, ct);
        await auditService.LogAsync(GetActor(), "UpsertContent", $"{request.PageKey}:{request.SectionKey}", "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("content/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> DeleteContent(Guid id, CancellationToken ct)
    {
        await service.DeleteContentAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteContent", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    // Messages
    [HttpGet("messages")]
    public Task<IReadOnlyList<ContactMessageDto>> Messages([FromQuery] ContactMessageStatus? status, CancellationToken ct) =>
        service.MessagesAsync(status, ct);

    [HttpPut("messages/{id:guid}/status")]
    [ValidateApiAntiforgeryToken]
    public async Task<ContactMessageDto> ChangeMessageStatus(Guid id, [FromBody] ContactMessageStatusRequest request, CancellationToken ct)
    {
        var result = await service.ChangeMessageStatusAsync(id, request.Status, ct);
        await auditService.LogAsync(GetActor(), "ChangeMessageStatus", $"{id} -> {request.Status}", "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
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

public sealed class ContactMessageStatusRequest { public ContactMessageStatus Status { get; init; } }
