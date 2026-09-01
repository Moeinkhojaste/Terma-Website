using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Store;
using Terma.Application.Telegram;
using Terma.Domain.Entities;
using Terma.Domain.Exceptions;
using Terma.Domain.Services;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Store;

public sealed class StoreOperationsService(
    TermaDbContext db,
    ITelegramBotService? telegramBotService = null,
    ILogger<StoreOperationsService>? logger = null) : IStoreOperationsService
{
    private static readonly PersianCalendar Pc = new();
    private static readonly TimeZoneInfo IranTimeZone = GetIranTimeZone();

    private static TimeZoneInfo GetIranTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time");
        }
        catch
        {
            return TimeZoneInfo.CreateCustomTimeZone("IRST", TimeSpan.FromHours(3.5), "Iran Standard Time", "Iran Standard Time");
        }
    }

    private static DateTime ToIranTime(DateTime utc)
    {
        if (utc.Kind == DateTimeKind.Unspecified)
            utc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc.ToUniversalTime(), IranTimeZone);
    }

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

    public async Task<AdminAnalyticsDto> AnalyticsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var oneYearAgo = now.AddDays(-365);

        // Fetch valid and all orders in 1 year
        var allOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Customer)
            .Where(x => x.CreatedAt >= oneYearAgo)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var validOrders = allOrders.Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired).ToList();

        // 30 Days & 1 Year Sales
        var validOrders30 = validOrders.Where(x => x.CreatedAt >= thirtyDaysAgo).ToList();
        var sales30Days = validOrders30.Sum(x => x.Total);
        var sales1Year = validOrders.Sum(x => x.Total);
        var allValidOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired)
            .ToListAsync(cancellationToken);
        var allTimeValidSales = allValidOrders.Sum(x => x.Total);

        // Order counts
        var orders30Days = allOrders.Count(x => x.CreatedAt >= thirtyDaysAgo);
        var orders1Year = allOrders.Count;
        var ordersTotal = await db.Orders.CountAsync(cancellationToken);

        // Items sold
        var itemsSold30Days = validOrders30.SelectMany(x => x.Items).Sum(x => x.Quantity);
        var itemsSold1Year = validOrders.SelectMany(x => x.Items).Sum(x => x.Quantity);
        var itemsSoldTotal = allValidOrders.SelectMany(x => x.Items).Sum(x => x.Quantity);

        // Averages
        var validCount30 = validOrders30.Count;
        var validCount1y = validOrders.Count;
        var avgItems30 = validCount30 > 0 ? Math.Round((decimal)itemsSold30Days / validCount30, 2) : 0;
        var avgItems1y = validCount1y > 0 ? Math.Round((decimal)itemsSold1Year / validCount1y, 2) : 0;
        var aov30 = validCount30 > 0 ? Math.Round(sales30Days / validCount30, 0) : 0;
        var aov1y = validCount1y > 0 ? Math.Round(sales1Year / validCount1y, 0) : 0;

        var salesMetrics = new SalesMetricsDto(
            sales30Days,
            sales1Year,
            allTimeValidSales,
            orders30Days,
            orders1Year,
            ordersTotal,
            itemsSold30Days,
            itemsSold1Year,
            itemsSoldTotal,
            avgItems30,
            avgItems1y,
            aov30,
            aov1y
        );

        // Registrations
        var totalRegistered = await db.Customers.CountAsync(x => x.UserId != null, cancellationToken);
        var reg30 = await db.Customers.CountAsync(x => x.UserId != null && x.CreatedAt >= thirtyDaysAgo, cancellationToken);
        var reg1y = await db.Customers.CountAsync(x => x.UserId != null && x.CreatedAt >= oneYearAgo, cancellationToken);
        var guests = await db.Customers.CountAsync(x => x.UserId == null, cancellationToken);
        var regMetrics = new RegistrationMetricsDto(totalRegistered, reg30, reg1y, guests);

        // Abandoned Carts & Expired Checkouts
        var sessionThreshold = now.AddMinutes(-30);
        var abandonedSessions30 = await db.CartSessions
            .AsNoTracking()
            .Where(x => !x.IsRecovered && x.ItemCount > 0 && x.LastActivityAtUtc >= thirtyDaysAgo && x.LastActivityAtUtc <= sessionThreshold)
            .ToListAsync(cancellationToken);
        var abandonedSessions1y = await db.CartSessions
            .AsNoTracking()
            .Where(x => !x.IsRecovered && x.ItemCount > 0 && x.LastActivityAtUtc >= oneYearAgo && x.LastActivityAtUtc <= sessionThreshold)
            .ToListAsync(cancellationToken);

        var expiredOrders30 = allOrders.Where(x => x.Status == OrderStatus.Expired && x.CreatedAt >= thirtyDaysAgo).ToList();
        var expiredOrders1y = allOrders.Where(x => x.Status == OrderStatus.Expired).ToList();

        var abandonedCount30 = abandonedSessions30.Count + expiredOrders30.Count;
        var abandonedCount1y = abandonedSessions1y.Count + expiredOrders1y.Count;
        var abandonedVal30 = abandonedSessions30.Sum(x => x.TotalValue) + expiredOrders30.Sum(x => x.Total);
        var abandonedVal1y = abandonedSessions1y.Sum(x => x.TotalValue) + expiredOrders1y.Sum(x => x.Total);
        var rate30 = (orders30Days + abandonedCount30) > 0
            ? Math.Round((decimal)abandonedCount30 / (orders30Days + abandonedCount30) * 100, 1)
            : 0;

        var abandonedMetrics = new AbandonedCartsMetricsDto(
            abandonedCount30,
            abandonedCount1y,
            abandonedVal30,
            abandonedVal1y,
            rate30,
            expiredOrders30.Count,
            expiredOrders30.Sum(x => x.Total)
        );

        // 30-Day Daily Trend (Iran Local Time)
        var todayIran = ToIranTime(now).Date;
        var dailyPoints = new List<DailyMetricPointDto>();
        for (var i = 29; i >= 0; i--)
        {
            var dayIranStart = todayIran.AddDays(-i);
            var dayIranEnd = dayIranStart.AddDays(1);

            var dayUtcStart = TimeZoneInfo.ConvertTimeToUtc(dayIranStart, IranTimeZone);
            var dayUtcEnd = TimeZoneInfo.ConvertTimeToUtc(dayIranEnd, IranTimeZone);

            var dayValidOrders = validOrders.Where(x => x.CreatedAt >= dayUtcStart && x.CreatedAt < dayUtcEnd).ToList();
            var dayAllOrders = allOrders.Where(x => x.CreatedAt >= dayUtcStart && x.CreatedAt < dayUtcEnd).ToList();

            var sales = dayValidOrders.Sum(x => x.Total);
            var count = dayAllOrders.Count;
            var items = dayValidOrders.SelectMany(x => x.Items).Sum(x => x.Quantity);

            dailyPoints.Add(new DailyMetricPointDto(
                dayIranStart.ToString("yyyy-MM-dd"),
                $"{Pc.GetYear(dayIranStart):0000}/{Pc.GetMonth(dayIranStart):00}/{Pc.GetDayOfMonth(dayIranStart):00}",
                sales,
                count,
                items
            ));
        }

        // 12-Month Monthly Trend (Persian Solar Months)
        var currentPersianYear = Pc.GetYear(todayIran);
        var currentPersianMonth = Pc.GetMonth(todayIran);
        var monthlyPoints = new List<MonthlyMetricPointDto>();
        for (var i = 11; i >= 0; i--)
        {
            var mOffset = currentPersianMonth - i;
            var targetYear = currentPersianYear;
            var targetMonth = mOffset;
            while (targetMonth <= 0)
            {
                targetMonth += 12;
                targetYear -= 1;
            }

            var pMonthStartGregorian = Pc.ToDateTime(targetYear, targetMonth, 1, 0, 0, 0, 0);
            var daysInMonth = Pc.GetDaysInMonth(targetYear, targetMonth);
            var pMonthEndGregorian = Pc.ToDateTime(targetYear, targetMonth, daysInMonth, 23, 59, 59, 999);

            var mUtcStart = TimeZoneInfo.ConvertTimeToUtc(pMonthStartGregorian, IranTimeZone);
            var mUtcEnd = TimeZoneInfo.ConvertTimeToUtc(pMonthEndGregorian, IranTimeZone);

            var mValidOrders = validOrders.Where(x => x.CreatedAt >= mUtcStart && x.CreatedAt <= mUtcEnd).ToList();
            var mAllOrders = allOrders.Where(x => x.CreatedAt >= mUtcStart && x.CreatedAt <= mUtcEnd).ToList();

            var sales = mValidOrders.Sum(x => x.Total);
            var count = mAllOrders.Count;
            var items = mValidOrders.SelectMany(x => x.Items).Sum(x => x.Quantity);

            monthlyPoints.Add(new MonthlyMetricPointDto(
                $"{targetYear:0000}-{targetMonth:00}",
                $"{ToPersianMonthName(targetMonth)} {targetYear}",
                sales,
                count,
                items
            ));
        }

        // Order status breakdown
        var statusStats = new List<OrderStatusStatDto>();
        var statusGroups = allOrders.GroupBy(x => x.Status).ToDictionary(g => g.Key, g => g.ToList());
        foreach (OrderStatus st in Enum.GetValues<OrderStatus>())
        {
            var list = statusGroups.GetValueOrDefault(st) ?? [];
            statusStats.Add(new OrderStatusStatDto(
                st.ToString(),
                ToPersianStatus(st),
                list.Count,
                list.Sum(x => x.Total)
            ));
        }

        // Top Selling (30 Days)
        var topSelling = await GetTopSellingProductsInternalAsync(30, 10, cancellationToken);

        // Top Viewed (30 Days)
        var topViewed = await GetTopViewedProductsInternalAsync(30, 10, cancellationToken);

        // Loyal Customers
        var loyal = await GetLoyalCustomersInternalAsync(10, cancellationToken);

        return new AdminAnalyticsDto(
            salesMetrics,
            regMetrics,
            abandonedMetrics,
            dailyPoints,
            monthlyPoints,
            statusStats,
            topSelling,
            topViewed,
            loyal
        );
    }

    public async Task<AbandonedCartsReportDto> AbandonedCartsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var threshold = now.AddMinutes(-30);

        var sessions = await db.CartSessions
            .AsNoTracking()
            .Where(x => !x.IsRecovered && x.ItemCount > 0 && x.LastActivityAtUtc <= threshold)
            .OrderByDescending(x => x.LastActivityAtUtc)
            .ToListAsync(cancellationToken);

        var expiredOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.Status == OrderStatus.Expired)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = new List<AbandonedCartDetailsDto>();

        foreach (var s in sessions)
        {
            List<AbandonedCartItemDto> items = [];
            try
            {
                var parsed = JsonSerializer.Deserialize<List<CartSyncItemRequest>>(s.ItemsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (parsed != null)
                {
                    items = parsed.Select(i => new AbandonedCartItemDto(i.ProductName, null, i.Sku, i.UnitPrice, i.Quantity)).ToList();
                }
            }
            catch { }

            list.Add(new AbandonedCartDetailsDto(
                s.Id,
                s.SessionKey,
                s.CustomerName,
                s.Phone,
                s.Email,
                s.ItemCount,
                s.TotalValue,
                s.LastActivityAtUtc,
                false,
                items
            ));
        }

        foreach (var o in expiredOrders)
        {
            var items = o.Items.Select(i => new AbandonedCartItemDto(i.ProductName, null, i.Sku, i.UnitPrice, i.Quantity)).ToList();
            list.Add(new AbandonedCartDetailsDto(
                o.Id,
                o.Number,
                o.FullNameSnapshot,
                o.PhoneSnapshot,
                o.EmailSnapshot,
                items.Sum(i => i.Quantity),
                o.Total,
                o.CreatedAt,
                true,
                items
            ));
        }

        list = list.OrderByDescending(x => x.LastActivityAtUtc).ToList();
        var totalCount = list.Count;
        var totalValue = list.Sum(x => x.TotalValue);

        var totalOrders = await db.Orders.CountAsync(cancellationToken);
        var rate = (totalOrders + totalCount) > 0 ? Math.Round((decimal)totalCount / (totalOrders + totalCount) * 100, 1) : 0;

        var pagedItems = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new AbandonedCartsReportDto(totalCount, totalValue, rate, pagedItems);
    }

    public Task<IReadOnlyList<LoyalCustomerDto>> LoyalCustomersAsync(int limit, CancellationToken cancellationToken) =>
        GetLoyalCustomersInternalAsync(limit, cancellationToken);

    public Task<IReadOnlyList<TopSellingProductDto>> TopSellingProductsAsync(int days, int limit, CancellationToken cancellationToken) =>
        GetTopSellingProductsInternalAsync(days, limit, cancellationToken);

    public Task<IReadOnlyList<TopViewedProductDto>> TopViewedProductsAsync(int days, int limit, CancellationToken cancellationToken) =>
        GetTopViewedProductsInternalAsync(days, limit, cancellationToken);

    public async Task SyncCartSessionAsync(SyncCartSessionRequest request, Guid? userId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SessionKey)) return;

        var cleanKey = request.SessionKey.Trim();
        var session = await db.CartSessions.SingleOrDefaultAsync(x => x.SessionKey == cleanKey, cancellationToken);
        var itemCount = request.Items.Sum(x => x.Quantity);
        var totalValue = request.Items.Sum(x => x.UnitPrice * x.Quantity);
        var itemsJson = JsonSerializer.Serialize(request.Items);

        if (session is null)
        {
            if (itemCount > 0)
            {
                session = new CartSession(
                    cleanKey,
                    itemsJson,
                    itemCount,
                    totalValue,
                    userId,
                    null,
                    request.CustomerName,
                    request.Phone,
                    request.Email
                );
                await db.CartSessions.AddAsync(session, cancellationToken);
            }
        }
        else
        {
            session.UpdateActivity(
                itemsJson,
                itemCount,
                totalValue,
                userId,
                null,
                request.CustomerName,
                request.Phone,
                request.Email
            );
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task RecordProductViewAsync(Guid productId, string? visitorHash, CancellationToken cancellationToken)
    {
        var productExists = await db.Products.AnyAsync(x => x.Id == productId, cancellationToken);
        if (!productExists) return;

        var now = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(visitorHash))
        {
            var cleanHash = visitorHash.Trim();
            var tenMinutesAgo = now.AddMinutes(-10);
            var recentViewExists = await db.ProductViews.AnyAsync(x => x.ProductId == productId && x.VisitorHash == cleanHash && x.ViewedAtUtc >= tenMinutesAgo, cancellationToken);
            if (recentViewExists) return;
        }

        var view = new ProductView(productId, visitorHash, now);
        await db.ProductViews.AddAsync(view, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<TopSellingProductDto>> GetTopSellingProductsInternalAsync(int days, int limit, CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var validOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired && x.CreatedAt >= since)
            .ToListAsync(cancellationToken);

        var orderItems = validOrders.SelectMany(x => x.Items).ToList();

        var grouped = orderItems.GroupBy(x => x.ProductId)
            .Select(g => new { ProductId = g.Key, UnitsSold = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.UnitPrice * x.Quantity) })
            .OrderByDescending(x => x.Revenue)
            .ThenByDescending(x => x.UnitsSold)
            .Take(limit)
            .ToList();

        var productIds = grouped.Select(x => x.ProductId).ToList();
        var products = await db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Media)
            .Where(x => productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var result = new List<TopSellingProductDto>();
        foreach (var g in grouped)
        {
            if (products.TryGetValue(g.ProductId, out var p))
            {
                var primaryMedia = p.Media.OrderBy(m => m.SortOrder).FirstOrDefault();
                var avgPrice = g.UnitsSold > 0 ? Math.Round(g.Revenue / g.UnitsSold, 0) : p.Price;
                result.Add(new TopSellingProductDto(
                    p.Id,
                    p.Name,
                    p.Slug,
                    p.Sku,
                    p.Category?.Name ?? "عمومی",
                    primaryMedia?.PublicUrl,
                    g.UnitsSold,
                    g.Revenue,
                    avgPrice
                ));
            }
        }

        // If sales are low, fallback to active products with 0 sold
        if (result.Count < limit)
        {
            var remaining = limit - result.Count;
            var existingIds = result.Select(x => x.ProductId).ToList();
            var extra = await db.Products
                .AsNoTracking()
                .Include(x => x.Category)
                .Include(x => x.Media)
                .Where(x => x.IsActive && !existingIds.Contains(x.Id))
                .Take(remaining)
                .ToListAsync(cancellationToken);

            foreach (var p in extra)
            {
                var primaryMedia = p.Media.OrderBy(m => m.SortOrder).FirstOrDefault();
                result.Add(new TopSellingProductDto(
                    p.Id,
                    p.Name,
                    p.Slug,
                    p.Sku,
                    p.Category?.Name ?? "عمومی",
                    primaryMedia?.PublicUrl,
                    0,
                    0,
                    p.Price
                ));
            }
        }

        return result;
    }

    private async Task<IReadOnlyList<TopViewedProductDto>> GetTopViewedProductsInternalAsync(int days, int limit, CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var rawViews = await db.ProductViews
            .AsNoTracking()
            .Where(x => x.ViewedAtUtc >= since)
            .Select(x => x.ProductId)
            .ToListAsync(cancellationToken);

        var views = rawViews
            .GroupBy(x => x)
            .Select(g => new { ProductId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .ToList();

        var productIds = views.Select(x => x.ProductId).ToList();
        var products = await db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Media)
            .Where(x => productIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var validOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired && x.CreatedAt >= since)
            .ToListAsync(cancellationToken);

        var unitsByProduct = validOrders
            .SelectMany(x => x.Items)
            .Where(x => productIds.Contains(x.ProductId))
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        var ordersByProduct = validOrders
            .SelectMany(x => x.Items.Select(i => new { i.ProductId, OrderId = x.Id }))
            .Where(x => productIds.Contains(x.ProductId))
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.OrderId).Distinct().Count());

        var result = new List<TopViewedProductDto>();
        foreach (var v in views)
        {
            if (products.TryGetValue(v.ProductId, out var p))
            {
                var primaryMedia = p.Media.OrderBy(m => m.SortOrder).FirstOrDefault();
                var units = unitsByProduct.GetValueOrDefault(v.ProductId, 0);
                var orders = ordersByProduct.GetValueOrDefault(v.ProductId, 0);
                var conversion = v.Count > 0 ? Math.Min(100m, Math.Round((decimal)orders / v.Count * 100m, 1)) : 0;
                result.Add(new TopViewedProductDto(
                    p.Id,
                    p.Name,
                    p.Slug,
                    p.Sku,
                    p.Category?.Name ?? "عمومی",
                    primaryMedia?.PublicUrl,
                    v.Count,
                    orders,
                    units,
                    conversion
                ));
            }
        }

        // If views in DB are low or empty, populate with active catalog products
        if (result.Count < limit)
        {
            var remaining = limit - result.Count;
            var existingIds = result.Select(x => x.ProductId).ToList();
            var extra = await db.Products
                .AsNoTracking()
                .Include(x => x.Category)
                .Include(x => x.Media)
                .Where(x => x.IsActive && !existingIds.Contains(x.Id))
                .Take(remaining)
                .ToListAsync(cancellationToken);

            foreach (var p in extra)
            {
                var primaryMedia = p.Media.OrderBy(m => m.SortOrder).FirstOrDefault();
                result.Add(new TopViewedProductDto(
                    p.Id,
                    p.Name,
                    p.Slug,
                    p.Sku,
                    p.Category?.Name ?? "عمومی",
                    primaryMedia?.PublicUrl,
                    0,
                    0,
                    0,
                    0
                ));
            }
        }

        return result;
    }

    private async Task<IReadOnlyList<LoyalCustomerDto>> GetLoyalCustomersInternalAsync(int limit, CancellationToken cancellationToken)
    {
        var rawCustomers = await db.Customers
            .AsNoTracking()
            .Where(x => x.OrderCount > 0)
            .ToListAsync(cancellationToken);

        var customers = rawCustomers
            .OrderByDescending(x => x.TotalOrderValue)
            .ThenByDescending(x => x.OrderCount)
            .Take(limit)
            .ToList();

        var customerIds = customers.Select(x => x.Id).ToList();
        var customerOrders = await db.Orders
            .AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId))
            .Select(x => new { x.CustomerId, x.CreatedAt })
            .ToListAsync(cancellationToken);

        var latestOrders = customerOrders
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Max(o => o.CreatedAt));

        var result = new List<LoyalCustomerDto>();
        foreach (var c in customers)
        {
            var aov = c.OrderCount > 0 ? Math.Round(c.TotalOrderValue / c.OrderCount, 0) : 0;
            var tier = c.OrderCount >= 5 || c.TotalOrderValue >= 20_000_000 ? "VIP"
                : c.OrderCount >= 3 || c.TotalOrderValue >= 10_000_000 ? "طلایی"
                : c.OrderCount >= 2 || c.TotalOrderValue >= 5_000_000 ? "نقره‌ای"
                : "برنزی";

            result.Add(new LoyalCustomerDto(
                c.Id,
                c.UserId,
                c.FullName,
                c.Phone,
                c.Email,
                c.OrderCount,
                c.TotalOrderValue,
                aov,
                latestOrders.GetValueOrDefault(c.Id),
                tier
            ));
        }

        return result;
    }

    private static string ToPersianDate(DateTime dt)
    {
        var iran = ToIranTime(dt);
        return $"{Pc.GetYear(iran):0000}/{Pc.GetMonth(iran):00}/{Pc.GetDayOfMonth(iran):00}";
    }

    private static string ToPersianMonthName(int month) => month switch
    {
        1 => "فروردین", 2 => "اردیبهشت", 3 => "خرداد", 4 => "تیر", 5 => "مرداد", 6 => "شهریور",
        7 => "مهر", 8 => "آبان", 9 => "آذر", 10 => "دی", 11 => "بهمن", 12 => "اسفند", _ => ""
    };

    private static string ToPersianStatus(OrderStatus status) => status switch
    {
        OrderStatus.PendingConfirmation => "در انتظار بررسی",
        OrderStatus.Confirmed => "تأیید شده",
        OrderStatus.Preparing => "در حال آماده‌سازی",
        OrderStatus.Shipped => "ارسال شده",
        OrderStatus.Delivered => "تحویل شده",
        OrderStatus.Cancelled => "لغو شده",
        OrderStatus.Expired => "منقضی شده",
        _ => status.ToString()
    };

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

    public async Task<AdminOrderDto> ChangeOrderStatusAsync(Guid id, OrderStatus status, string? postalTrackingCode, CancellationToken cancellationToken)
    {
        var order = await db.Orders.Include(x => x.Items).Include(x => x.History).SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Order '{id}' was not found.");

        if (postalTrackingCode is not null)
        {
            order.SetPostalTrackingCode(postalTrackingCode);
        }

        if (order.Status != status)
        {
            var oldStatus = order.Status;
            var newStatus = status;

            var oldIsPending = oldStatus == OrderStatus.PendingConfirmation;
            var oldIsCommitted = oldStatus is OrderStatus.Confirmed or OrderStatus.Preparing or OrderStatus.Shipped or OrderStatus.Delivered;
            var oldIsReleased = oldStatus is OrderStatus.Cancelled or OrderStatus.Expired;

            var newIsPending = newStatus == OrderStatus.PendingConfirmation;
            var newIsCommitted = newStatus is OrderStatus.Confirmed or OrderStatus.Preparing or OrderStatus.Shipped or OrderStatus.Delivered;
            var newIsReleased = newStatus is OrderStatus.Cancelled or OrderStatus.Expired;

            foreach (var item in order.Items.Where(x => x.VariantId.HasValue))
            {
                var variant = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == item.VariantId, cancellationToken);
                if (variant is null) continue;
                var product = await db.Products.SingleOrDefaultAsync(x => x.Id == item.ProductId, cancellationToken);

                if (oldIsPending && newIsCommitted)
                {
                    if (variant.ReservedQuantity >= item.Quantity)
                    {
                        variant.CommitReservation(item.Quantity);
                    }
                    else
                    {
                        var reserveToCommit = variant.ReservedQuantity;
                        if (reserveToCommit > 0) variant.CommitReservation(reserveToCommit);
                        var remaining = item.Quantity - reserveToCommit;
                        var deduct = Math.Min(variant.AvailableQuantity, remaining);
                        if (deduct > 0) variant.AdjustStock(-deduct);
                    }
                }
                else if (oldIsPending && newIsReleased)
                {
                    var releaseQty = Math.Min(variant.ReservedQuantity, item.Quantity);
                    if (releaseQty > 0) variant.ReleaseReservation(releaseQty);
                    product?.AdjustStock(item.Quantity);
                }
                else if (oldIsCommitted && newIsReleased)
                {
                    variant.AdjustStock(item.Quantity);
                    product?.AdjustStock(item.Quantity);
                }
                else if (oldIsCommitted && newIsPending)
                {
                    variant.AdjustStock(item.Quantity);
                    var reserveQty = Math.Min(variant.AvailableQuantity, item.Quantity);
                    if (reserveQty > 0) variant.Reserve(reserveQty);
                }
                else if (oldIsReleased && newIsCommitted)
                {
                    var deductVariant = Math.Min(variant.AvailableQuantity, item.Quantity);
                    if (deductVariant > 0) variant.AdjustStock(-deductVariant);
                    if (product is not null)
                    {
                        var deductProduct = Math.Min(product.StockQuantity, item.Quantity);
                        if (deductProduct > 0) product.AdjustStock(-deductProduct);
                    }
                }
                else if (oldIsReleased && newIsPending)
                {
                    var reserveQty = Math.Min(variant.AvailableQuantity, item.Quantity);
                    if (reserveQty > 0) variant.Reserve(reserveQty);
                    if (product is not null)
                    {
                        var deductProduct = Math.Min(product.StockQuantity, item.Quantity);
                        if (deductProduct > 0) product.AdjustStock(-deductProduct);
                    }
                }
            }

            order.ChangeStatus(status);
            await db.OrderStatusHistories.AddAsync(new OrderStatusHistory(order.Id, status, DateTime.UtcNow), cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        var mapped = await MapOrdersAsync([order], cancellationToken);
        return mapped.Single();
    }

    public async Task<IReadOnlyList<AdminCustomerDto>> CustomersAsync(CancellationToken cancellationToken) =>
        await db.Customers.AsNoTracking().OrderByDescending(x => x.CreatedAt).Select(x => new AdminCustomerDto(x.Id, x.FullName, x.Phone, x.Email, x.OrderCount, x.TotalOrderValue, x.CreatedAt)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PromotionDto>> PromotionsAsync(CancellationToken cancellationToken) =>
        (await db.Promotions.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<PromotionDto> CreatePromotionAsync(PromotionWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = new Promotion(request.Name, request.Code, request.Type, request.DiscountType, request.Value, request.MinimumSubtotal, request.MaximumDiscount, request.UsageLimit, request.StartsAtUtc, request.EndsAtUtc, request.IsActive);
        await db.Promotions.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<PromotionDto> UpdatePromotionAsync(Guid id, PromotionWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Promotions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Promotion '{id}' was not found.");

        entity.Update(request.Name, request.Code, request.Type, request.DiscountType, request.Value,
            request.MinimumSubtotal, request.MaximumDiscount, request.UsageLimit, request.StartsAtUtc, request.EndsAtUtc, request.IsActive);

        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeletePromotionAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Promotions.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Promotion '{id}' was not found.");
        entity.SetActive(false);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ShippingRuleDto>> ShippingRulesAsync(CancellationToken cancellationToken) =>
        (await db.ShippingRules.AsNoTracking().OrderBy(x => x.Priority).ThenBy(x => x.Name).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<ShippingRuleDto> CreateShippingRuleAsync(ShippingRuleWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = new ShippingRule(request.Name, request.Province, request.City, request.Cost, request.FreeAboveSubtotal, request.Priority, request.IsActive);
        await db.ShippingRules.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<ShippingRuleDto> UpdateShippingRuleAsync(Guid id, ShippingRuleWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.ShippingRules.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Shipping rule '{id}' was not found.");

        entity.Update(request.Name, request.Province, request.City, request.Cost, request.FreeAboveSubtotal, request.Priority, request.IsActive);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteShippingRuleAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.ShippingRules.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Shipping rule '{id}' was not found.");
        entity.SetActive(false);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StoreContentDto>> ContentAsync(string? pageKey, bool includeUnpublished, CancellationToken cancellationToken)
    {
        var query = db.StoreContents.AsNoTracking().Where(x => includeUnpublished || x.IsPublished).OrderBy(x => x.PageKey).ThenBy(x => x.SectionKey);
        if (!string.IsNullOrWhiteSpace(pageKey)) query = query.Where(x => x.PageKey == pageKey).OrderBy(x => x.SectionKey);
        return (await query.ToListAsync(cancellationToken)).Select(Map).ToList();
    }

    public async Task<StoreContentDto> UpsertContentAsync(StoreContentWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.StoreContents.SingleOrDefaultAsync(x => x.PageKey == request.PageKey && x.SectionKey == request.SectionKey, cancellationToken);
        if (entity is null)
        {
            entity = new StoreContent(request.PageKey, request.SectionKey, request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription);
            if (!request.IsPublished) entity.Update(request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription, false);
            await db.StoreContents.AddAsync(entity, cancellationToken);
        }
        else
        {
            entity.Update(request.Title, request.Body, request.LinkUrl, request.ImageUrl, request.SeoTitle, request.SeoDescription, request.IsPublished);
        }
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteContentAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.StoreContents.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Content '{id}' was not found.");
        db.StoreContents.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContactMessageDto>> MessagesAsync(ContactMessageStatus? status, CancellationToken cancellationToken)
    {
        var query = db.ContactMessages.AsNoTracking().OrderByDescending(x => x.CreatedAt).AsQueryable();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value).OrderByDescending(x => x.CreatedAt);
        return (await query.ToListAsync(cancellationToken)).Select(MapMessage).ToList();
    }

    public async Task<ContactMessageDto> ChangeMessageStatusAsync(Guid id, ContactMessageStatus status, CancellationToken cancellationToken)
    {
        var entity = await db.ContactMessages.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Message '{id}' was not found.");
        entity.ChangeStatus(status);
        await db.SaveChangesAsync(cancellationToken);
        return new(entity.Id, entity.Name, entity.Phone, entity.Email, entity.Topic, entity.Body, entity.Status, entity.CreatedAt);
    }

    public async Task<ContactMessageDto> CreateMessageAsync(ContactMessageWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = new ContactMessage(request.Name, request.Phone, request.Email, request.Topic, request.Body);
        await db.ContactMessages.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new(entity.Id, entity.Name, entity.Phone, entity.Email, entity.Topic, entity.Body, entity.Status, entity.CreatedAt);
    }

    public async Task<CheckoutQuoteDto> QuoteAsync(CheckoutRequest request, CancellationToken cancellationToken)
    {
        var lines = await ResolveLines(request.Items, cancellationToken);
        var subtotal = lines.Sum(x => x.UnitPrice * x.Quantity);
        var promotions = await db.Promotions.AsNoTracking().Where(x => x.IsActive).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var matchingPromotions = promotions.Where(x => x.Applies(request.CouponCode, subtotal, now)).ToList();
        var discount = matchingPromotions.Select(x => x.Calculate(subtotal)).DefaultIfEmpty(0).Max();

        var rules = await db.ShippingRules.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Priority).ToListAsync(cancellationToken);
        var rule = rules.FirstOrDefault(x => x.Matches(request.Province, request.City));
        var shipping = rule?.Calculate(subtotal) ?? 0;

        return new(
            subtotal,
            discount,
            shipping,
            subtotal - discount + shipping,
            lines.Select(x => new CheckoutQuoteItemDto(x.ProductId, x.VariantId, x.ProductName, x.Sku, x.UnitPrice, x.Quantity, x.AvailableQuantity)).ToList(),
            DateTime.UtcNow.AddHours(24));
    }

    public async Task<CreatedOrderDto> CreateOrderAsync(CheckoutRequest request, string? idempotencyKey, Guid? userId, string? verifiedPhone, CancellationToken cancellationToken)
    {
        ValidateCheckoutDetails(request);

        if (string.IsNullOrWhiteSpace(idempotencyKey) || !Guid.TryParse(idempotencyKey, out _))
            throw new DomainException("A valid UUID Idempotency-Key header is required for order creation.");

        var cleanIdempotencyKey = idempotencyKey.Trim().ToLowerInvariant();
        var requestFingerprint = CalculateRequestFingerprint(request);

        IDbContextTransaction? transaction = null;
        try
        {
            // Check if an order with this idempotency key already exists
            var existingOrder = await db.Orders.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == cleanIdempotencyKey, cancellationToken);
            if (existingOrder is not null)
            {
                if (existingOrder.RequestFingerprint == requestFingerprint)
                {
                    return new CreatedOrderDto(existingOrder.Id, existingOrder.Number, existingOrder.Total, existingOrder.ReservationExpiresAtUtc);
                }
                throw new ConflictException("The provided Idempotency-Key was already used with different order details.");
            }

            transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

            var lines = await ResolveLines(request.Items, cancellationToken);
        var subtotal = lines.Sum(x => x.UnitPrice * x.Quantity);

        // Resolve promotion inside transaction with lock/tracking
        Promotion? appliedPromo = null;
        decimal discount = 0;
        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            var promotions = await db.Promotions.Where(x => x.IsActive).ToListAsync(cancellationToken);
            var now = DateTime.UtcNow;
            appliedPromo = promotions.FirstOrDefault(x => x.Applies(request.CouponCode, subtotal, now));
            if (appliedPromo is not null)
            {
                discount = appliedPromo.Calculate(subtotal);
                appliedPromo.IncrementUsage();
            }
        }

        var rules = await db.ShippingRules.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Priority).ToListAsync(cancellationToken);
        var rule = rules.FirstOrDefault(x => x.Matches(request.Province, request.City));
        var shipping = rule?.Calculate(subtotal) ?? 0;

        foreach (var line in lines)
        {
            if (line.Quantity > line.Variant.AvailableQuantity)
                throw new ConflictException($"Product variant '{line.ProductName}' is no longer available in the requested quantity.");

            line.Variant.Reserve(line.Quantity);
            var product = await db.Products.SingleOrDefaultAsync(x => x.Id == line.ProductId, cancellationToken);
            product?.AdjustStock(-line.Quantity);
        }

        var normalized = IranianPhoneNumber.Normalize(request.Phone);
        if (userId.HasValue && (string.IsNullOrWhiteSpace(verifiedPhone) || IranianPhoneNumber.Normalize(verifiedPhone) != normalized))
            throw new ConflictException("The checkout mobile number must match the verified account mobile number.");

        var cleanEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        var customer = await db.Customers.SingleOrDefaultAsync(x => x.NormalizedPhone == normalized, cancellationToken);
        if (customer is null)
        {
            customer = new Customer(request.FullName, request.Phone, cleanEmail);
            await db.Customers.AddAsync(customer, cancellationToken);
        }
        else
        {
            customer.RefreshProfile(request.FullName, request.Phone, cleanEmail ?? customer.Email);
        }

        // Check if an existing ApplicationUser already exists for this phone or was provided
        var existingUser = await db.Users.SingleOrDefaultAsync(x => x.PhoneNumber == normalized || x.UserName == $"customer-{normalized}", cancellationToken);
        var resolvedUserId = userId ?? existingUser?.Id;

        if (resolvedUserId.HasValue)
        {
            customer.AttachToUser(resolvedUserId.Value);
        }

        var orderNumber = GenerateOrderNumber();
        var order = new Order(
            orderNumber,
            customer,
            request.Province,
            request.City,
            request.Address,
            request.PostalCode,
            subtotal,
            discount,
            shipping,
            DateTime.UtcNow.AddHours(24),
            null,
            request.CustomerNotes);

        order.SetIdempotency(cleanIdempotencyKey, requestFingerprint);
        if (resolvedUserId.HasValue)
        {
            order.AttachToUser(resolvedUserId.Value);

            var hasAddress = await db.CustomerAddresses.AnyAsync(x => x.UserId == resolvedUserId.Value, cancellationToken);
            if (!hasAddress)
            {
                var userPhone = IranianPhoneNumber.ToLocalDisplay(existingUser?.PhoneNumber ?? verifiedPhone ?? request.Phone);
                var defaultAddress = new CustomerAddress(
                    resolvedUserId.Value,
                    "آدرس پیش‌فرض",
                    request.FullName,
                    userPhone,
                    request.Province,
                    request.City,
                    request.Address,
                    request.PostalCode,
                    isDefault: true);
                await db.CustomerAddresses.AddAsync(defaultAddress, cancellationToken);
            }
        }

        foreach (var line in lines)
        {
            order.AddItem(new OrderItem(line.ProductId, line.VariantId, line.ProductName, line.Sku, line.UnitPrice, line.Quantity));
        }

        customer.AddOrder(order.Total);
        await db.Orders.AddAsync(order, cancellationToken);

        var matchingCartSessions = await db.CartSessions
            .Where(x => !x.IsRecovered && (x.Phone == normalized || (resolvedUserId.HasValue && x.UserId == resolvedUserId.Value)))
            .ToListAsync(cancellationToken);
        foreach (var s in matchingCartSessions) s.MarkRecovered();

        await db.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

            if (telegramBotService is not null)
            {
                var notificationDto = new OrderNotificationDto(
                    order.Id,
                    order.Number,
                    order.FullNameSnapshot,
                    order.PhoneSnapshot,
                    order.EmailSnapshot,
                    order.Province,
                    order.City,
                    order.Address,
                    order.PostalCode,
                    order.CustomerNotes,
                    order.Subtotal,
                    order.DiscountTotal,
                    order.ShippingTotal,
                    order.Total,
                    lines.Select(l => new OrderNotificationItemDto(
                        l.ProductId,
                        l.VariantId,
                        l.ProductName,
                        l.Sku,
                        l.Variant.Title,
                        l.Variant.Color,
                        l.Variant.TableCapacity > 0 ? l.Variant.TableCapacity : l.Product.TableCapacity,
                        l.Variant.Length > 0 ? l.Variant.Length : l.Product.Length,
                        l.Variant.Width > 0 ? l.Variant.Width : l.Product.Width,
                        l.Product.FabricType,
                        l.Product.LiningType,
                        l.Product.Pattern,
                        l.UnitPrice,
                        l.Quantity
                    )).ToList(),
                    order.CreatedAt
                );

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await telegramBotService.NotifyNewOrderAsync(notificationDto, CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        logger?.LogError(ex, "Background Telegram notification failed for order {OrderNumber}", order.Number);
                    }
                });
            }

            return new CreatedOrderDto(order.Id, order.Number, order.Total, order.ReservationExpiresAtUtc);
        }
        catch (DbUpdateConcurrencyException)
        {
            if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
            throw new ConflictException("Product variant is no longer available in the requested quantity.");
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("IX_Orders_IdempotencyKey", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
            var concurrentOrder = await db.Orders.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == cleanIdempotencyKey, cancellationToken);
            if (concurrentOrder is not null && concurrentOrder.RequestFingerprint == requestFingerprint)
            {
                return new CreatedOrderDto(concurrentOrder.Id, concurrentOrder.Number, concurrentOrder.Total, concurrentOrder.ReservationExpiresAtUtc);
            }
            throw new ConflictException("A conflict occurred with this idempotency key.");
        }
        catch (Exception ex)
        {
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(cancellationToken); } catch { /* Ignore rollback exception */ }
            }
            if (ex is DomainException or ValidationException or ConflictException)
            {
                throw;
            }
            throw new ConflictException($"A concurrency conflict occurred while placing the order: {ex.Message}");
        }
        finally
        {
            if (transaction is not null)
            {
                await transaction.DisposeAsync();
            }
        }
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
        await db.ProductVariants.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
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
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteVariantAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Variant '{id}' was not found.");
        entity.Update(entity.Title, entity.Sku, entity.Color, entity.TableCapacity, entity.Length, entity.Width, entity.Price, entity.CompareAtPrice, entity.LowStockThreshold, false);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProductMediaDto>> MediaAsync(Guid productId, CancellationToken cancellationToken) =>
        (await db.ProductMedia.AsNoTracking().Where(x => x.ProductId == productId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken)).Select(Map).ToList();

    public async Task<ProductMediaDto> AddMediaAsync(Guid productId, ProductMediaWriteRequest request, CancellationToken cancellationToken)
    {
        if (!await db.Products.AnyAsync(x => x.Id == productId, cancellationToken)) throw new NotFoundException($"Product '{productId}' was not found.");
        var entity = new ProductMedia(productId, request.PublicUrl, request.AltText, request.Kind, request.SortOrder, request.IsPrimary);
        if (request.IsPrimary) await db.ProductMedia.Where(x => x.ProductId == productId).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsPrimary, false), cancellationToken);
        await db.ProductMedia.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<ProductMediaDto> UpdateMediaAsync(Guid id, ProductMediaWriteRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.ProductMedia.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Media '{id}' was not found.");
        if (request.IsPrimary) await db.ProductMedia.Where(x => x.ProductId == entity.ProductId && x.Id != id).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsPrimary, false), cancellationToken);
        entity.Update(request.PublicUrl, request.AltText, request.Kind, request.SortOrder, request.IsPrimary);
        await db.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task DeleteMediaAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.ProductMedia.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw new NotFoundException($"Media '{id}' was not found.");
        db.ProductMedia.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<CheckoutLine>> ResolveLines(IReadOnlyList<CheckoutItemRequest> requests, CancellationToken cancellationToken)
    {
        if (requests.Count == 0) throw new DomainException("At least one product is required.");
        var result = new List<CheckoutLine>();
        foreach (var request in requests)
        {
            if (request.Quantity <= 0 || request.Quantity > 100) throw new DomainException("Product quantity is invalid.");
            var product = await db.Products.Include(x => x.Variants).SingleOrDefaultAsync(x => x.Id == request.ProductId && x.IsActive, cancellationToken)
                ?? throw new NotFoundException("Product was not found.");
            var variant = request.VariantId.HasValue
                ? product.Variants.SingleOrDefault(x => x.Id == request.VariantId.Value && x.IsActive)
                : product.Variants.FirstOrDefault(x => x.IsActive);
            if (variant is null) throw new NotFoundException("Product variant was not found.");
            if (request.Quantity > variant.AvailableQuantity) throw new ConflictException($"Only {variant.AvailableQuantity} items of '{product.Name}' are available.");
            result.Add(new CheckoutLine(product.Id, variant.Id, product.Name, variant.Sku, variant.Price, request.Quantity, variant.AvailableQuantity, variant, product));
        }
        return result;
    }

    private sealed record CheckoutLine(Guid ProductId, Guid? VariantId, string ProductName, string Sku, decimal UnitPrice, int Quantity, int AvailableQuantity, ProductVariant Variant, Product Product);

    private static string CalculateRequestFingerprint(CheckoutRequest request)
    {
        var normalized = new
        {
            items = request.Items.OrderBy(i => i.ProductId).ThenBy(i => i.VariantId).Select(i => new { i.ProductId, i.VariantId, i.Quantity }).ToList(),
            phone = IranianPhoneNumber.Normalize(request.Phone),
            email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant(),
            fullName = request.FullName.Trim(),
            province = request.Province.Trim(),
            city = request.City.Trim(),
            address = request.Address.Trim(),
            postalCode = new string(request.PostalCode.Select(IranianPhoneNumber.ToEnglishDigit).Where(char.IsDigit).ToArray()),
            couponCode = request.CouponCode?.Trim().ToUpperInvariant()
        };
        var json = JsonSerializer.Serialize(normalized);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }

    private static string GenerateOrderNumber()
    {
        var randomSuffix = RandomNumberGenerator.GetInt32(100000, 999999);
        return $"TRM-{DateTime.UtcNow:yyyyMMdd}-{randomSuffix}";
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static void ValidateCheckoutDetails(CheckoutRequest request)
    {
        if (request.FullName.Trim().Length is < 3 or > 200) throw new DomainException("A valid full name is required.");
        _ = IranianPhoneNumber.Normalize(request.Phone);
        if (request.Province.Trim().Length is < 2 or > 120) throw new DomainException("A valid province is required.");
        if (request.City.Trim().Length is < 2 or > 120) throw new DomainException("A valid city is required.");
        if (request.Address.Trim().Length is < 10 or > 1000) throw new DomainException("A complete address is required.");
        var postalCode = new string(request.PostalCode.Select(value => value switch { >= '\u06F0' and <= '\u06F9' => (char)('0' + value - '\u06F0'), >= '\u0660' and <= '\u0669' => (char)('0' + value - '\u0660'), _ => value }).ToArray());
        if (postalCode.Length != 10 || postalCode.Any(value => !char.IsDigit(value))) throw new DomainException("A valid ten-digit postal code is required.");
    }

    private async Task<IReadOnlyList<AdminOrderDto>> MapOrdersAsync(List<Order> orders, CancellationToken cancellationToken)
    {
        var variantIds = orders.SelectMany(o => o.Items).Select(i => i.VariantId).Where(v => v.HasValue).Select(v => v!.Value).Distinct().ToList();
        var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
        var variants = variantIds.Count == 0 ? new Dictionary<Guid, ProductVariant>() : await db.ProductVariants.AsNoTracking().Where(x => variantIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        var products = productIds.Count == 0 ? new Dictionary<Guid, Product>() : await db.Products.AsNoTracking().Where(x => productIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);

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

            result.Add(new AdminOrderDto(x.Id, x.Number, x.FullNameSnapshot, x.PhoneSnapshot, x.Status, x.Total, x.CreatedAt, x.ReservationExpiresAtUtc, x.Province, x.City, x.Address, x.PostalCode, x.CustomerNotes, x.PostalTrackingCode, items));
        }
        return result;
    }

    private static PromotionDto Map(Promotion x) => new(x.Id, x.Name, x.Code, x.Type, x.DiscountType, x.Value, x.MinimumSubtotal, x.MaximumDiscount, x.UsageLimit, x.UsageCount, x.StartsAtUtc, x.EndsAtUtc, x.IsActive);
    private static ShippingRuleDto Map(ShippingRule x) => new(x.Id, x.Name, x.Province, x.City, x.Cost, x.FreeAboveSubtotal, x.Priority, x.IsActive);
    private static StoreContentDto Map(StoreContent x) => new(x.Id, x.PageKey, x.SectionKey, x.Title, x.Body, x.LinkUrl, x.ImageUrl, x.SeoTitle, x.SeoDescription, x.IsPublished);
    private static ContactMessageDto MapMessage(ContactMessage x) => new(x.Id, x.Name, x.Phone, x.Email, x.Topic, x.Body, x.Status, x.CreatedAt);
    private static ProductVariantDto Map(ProductVariant x) => new(x.Id, x.ProductId, x.Title, x.Sku, x.Color, x.TableCapacity, x.Length, x.Width, x.Price, x.CompareAtPrice, x.StockQuantity, x.ReservedQuantity, x.AvailableQuantity, x.LowStockThreshold, x.IsActive);
    private static ProductMediaDto Map(ProductMedia x) => new(x.Id, x.ProductId, x.PublicUrl, x.AltText, x.Kind, x.SortOrder, x.IsPrimary);
}
