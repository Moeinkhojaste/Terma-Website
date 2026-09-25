using Terma.Domain.Entities;

namespace Terma.Application.Store;

public sealed record DashboardDto(int ProductCount, int CategoryCount, int LowStockCount, int PendingOrderCount, int UnreadMessageCount, int CustomerCount, decimal OrderValue);
public sealed record SalesReportDto(DateTime FromUtc, DateTime ToUtc, int OrderCount, decimal GrossSales, decimal CancelledSales, IReadOnlyList<ReportBucketDto> ByStatus);
public sealed record ReportBucketDto(string Status, int Count, decimal Total);
public sealed record AdminOrderDto(Guid Id, string Number, string CustomerName, string Phone, OrderStatus Status, decimal Total, DateTime CreatedAt, DateTime ReservationExpiresAtUtc, string Province, string City, string Address, string PostalCode, string? CustomerNotes, string? PostalTrackingCode, IReadOnlyList<AdminOrderItemDto> Items, string? PaymentStatus = null);
public sealed record AdminOrderItemDto(Guid ProductId, Guid? VariantId, string ProductName, string? VariantTitle, int? TableCapacity, string Sku, decimal UnitPrice, decimal PackagingFee, PackagingType PackagingType, int Quantity);
public sealed record AdminCustomerDto(Guid Id, string FullName, string Phone, string? Email, int OrderCount, decimal TotalOrderValue, DateTime CreatedAt);
public sealed record PromotionDto(Guid Id, string Name, string? Code, PromotionType Type, DiscountType DiscountType, decimal Value, decimal? MinimumSubtotal, decimal? MaximumDiscount, int? UsageLimit, int UsageCount, DateTime StartsAtUtc, DateTime? EndsAtUtc, bool IsActive);
public sealed record ShippingRuleDto(Guid Id, string Name, string? Province, string? City, decimal Cost, decimal? FreeAboveSubtotal, int Priority, bool IsActive);
public sealed record StoreContentDto(Guid Id, string PageKey, string SectionKey, string Title, string Body, string? LinkUrl, string? ImageUrl, string? SeoTitle, string? SeoDescription, bool IsPublished);
public sealed record ContactMessageDto(Guid Id, string Name, string Phone, string? Email, string Topic, string Body, ContactMessageStatus Status, DateTime CreatedAt);
public sealed record PublicPackagingSettingsDto(decimal GiftPackagingPrice, bool IsGiftPackagingEnabled);
public sealed record StoreSettingsDto(int ReservationHours, int LowStockDefaultThreshold, string Currency, decimal GiftPackagingPrice, bool IsGiftPackagingEnabled);
public sealed record UpdatePackagingSettingsRequest(decimal GiftPackagingPrice, bool IsGiftPackagingEnabled);
public sealed record CheckoutItemRequest(Guid ProductId, Guid? VariantId, int Quantity, PackagingType PackagingType = PackagingType.Standard);
public sealed class CheckoutRequest
{
    public IReadOnlyList<CheckoutItemRequest> Items { get; init; } = [];
    public string FullName { get; init; } = string.Empty;
    public string Phone { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string Province { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public string? CustomerNotes { get; init; }
    public string? CouponCode { get; init; }
}
public sealed record CheckoutQuoteDto(decimal Subtotal, decimal PackagingTotal, decimal DiscountTotal, decimal ShippingTotal, decimal Total, IReadOnlyList<CheckoutQuoteItemDto> Items, DateTime ReservedUntilUtc);
public sealed record CheckoutQuoteItemDto(Guid ProductId, Guid? VariantId, string ProductName, string Sku, decimal UnitPrice, decimal PackagingFee, PackagingType PackagingType, int Quantity, int AvailableQuantity);
public sealed record CreatedOrderDto(Guid Id, string Number, decimal Total, DateTime ReservationExpiresAtUtc);
public sealed record ProductVariantDto(Guid Id, Guid ProductId, string Title, string Sku, string Color, int TableCapacity, decimal Length, decimal Width, decimal Price, decimal? CompareAtPrice, int StockQuantity, int ReservedQuantity, int AvailableQuantity, int LowStockThreshold, bool IsActive);
public sealed class ProductVariantWriteRequest { public string Title { get; init; } = string.Empty; public string Sku { get; init; } = string.Empty; public string Color { get; init; } = string.Empty; public int TableCapacity { get; init; } public decimal Length { get; init; } public decimal Width { get; init; } public decimal Price { get; init; } public decimal? CompareAtPrice { get; init; } public int StockQuantity { get; init; } public int LowStockThreshold { get; init; } = 2; public bool IsActive { get; init; } = true; }
public sealed record ProductMediaDto(Guid Id, Guid ProductId, string PublicUrl, string AltText, ProductMediaKind Kind, int SortOrder, bool IsPrimary);
public sealed class ProductMediaWriteRequest { public string PublicUrl { get; init; } = string.Empty; public string AltText { get; init; } = string.Empty; public ProductMediaKind Kind { get; init; } = ProductMediaKind.Other; public int SortOrder { get; init; } public bool IsPrimary { get; init; } }
public sealed class OrderStatusRequest { public OrderStatus Status { get; init; } public string? PostalTrackingCode { get; init; } }
public sealed class PromotionWriteRequest { public string Name { get; init; } = string.Empty; public string? Code { get; init; } public PromotionType Type { get; init; } public DiscountType DiscountType { get; init; } public decimal Value { get; init; } public decimal? MinimumSubtotal { get; init; } public decimal? MaximumDiscount { get; init; } public int? UsageLimit { get; init; } public DateTime StartsAtUtc { get; init; } = DateTime.UtcNow; public DateTime? EndsAtUtc { get; init; } public bool IsActive { get; init; } = true; }
public sealed class ShippingRuleWriteRequest { public string Name { get; init; } = string.Empty; public string? Province { get; init; } public string? City { get; init; } public decimal Cost { get; init; } public decimal? FreeAboveSubtotal { get; init; } public int Priority { get; init; } public bool IsActive { get; init; } = true; }
public sealed class StoreContentWriteRequest { public string PageKey { get; init; } = string.Empty; public string SectionKey { get; init; } = string.Empty; public string Title { get; init; } = string.Empty; public string Body { get; init; } = string.Empty; public string? LinkUrl { get; init; } public string? ImageUrl { get; init; } public string? SeoTitle { get; init; } public string? SeoDescription { get; init; } public bool IsPublished { get; init; } = true; }
public sealed class ContactMessageWriteRequest { public string Name { get; init; } = string.Empty; public string Phone { get; init; } = string.Empty; public string? Email { get; init; } public string Topic { get; init; } = string.Empty; public string Body { get; init; } = string.Empty; }

// --- Advanced Admin Analytics & Intelligence DTOs ---
public sealed record SalesMetricsDto(
    decimal Sales30Days,
    decimal Sales1Year,
    decimal AllTimeValidSales,
    int Orders30Days,
    int Orders1Year,
    int OrdersTotal,
    int ItemsSold30Days,
    int ItemsSold1Year,
    int ItemsSoldTotal,
    decimal AverageItemsPerOrder30Days,
    decimal AverageItemsPerOrder1Year,
    decimal AverageOrderValue30Days,
    decimal AverageOrderValue1Year
);

public sealed record RegistrationMetricsDto(
    int TotalRegisteredCustomers,
    int NewRegistrations30Days,
    int NewRegistrations1Year,
    int GuestCustomers
);

public sealed record AbandonedCartsMetricsDto(
    int AbandonedCount30Days,
    int AbandonedCount1Year,
    decimal AbandonedValue30Days,
    decimal AbandonedValue1Year,
    decimal AbandonmentRate30Days,
    int ExpiredCheckouts30Days,
    decimal ExpiredCheckoutsValue30Days
);

public sealed record DailyMetricPointDto(
    string Date,
    string PersianDate,
    decimal Sales,
    int OrderCount,
    int ItemsSold
);

public sealed record MonthlyMetricPointDto(
    string Month,
    string PersianMonth,
    decimal Sales,
    int OrderCount,
    int ItemsSold
);

public sealed record OrderStatusStatDto(
    string Status,
    string PersianStatus,
    int Count,
    decimal TotalValue
);

public sealed record TopSellingProductDto(
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    string Sku,
    string CategoryName,
    string? ImageUrl,
    int UnitsSold,
    decimal TotalRevenue,
    decimal AveragePrice
);

public sealed record TopViewedProductDto(
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    string Sku,
    string CategoryName,
    string? ImageUrl,
    int ViewCount,
    int OrderCount,
    int UnitsSold,
    decimal ConversionRate
);

public sealed record LoyalCustomerDto(
    Guid CustomerId,
    Guid? UserId,
    string FullName,
    string Phone,
    string? Email,
    int OrderCount,
    decimal TotalOrderValue,
    decimal AverageOrderValue,
    DateTime? LastOrderAtUtc,
    string LoyaltyTier
);

public sealed record AbandonedCartItemDto(
    string ProductName,
    string? VariantName,
    string Sku,
    decimal UnitPrice,
    int Quantity
);

public sealed record AbandonedCartDetailsDto(
    Guid Id,
    string SessionKeyOrOrderNumber,
    string? CustomerName,
    string? Phone,
    string? Email,
    int ItemCount,
    decimal TotalValue,
    DateTime LastActivityAtUtc,
    bool IsExpiredCheckout,
    IReadOnlyList<AbandonedCartItemDto> Items
);

public sealed record AbandonedCartsReportDto(
    int TotalAbandonedCount,
    decimal TotalAbandonedValue,
    decimal AbandonmentRate,
    IReadOnlyList<AbandonedCartDetailsDto> Items
);

public sealed record AdminAnalyticsDto(
    SalesMetricsDto Sales,
    RegistrationMetricsDto Registrations,
    AbandonedCartsMetricsDto AbandonedCarts,
    IReadOnlyList<DailyMetricPointDto> DailyTrend30Days,
    IReadOnlyList<MonthlyMetricPointDto> MonthlyTrend1Year,
    IReadOnlyList<OrderStatusStatDto> OrderStatusBreakdown,
    IReadOnlyList<TopSellingProductDto> TopSellingProducts30Days,
    IReadOnlyList<TopViewedProductDto> TopViewedProducts30Days,
    IReadOnlyList<LoyalCustomerDto> LoyalCustomers
);

public sealed record CartSyncItemRequest(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string Sku,
    decimal UnitPrice,
    int Quantity
);

public sealed class SyncCartSessionRequest
{
    public string SessionKey { get; init; } = string.Empty;
    public string? CustomerName { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public IReadOnlyList<CartSyncItemRequest> Items { get; init; } = [];
}

public interface IStoreOperationsService
{
    Task<DashboardDto> DashboardAsync(CancellationToken cancellationToken);
    Task<AdminAnalyticsDto> AnalyticsAsync(CancellationToken cancellationToken);
    Task<AbandonedCartsReportDto> AbandonedCartsAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyList<LoyalCustomerDto>> LoyalCustomersAsync(int limit, CancellationToken cancellationToken);
    Task<IReadOnlyList<TopSellingProductDto>> TopSellingProductsAsync(int days, int limit, CancellationToken cancellationToken);
    Task<IReadOnlyList<TopViewedProductDto>> TopViewedProductsAsync(int days, int limit, CancellationToken cancellationToken);
    Task SyncCartSessionAsync(SyncCartSessionRequest request, Guid? userId, CancellationToken cancellationToken);
    Task RecordProductViewAsync(Guid productId, string? visitorHash, CancellationToken cancellationToken);

    Task<SalesReportDto> SalesReportAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminOrderDto>> OrdersAsync(OrderStatus? status, CancellationToken cancellationToken);
    Task<AdminOrderDto> ChangeOrderStatusAsync(Guid id, OrderStatus status, string? postalTrackingCode, CancellationToken cancellationToken);
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
    Task<ProductMediaDto> UpdateMediaAsync(Guid id, ProductMediaWriteRequest request, CancellationToken cancellationToken);
    Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken);
    Task<PublicPackagingSettingsDto> GetPublicPackagingSettingsAsync(CancellationToken cancellationToken);
    Task<StoreSettingsDto> GetStoreSettingsAsync(CancellationToken cancellationToken);
    Task<StoreSettingsDto> UpdatePackagingSettingsAsync(UpdatePackagingSettingsRequest request, CancellationToken cancellationToken);
    Task<ValidateCartResponseDto> ValidateCartAsync(ValidateCartRequest request, CancellationToken cancellationToken);
}

public sealed record CartValidationItemRequest(Guid ProductId, Guid? VariantId, int Quantity);
public sealed class ValidateCartRequest
{
    public IReadOnlyList<CartValidationItemRequest> Items { get; init; } = [];
}
public sealed record CartItemValidationResultDto(
    Guid ProductId,
    Guid? VariantId,
    string Status,
    int AvailableQuantity,
    decimal CurrentPrice,
    string? ProductName,
    string? Message
);
public sealed record ValidateCartResponseDto(
    bool HasChanges,
    IReadOnlyList<CartItemValidationResultDto> Items,
    IReadOnlyList<string> Notifications
);
