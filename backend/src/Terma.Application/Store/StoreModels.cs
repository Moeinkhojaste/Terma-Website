using Terma.Domain.Entities;

namespace Terma.Application.Store;

public sealed record DashboardDto(int ProductCount, int CategoryCount, int LowStockCount, int PendingOrderCount, int UnreadMessageCount, int CustomerCount, decimal OrderValue);
public sealed record SalesReportDto(DateTime FromUtc, DateTime ToUtc, int OrderCount, decimal GrossSales, decimal CancelledSales, IReadOnlyList<ReportBucketDto> ByStatus);
public sealed record ReportBucketDto(string Status, int Count, decimal Total);
public sealed record AdminOrderDto(Guid Id, string Number, string CustomerName, string Phone, OrderStatus Status, decimal Total, DateTime CreatedAt, DateTime ReservationExpiresAtUtc, string Province, string City, string Address, string PostalCode, string? CustomerNotes, IReadOnlyList<AdminOrderItemDto> Items);
public sealed record AdminOrderItemDto(Guid ProductId, Guid? VariantId, string ProductName, string? VariantTitle, int? TableCapacity, string Sku, decimal UnitPrice, int Quantity);
public sealed record AdminCustomerDto(Guid Id, string FullName, string Phone, string? Email, int OrderCount, decimal TotalOrderValue, DateTime CreatedAt);
public sealed record PromotionDto(Guid Id, string Name, string? Code, PromotionType Type, DiscountType DiscountType, decimal Value, decimal? MinimumSubtotal, decimal? MaximumDiscount, int? UsageLimit, int UsageCount, DateTime StartsAtUtc, DateTime? EndsAtUtc, bool IsActive);
public sealed record ShippingRuleDto(Guid Id, string Name, string? Province, string? City, decimal Cost, decimal? FreeAboveSubtotal, int Priority, bool IsActive);
public sealed record StoreContentDto(Guid Id, string PageKey, string SectionKey, string Title, string Body, string? LinkUrl, string? ImageUrl, string? SeoTitle, string? SeoDescription, bool IsPublished);
public sealed record ContactMessageDto(Guid Id, string Name, string Phone, string? Email, string Topic, string Body, ContactMessageStatus Status, DateTime CreatedAt);
public sealed record CheckoutItemRequest(Guid ProductId, Guid? VariantId, int Quantity);
public sealed class CheckoutRequest
{
    public IReadOnlyList<CheckoutItemRequest> Items { get; init; } = [];
    public string FullName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public string? CustomerNotes { get; init; }
    public string? CouponCode { get; init; }
}
public sealed record CheckoutQuoteDto(decimal Subtotal, decimal DiscountTotal, decimal ShippingTotal, decimal Total, IReadOnlyList<CheckoutQuoteItemDto> Items, DateTime ReservedUntilUtc);
public sealed record CheckoutQuoteItemDto(Guid ProductId, Guid? VariantId, string ProductName, string Sku, decimal UnitPrice, int Quantity, int AvailableQuantity);
public sealed record CreatedOrderDto(Guid Id, string Number, string TrackingToken, decimal Total, DateTime ReservationExpiresAtUtc);
public sealed record ProductVariantDto(Guid Id, Guid ProductId, string Title, string Sku, string Color, int TableCapacity, decimal Length, decimal Width, decimal Price, decimal? CompareAtPrice, int StockQuantity, int ReservedQuantity, int AvailableQuantity, int LowStockThreshold, bool IsActive);
public sealed class ProductVariantWriteRequest { public string Title { get; init; } = string.Empty; public string Sku { get; init; } = string.Empty; public string Color { get; init; } = string.Empty; public int TableCapacity { get; init; } public decimal Length { get; init; } public decimal Width { get; init; } public decimal Price { get; init; } public decimal? CompareAtPrice { get; init; } public int StockQuantity { get; init; } public int LowStockThreshold { get; init; } = 2; public bool IsActive { get; init; } = true; }
public sealed record ProductMediaDto(Guid Id, Guid ProductId, string PublicUrl, string AltText, int SortOrder, bool IsPrimary);
public sealed class ProductMediaWriteRequest { public string PublicUrl { get; init; } = string.Empty; public string AltText { get; init; } = string.Empty; public int SortOrder { get; init; } public bool IsPrimary { get; init; } }
public sealed class OrderStatusRequest { public OrderStatus Status { get; init; } }
public sealed class PromotionWriteRequest { public string Name { get; init; } = string.Empty; public string? Code { get; init; } public PromotionType Type { get; init; } public DiscountType DiscountType { get; init; } public decimal Value { get; init; } public decimal? MinimumSubtotal { get; init; } public decimal? MaximumDiscount { get; init; } public int? UsageLimit { get; init; } public DateTime StartsAtUtc { get; init; } = DateTime.UtcNow; public DateTime? EndsAtUtc { get; init; } public bool IsActive { get; init; } = true; }
public sealed class ShippingRuleWriteRequest { public string Name { get; init; } = string.Empty; public string? Province { get; init; } public string? City { get; init; } public decimal Cost { get; init; } public decimal? FreeAboveSubtotal { get; init; } public int Priority { get; init; } public bool IsActive { get; init; } = true; }
public sealed class StoreContentWriteRequest { public string PageKey { get; init; } = string.Empty; public string SectionKey { get; init; } = string.Empty; public string Title { get; init; } = string.Empty; public string Body { get; init; } = string.Empty; public string? LinkUrl { get; init; } public string? ImageUrl { get; init; } public string? SeoTitle { get; init; } public string? SeoDescription { get; init; } public bool IsPublished { get; init; } = true; }
public sealed class ContactMessageWriteRequest { public string Name { get; init; } = string.Empty; public string Phone { get; init; } = string.Empty; public string? Email { get; init; } public string Topic { get; init; } = string.Empty; public string Body { get; init; } = string.Empty; }

public interface IStoreOperationsService
{
    Task<DashboardDto> DashboardAsync(CancellationToken cancellationToken);
    Task<SalesReportDto> SalesReportAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminOrderDto>> OrdersAsync(OrderStatus? status, CancellationToken cancellationToken);
    Task<AdminOrderDto> ChangeOrderStatusAsync(Guid id, OrderStatus status, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminCustomerDto>> CustomersAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<PromotionDto>> PromotionsAsync(CancellationToken cancellationToken);
    Task<PromotionDto> CreatePromotionAsync(PromotionWriteRequest request, CancellationToken cancellationToken);
    Task<PromotionDto> UpdatePromotionAsync(Guid id, PromotionWriteRequest request, CancellationToken cancellationToken);
    Task DeletePromotionAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ShippingRuleDto>> ShippingRulesAsync(CancellationToken cancellationToken);
    Task<ShippingRuleDto> CreateShippingRuleAsync(ShippingRuleWriteRequest request, CancellationToken cancellationToken);
    Task<ShippingRuleDto> UpdateShippingRuleAsync(Guid id, ShippingRuleWriteRequest request, CancellationToken cancellationToken);
    Task DeleteShippingRuleAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<StoreContentDto>> ContentAsync(string? pageKey, bool includeUnpublished, CancellationToken cancellationToken);
    Task<StoreContentDto> UpsertContentAsync(StoreContentWriteRequest request, CancellationToken cancellationToken);
    Task DeleteContentAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ContactMessageDto>> MessagesAsync(ContactMessageStatus? status, CancellationToken cancellationToken);
    Task<ContactMessageDto> ChangeMessageStatusAsync(Guid id, ContactMessageStatus status, CancellationToken cancellationToken);
    Task<ContactMessageDto> CreateMessageAsync(ContactMessageWriteRequest request, CancellationToken cancellationToken);
    Task<CheckoutQuoteDto> QuoteAsync(CheckoutRequest request, CancellationToken cancellationToken);
    Task<CreatedOrderDto> CreateOrderAsync(CheckoutRequest request, string? idempotencyKey, Guid? userId, string? verifiedPhone, CancellationToken cancellationToken);
    Task<AdminOrderDto> TrackOrderAsync(string token, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductVariantDto>> VariantsAsync(Guid productId, CancellationToken cancellationToken);
    Task<ProductVariantDto> CreateVariantAsync(Guid productId, ProductVariantWriteRequest request, CancellationToken cancellationToken);
    Task<ProductVariantDto> UpdateVariantAsync(Guid id, ProductVariantWriteRequest request, CancellationToken cancellationToken);
    Task DeleteVariantAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductMediaDto>> MediaAsync(Guid productId, CancellationToken cancellationToken);
    Task<ProductMediaDto> AddMediaAsync(Guid productId, ProductMediaWriteRequest request, CancellationToken cancellationToken);
    Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken);
}
