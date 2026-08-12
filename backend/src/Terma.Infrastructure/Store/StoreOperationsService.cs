using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Terma.Application.Common.Exceptions;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;
using Terma.Domain.Services;

namespace Terma.Infrastructure.Store;

public sealed class StoreOperationsService(TermaDbContext db) : IStoreOperationsService
{
    public async Task<DashboardDto> DashboardAsync(CancellationToken cancellationToken)
    {
        var productCount = await db.Products.CountAsync(x => x.IsActive, cancellationToken);
        var categoryCount = await db.Categories.CountAsync(x => x.IsActive, cancellationToken);
        var lowStock = await db.ProductVariants.CountAsync(x => x.IsActive && x.StockQuantity - x.ReservedQuantity <= x.LowStockThreshold, cancellationToken);
        var pending = await db.Orders.CountAsync(x => x.Status == OrderStatus.PendingConfirmation, cancellationToken);
        var unread = await db.ContactMessages.CountAsync(x => x.Status == ContactMessageStatus.New, cancellationToken);
        var customers = await db.Customers.CountAsync(cancellationToken);
        var orderValues = await db.Orders.Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired).Select(x => x.Total).ToListAsync(cancellationToken);
        var orderValue = orderValues.Sum();
        return new(productCount, categoryCount, lowStock, pending, unread, customers, orderValue);
    }

    public async Task<SalesReportDto> SalesReportAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken cancellationToken)
    {
        var from = fromUtc ?? DateTime.UtcNow.Date.AddDays(-30);
        var to = toUtc ?? DateTime.UtcNow;
        var orders = await db.Orders.AsNoTracking().Where(x => x.CreatedAt >= from && x.CreatedAt <= to).ToListAsync(cancellationToken);
        var buckets = orders.GroupBy(x => x.Status).OrderBy(x => x.Key).Select(x => new ReportBucketDto(x.Key.ToString(), x.Count(), x.Sum(o => o.Total))).ToList();
        return new(from, to, orders.Count, orders.Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired).Sum(x => x.Total), orders.Where(x => x.Status == OrderStatus.Cancelled).Sum(x => x.Total), buckets);
    }

    public async Task<IReadOnlyList<AdminOrderDto>> OrdersAsync(OrderStatus? status, CancellationToken cancellationToken)
    {
        var query = db.Orders.AsNoTracking().Include(x => x.Items).OrderByDescending(x => x.CreatedAt).AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value).OrderByDescending(x => x.CreatedAt);
        var orders = await query.ToListAsync(cancellationToken);
        return await MapOrdersAsync(orders, cancellationToken);
    }

    public async Task<AdminOrderDto> ChangeOrderStatusAsync(Guid id, OrderStatus status, CancellationToken cancellationToken)
    {
        var order = await db.Orders.Include(x => x.Items).Include(x => x.History).SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Order '{id}' was not found.");
        if (order.Status != status)
        {
            var isPreviousCancelledOrExpired = order.Status is OrderStatus.Cancelled or OrderStatus.Expired;
            var isNextCancelledOrExpired = status is OrderStatus.Cancelled or OrderStatus.Expired;

            foreach (var item in order.Items.Where(x => x.VariantId.HasValue))
            {
                var variant = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == item.VariantId, cancellationToken);
                if (variant is null) continue;
                var product = await db.Products.SingleOrDefaultAsync(x => x.Id == item.ProductId, cancellationToken);

                if (order.Status == OrderStatus.PendingConfirmation && !isNextCancelledOrExpired)
                {
                    if (variant.ReservedQuantity >= item.Quantity)
                    {
                        variant.CommitReservation(item.Quantity);
                    }
                }
                else if (order.Status == OrderStatus.PendingConfirmation && isNextCancelledOrExpired)
                {
                    if (variant.ReservedQuantity >= item.Quantity)
                    {
                        variant.ReleaseReservation(item.Quantity);
                    }
                    product?.AdjustStock(item.Quantity);
                }
                else if (!isPreviousCancelledOrExpired && isNextCancelledOrExpired)
                {
                    variant.AdjustStock(item.Quantity);
                    product?.AdjustStock(item.Quantity);
                }
                else if (isPreviousCancelledOrExpired && !isNextCancelledOrExpired)
                {
                    variant.AdjustStock(-item.Quantity);
                    product?.AdjustStock(-item.Quantity);
                }
            }
            order.ChangeStatus(status);
            await db.SaveChangesAsync(cancellationToken);
        }
        var mapped = await MapOrdersAsync([order], cancellationToken);
        return mapped.Single();
    }

    public async Task<IReadOnlyList<AdminCustomerDto>> CustomersAsync(CancellationToken cancellationToken) =>
        await db.Customers.AsNoTracking().OrderByDescending(x => x.CreatedAt).Select(x => new AdminCustomerDto(x.Id, x.FullName, x.Phone, x.Email, x.OrderCount, x.TotalOrderValue, x.CreatedAt)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PromotionDto>> PromotionsAsync(CancellationToken cancellationToken) =>
        (await db.Promotions.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<PromotionDto> CreatePromotionAsync(PromotionWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = new Promotion(request.Name, request.Code, request.Type, request.DiscountType, request.Value, request.MinimumSubtotal, request.MaximumDiscount, request.UsageLimit, request.StartsAtUtc, request.EndsAtUtc);
        if (!request.IsActive) entity.SetActive(false);
        await db.Promotions.AddAsync(entity, cancellationToken); await db.SaveChangesAsync(cancellationToken); return Map(entity);
    }

    public async Task<PromotionDto> UpdatePromotionAsync(Guid id, PromotionWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Promotions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Promotion '{id}' was not found.");
        entity.SetActive(request.IsActive);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeletePromotionAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Promotions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Promotion '{id}' was not found.");
        entity.SetActive(false); await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ShippingRuleDto>> ShippingRulesAsync(CancellationToken cancellationToken) =>
        (await db.ShippingRules.AsNoTracking().OrderBy(x => x.Priority).ThenBy(x => x.Name).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<ShippingRuleDto> CreateShippingRuleAsync(ShippingRuleWriteRequest request, CancellationToken cancellationToken)
    { var entity = new ShippingRule(request.Name, request.Province, request.City, request.Cost, request.FreeAboveSubtotal, request.Priority); if (!request.IsActive) entity.SetActive(false); await db.ShippingRules.AddAsync(entity, cancellationToken); await db.SaveChangesAsync(cancellationToken); return Map(entity); }

    public async Task<ShippingRuleDto> UpdateShippingRuleAsync(Guid id, ShippingRuleWriteRequest request, CancellationToken cancellationToken)
    { var entity = await db.ShippingRules.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Shipping rule '{id}' was not found."); entity.SetActive(request.IsActive); await db.SaveChangesAsync(cancellationToken); return Map(entity); }

    public async Task DeleteShippingRuleAsync(Guid id, CancellationToken cancellationToken)
    { var entity = await db.ShippingRules.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Shipping rule '{id}' was not found."); entity.SetActive(false); await db.SaveChangesAsync(cancellationToken); }

    public async Task<IReadOnlyList<StoreContentDto>> ContentAsync(string? pageKey, bool includeUnpublished, CancellationToken cancellationToken)
    { var query = db.StoreContents.AsNoTracking().Where(x => includeUnpublished || x.IsPublished).OrderBy(x => x.PageKey).ThenBy(x => x.SectionKey); if (!string.IsNullOrWhiteSpace(pageKey)) query = query.Where(x => x.PageKey == pageKey).OrderBy(x => x.SectionKey); return (await query.ToListAsync(cancellationToken)).Select(Map).ToList(); }

    public async Task<StoreContentDto> UpsertContentAsync(StoreContentWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.StoreContents.SingleOrDefaultAsync(x => x.PageKey == request.PageKey && x.SectionKey == request.SectionKey, cancellationToken);
        if (entity is null) { entity = new StoreContent(request.PageKey, request.SectionKey, request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription); if (!request.IsPublished) entity.Update(request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription, false); await db.StoreContents.AddAsync(entity, cancellationToken); }
        else entity.Update(request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription, request.IsPublished);
        await db.SaveChangesAsync(cancellationToken); return Map(entity);
    }

    public async Task DeleteContentAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.StoreContents.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Content '{id}' was not found.");
        db.StoreContents.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContactMessageDto>> MessagesAsync(ContactMessageStatus? status, CancellationToken cancellationToken)
    { var query = db.ContactMessages.AsNoTracking().OrderByDescending(x => x.CreatedAt).AsQueryable(); if (status.HasValue) query = query.Where(x => x.Status == status.Value).OrderByDescending(x => x.CreatedAt); return (await query.ToListAsync(cancellationToken)).Select(MapMessage).ToList(); }

    public async Task<ContactMessageDto> ChangeMessageStatusAsync(Guid id, ContactMessageStatus status, CancellationToken cancellationToken)
    { var entity = await db.ContactMessages.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Message '{id}' was not found."); entity.ChangeStatus(status); await db.SaveChangesAsync(cancellationToken); return new(entity.Id, entity.Name, entity.Phone, entity.Email, entity.Topic, entity.Body, entity.Status, entity.CreatedAt); }

    public async Task<ContactMessageDto> CreateMessageAsync(ContactMessageWriteRequest request, CancellationToken cancellationToken)
    { var entity = new ContactMessage(request.Name, request.Phone, request.Email, request.Topic, request.Body); await db.ContactMessages.AddAsync(entity, cancellationToken); await db.SaveChangesAsync(cancellationToken); return new(entity.Id, entity.Name, entity.Phone, entity.Email, entity.Topic, entity.Body, entity.Status, entity.CreatedAt); }

    public async Task<CheckoutQuoteDto> QuoteAsync(CheckoutRequest request, CancellationToken cancellationToken)
    {
        var lines = await ResolveLines(request.Items, cancellationToken);
        var subtotal = lines.Sum(x => x.UnitPrice * x.Quantity);
        var promotion = await db.Promotions.AsNoTracking().Where(x => x.IsActive).ToListAsync(cancellationToken);
        var discount = promotion.Where(x => x.Applies(request.CouponCode, subtotal, DateTime.UtcNow)).Select(x => x.Calculate(subtotal)).DefaultIfEmpty(0).Max();
        var rules = await db.ShippingRules.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Priority).ToListAsync(cancellationToken);
        var rule = rules.FirstOrDefault(x => x.Matches(request.Province, request.City));
        var shipping = rule?.Calculate(subtotal) ?? 0;
        return new(subtotal, discount, shipping, subtotal - discount + shipping, lines.Select(x => new CheckoutQuoteItemDto(x.ProductId, x.VariantId, x.ProductName, x.Sku, x.UnitPrice, x.Quantity, x.AvailableQuantity)).ToList(), DateTime.UtcNow.AddHours(24));
    }

    public async Task<CreatedOrderDto> CreateOrderAsync(CheckoutRequest request, string? idempotencyKey, Guid? userId, string? verifiedPhone, CancellationToken cancellationToken)
    {
        ValidateCheckoutDetails(request);
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var previous = await db.Orders.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (previous is not null) return new(previous.Id, previous.Number, string.Empty, previous.Total, previous.ReservationExpiresAtUtc);
        }
        var quote = await QuoteAsync(request, cancellationToken);
        var lines = await ResolveLines(request.Items, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        foreach (var line in lines)
        {
            line.Variant.Reserve(line.Quantity);
            var product = await db.Products.SingleOrDefaultAsync(x => x.Id == line.ProductId, cancellationToken);
            product?.AdjustStock(-line.Quantity);
        }
        var normalized = IranianPhoneNumber.Normalize(request.Phone);
        if (userId.HasValue && (string.IsNullOrWhiteSpace(verifiedPhone) || IranianPhoneNumber.Normalize(verifiedPhone) != normalized))
            throw new ConflictException("The checkout mobile number must match the verified account mobile number.");
        var customer = await db.Customers.SingleOrDefaultAsync(x => x.NormalizedPhone == normalized, cancellationToken);
        if (customer is null) { customer = new Customer(request.FullName, request.Phone, null); await db.Customers.AddAsync(customer, cancellationToken); }
        else customer.RefreshProfile(request.FullName, request.Phone, null);
        if (userId.HasValue) customer.AttachToUser(userId.Value);
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var order = new Order($"TRM-{DateTime.UtcNow:yyyyMMdd}-{RandomNumberGenerator.GetInt32(1000, 9999)}", customer, request.Province, request.City, request.Address, request.PostalCode, quote.Subtotal, quote.DiscountTotal, quote.ShippingTotal, quote.ReservedUntilUtc, Hash(rawToken), request.CustomerNotes);
        if (userId.HasValue) order.AttachToUser(userId.Value);
        if (!string.IsNullOrWhiteSpace(idempotencyKey)) order.SetIdempotencyKey(idempotencyKey);
        foreach (var line in lines) order.AddItem(new OrderItem(line.ProductId, line.VariantId, line.ProductName, line.Sku, line.UnitPrice, line.Quantity));
        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            var matchedPromo = await db.Promotions.FirstOrDefaultAsync(x => x.IsActive && x.Code != null && x.Code.ToUpper() == request.CouponCode.Trim().ToUpper(), cancellationToken);
            matchedPromo?.IncrementUsage();
        }
        customer.AddOrder(order.Total);
        await db.Orders.AddAsync(order, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new(order.Id, order.Number, rawToken, order.Total, order.ReservationExpiresAtUtc);
    }

    public async Task<AdminOrderDto> TrackOrderAsync(string token, CancellationToken cancellationToken)
    {
        var order = await db.Orders.AsNoTracking().Include(x => x.Items).SingleOrDefaultAsync(x => x.TrackingTokenHash == Hash(token), cancellationToken)
            ?? throw new NotFoundException("Order was not found.");
        var mapped = await MapOrdersAsync([order], cancellationToken);
        return mapped.Single();
    }

    public async Task<IReadOnlyList<ProductVariantDto>> VariantsAsync(Guid productId, CancellationToken cancellationToken) =>
        (await db.ProductVariants.AsNoTracking().Where(x => x.ProductId == productId).OrderBy(x => x.Title).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<ProductVariantDto> CreateVariantAsync(Guid productId, ProductVariantWriteRequest request, CancellationToken cancellationToken)
    {
        if (!await db.Products.AnyAsync(x => x.Id == productId, cancellationToken)) throw new NotFoundException($"Product '{productId}' was not found.");
        if (await db.ProductVariants.AnyAsync(x => x.Sku == request.Sku.Trim().ToUpperInvariant(), cancellationToken)) throw new ConflictException("A variant with this SKU already exists.");
        var entity = new ProductVariant(productId, request.Title, request.Sku, request.Color, request.TableCapacity, request.Length, request.Width, request.Price, request.CompareAtPrice, request.StockQuantity, request.LowStockThreshold, request.IsActive);
        await db.ProductVariants.AddAsync(entity, cancellationToken); await db.SaveChangesAsync(cancellationToken); return Map(entity);
    }

    public async Task<ProductVariantDto> UpdateVariantAsync(Guid id, ProductVariantWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Variant '{id}' was not found.");
        if (await db.ProductVariants.AnyAsync(x => x.Id != id && x.Sku == request.Sku.Trim().ToUpperInvariant(), cancellationToken)) throw new ConflictException("A variant with this SKU already exists.");
        entity.Update(request.Title, request.Sku, request.Color, request.TableCapacity, request.Length, request.Width, request.Price, request.CompareAtPrice, request.LowStockThreshold, request.IsActive);
        if (request.StockQuantity != entity.StockQuantity)
        {
            var delta = request.StockQuantity - entity.StockQuantity;
            entity.AdjustStock(delta);
            var product = await db.Products.SingleOrDefaultAsync(x => x.Id == entity.ProductId, cancellationToken);
            if (product is not null && product.StockQuantity + delta >= 0) product.AdjustStock(delta);
        }
        await db.SaveChangesAsync(cancellationToken); return Map(entity);
    }

    public async Task DeleteVariantAsync(Guid id, CancellationToken cancellationToken)
    { var entity = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Variant '{id}' was not found."); entity.Update(entity.Title, entity.Sku, entity.Color, entity.TableCapacity, entity.Length, entity.Width, entity.Price, entity.CompareAtPrice, entity.LowStockThreshold, false); await db.SaveChangesAsync(cancellationToken); }

    public async Task<IReadOnlyList<ProductMediaDto>> MediaAsync(Guid productId, CancellationToken cancellationToken) => (await db.ProductMedia.AsNoTracking().Where(x => x.ProductId == productId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken)).Select(Map).ToList();
    public async Task<ProductMediaDto> AddMediaAsync(Guid productId, ProductMediaWriteRequest request, CancellationToken cancellationToken)
    { if (!await db.Products.AnyAsync(x => x.Id == productId, cancellationToken)) throw new NotFoundException($"Product '{productId}' was not found."); var entity = new ProductMedia(productId, request.PublicUrl, request.AltText, request.SortOrder, request.IsPrimary); if (request.IsPrimary) await db.ProductMedia.Where(x => x.ProductId == productId).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsPrimary, false), cancellationToken); await db.ProductMedia.AddAsync(entity, cancellationToken); await db.SaveChangesAsync(cancellationToken); return Map(entity); }
    public async Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken) { var entity = await db.ProductMedia.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Media '{id}' was not found."); db.ProductMedia.Remove(entity); await db.SaveChangesAsync(cancellationToken); }

    private async Task<List<CheckoutLine>> ResolveLines(IReadOnlyList<CheckoutItemRequest> requests, CancellationToken cancellationToken)
    {
        if (requests.Count == 0) throw new Terma.Domain.Exceptions.DomainException("At least one product is required.");
        var result = new List<CheckoutLine>();
        foreach (var request in requests)
        {
            if (request.Quantity <= 0 || request.Quantity > 100) throw new Terma.Domain.Exceptions.DomainException("Product quantity is invalid.");
            var product = await db.Products.Include(x => x.Variants).SingleOrDefaultAsync(x => x.Id == request.ProductId && x.IsActive, cancellationToken) ?? throw new NotFoundException("Product was not found.");
            var variant = request.VariantId.HasValue ? product.Variants.SingleOrDefault(x => x.Id == request.VariantId.Value && x.IsActive) : product.Variants.FirstOrDefault(x => x.IsActive);
            if (variant is null) throw new NotFoundException("Product variant was not found.");
            if (request.Quantity > variant.AvailableQuantity) throw new Terma.Domain.Exceptions.DomainException($"Only {variant.AvailableQuantity} items are available.");
            result.Add(new CheckoutLine(product.Id, variant.Id, product.Name, variant.Sku, variant.Price, request.Quantity, variant.AvailableQuantity, variant));
        }
        return result;
    }

    private sealed record CheckoutLine(Guid ProductId, Guid? VariantId, string ProductName, string Sku, decimal UnitPrice, int Quantity, int AvailableQuantity, ProductVariant Variant);
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static void ValidateCheckoutDetails(CheckoutRequest request)
    {
        if (request.FullName.Trim().Length is < 3 or > 200) throw new Terma.Domain.Exceptions.DomainException("A valid full name is required.");
        _ = IranianPhoneNumber.Normalize(request.Phone);
        if (request.Province.Trim().Length is < 2 or > 120) throw new Terma.Domain.Exceptions.DomainException("A valid province is required.");
        if (request.City.Trim().Length is < 2 or > 120) throw new Terma.Domain.Exceptions.DomainException("A valid city is required.");
        if (request.Address.Trim().Length is < 10 or > 1000) throw new Terma.Domain.Exceptions.DomainException("A complete address is required.");
        var postalCode = new string(request.PostalCode.Select(value => value switch { >= '\u06F0' and <= '\u06F9' => (char)('0' + value - '\u06F0'), >= '\u0660' and <= '\u0669' => (char)('0' + value - '\u0660'), _ => value }).ToArray());
        if (postalCode.Length != 10 || postalCode.Any(value => !char.IsDigit(value))) throw new Terma.Domain.Exceptions.DomainException("A valid ten-digit postal code is required.");
    }

    private async Task<IReadOnlyList<AdminOrderDto>> MapOrdersAsync(List<Order> orders, CancellationToken cancellationToken)
    {
        var variantIds = orders.SelectMany(o => o.Items).Select(i => i.VariantId).Where(v => v.HasValue).Select(v => v!.Value).Distinct().ToList();
        var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
        var variants = await db.ProductVariants.AsNoTracking().Where(x => variantIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        var products = await db.Products.AsNoTracking().Where(x => productIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);

        var result = new List<AdminOrderDto>();
        foreach (var x in orders)
        {
            var items = x.Items.OrderBy(i => i.CreatedAt).Select(i =>
            {
                string? title = null;
                int? capacity = null;
                if (i.VariantId.HasValue && variants.TryGetValue(i.VariantId.Value, out var v))
                {
                    title = string.IsNullOrWhiteSpace(v.Title) || v.Title == "تنوع پیش‌فرض" ? null : v.Title;
                    capacity = v.TableCapacity;
                }
                else if (products.TryGetValue(i.ProductId, out var p))
                {
                    capacity = p.TableCapacity;
                }
                var formattedTitle = title ?? (capacity > 0 ? $"{capacity} نفره" : null);
                return new AdminOrderItemDto(i.ProductId, i.VariantId, i.ProductName, formattedTitle, capacity, i.Sku, i.UnitPrice, i.Quantity);
            }).ToList();

            result.Add(new AdminOrderDto(x.Id, x.Number, x.FullNameSnapshot, x.PhoneSnapshot, x.Status, x.Total, x.CreatedAt, x.ReservationExpiresAtUtc, x.Province, x.City, x.Address, x.PostalCode, x.CustomerNotes, items));
        }
        return result;
    }

    private static PromotionDto Map(Promotion x) => new(x.Id, x.Name, x.Code, x.Type, x.DiscountType, x.Value, x.MinimumSubtotal, x.MaximumDiscount, x.UsageLimit, x.UsageCount, x.StartsAtUtc, x.EndsAtUtc, x.IsActive);
    private static ShippingRuleDto Map(ShippingRule x) => new(x.Id, x.Name, x.Province, x.City, x.Cost, x.FreeAboveSubtotal, x.Priority, x.IsActive);
    private static StoreContentDto Map(StoreContent x) => new(x.Id, x.PageKey, x.SectionKey, x.Title, x.Body, x.LinkUrl, x.ImageUrl, x.SeoTitle, x.SeoDescription, x.IsPublished);
    private static ContactMessageDto MapMessage(ContactMessage x) => new(x.Id, x.Name, x.Phone, x.Email, x.Topic, x.Body, x.Status, x.CreatedAt);
    private static ProductVariantDto Map(ProductVariant x) => new(x.Id, x.ProductId, x.Title, x.Sku, x.Color, x.TableCapacity, x.Length, x.Width, x.Price, x.CompareAtPrice, x.StockQuantity, x.ReservedQuantity, x.AvailableQuantity, x.LowStockThreshold, x.IsActive);
    private static ProductMediaDto Map(ProductMedia x) => new(x.Id, x.ProductId, x.PublicUrl, x.AltText, x.SortOrder, x.IsPrimary);
}
