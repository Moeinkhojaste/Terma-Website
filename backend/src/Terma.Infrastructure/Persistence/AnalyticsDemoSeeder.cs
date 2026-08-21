using Microsoft.EntityFrameworkCore;
using Terma.Domain.Common;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence;

public sealed class AnalyticsDemoSeeder(TermaDbContext db)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.Orders.AnyAsync(ct)) return;

        var products = await db.Products.Include(p => p.Variants).ToListAsync(ct);
        if (products.Count == 0) return;

        var now = DateTime.UtcNow;

        // 1. Seed Demo Customers
        var c1 = new Customer("رضا محمدی", "09121112233", "reza.mohammadi@example.com");
        var c2 = new Customer("مریم ابراهیمی", "09122223344", "maryam.ebrahimi@example.com");
        var c3 = new Customer("سعید حسینی", "09123334455", "saeed.hosseini@example.com");
        var c4 = new Customer("فاطمه رضایی", "09124445566", "fatemeh.rezaei@example.com");
        var c5 = new Customer("علی کمالی", "09125556677", "ali.kamali@example.com");
        var c6 = new Customer("زهرا رستمی", "09126667788", "zahra.rostami@example.com");

        await db.Customers.AddRangeAsync([c1, c2, c3, c4, c5, c6], ct);
        await db.SaveChangesAsync(ct);

        // 2. Seed Realistic Orders Across 30 Days and 1 Year
        var orderList = new List<Order>();

        void AddOrder(
            Customer customer,
            DateTime orderDate,
            OrderStatus status,
            List<(Product product, int quantity)> itemsList)
        {
            var number = $"TRM-{now:yyMM}-{Random.Shared.Next(1000, 9999)}";
            var subtotal = itemsList.Sum(i => i.product.Price * i.quantity);

            var order = new Order(
                number,
                customer,
                "تهران",
                "تهران",
                "خیابان ولیعصر، کوچه بهار، پلاک ۱۲",
                "1912345678",
                subtotal,
                0,
                50_000,
                orderDate.AddDays(1),
                null,
                "ارسال در ساعات عصر"
            );

            typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))?.SetValue(order, orderDate);
            order.ChangeStatus(status);

            foreach (var (prod, qty) in itemsList)
            {
                var variant = prod.Variants.FirstOrDefault();
                order.AddItem(new OrderItem(
                    prod.Id,
                    variant?.Id,
                    prod.Name,
                    variant?.Sku ?? prod.Sku,
                    prod.Price,
                    qty
                ));
            }

            orderList.Add(order);
            if (status != OrderStatus.Cancelled && status != OrderStatus.Expired)
            {
                customer.AddOrder(order.Total);
            }
        }

        var p1 = products[0];
        var p2 = products.Count > 1 ? products[1] : products[0];
        var p3 = products.Count > 2 ? products[2] : products[0];

        // 30 days orders
        AddOrder(c1, now.AddDays(-2), OrderStatus.Delivered, [(p1, 2), (p2, 1)]);
        AddOrder(c1, now.AddDays(-8), OrderStatus.Delivered, [(p1, 1), (p3, 2)]);
        AddOrder(c2, now.AddDays(-5), OrderStatus.Preparing, [(p2, 2)]);
        AddOrder(c3, now.AddDays(-12), OrderStatus.Delivered, [(p1, 1)]);
        AddOrder(c4, now.AddDays(-18), OrderStatus.Delivered, [(p3, 1), (p2, 1)]);
        AddOrder(c5, now.AddDays(-24), OrderStatus.Delivered, [(p1, 1)]);
        AddOrder(c6, now.AddDays(-28), OrderStatus.Delivered, [(p2, 1)]);
        AddOrder(c2, now.AddDays(-3), OrderStatus.PendingConfirmation, [(p3, 1)]);
        AddOrder(c3, now.AddDays(-15), OrderStatus.Expired, [(p1, 1), (p2, 1)]);

        // Older orders within 1 year
        AddOrder(c1, now.AddMonths(-2), OrderStatus.Delivered, [(p1, 2), (p2, 2)]);
        AddOrder(c1, now.AddMonths(-4), OrderStatus.Delivered, [(p1, 1), (p3, 1)]);
        AddOrder(c1, now.AddMonths(-6), OrderStatus.Delivered, [(p2, 2)]);
        AddOrder(c2, now.AddMonths(-3), OrderStatus.Delivered, [(p1, 2)]);
        AddOrder(c2, now.AddMonths(-5), OrderStatus.Delivered, [(p3, 1), (p2, 1)]);
        AddOrder(c3, now.AddMonths(-4), OrderStatus.Delivered, [(p1, 1), (p2, 1)]);
        AddOrder(c4, now.AddMonths(-7), OrderStatus.Delivered, [(p2, 1)]);

        await db.Orders.AddRangeAsync(orderList, ct);

        // 3. Seed Realistic Product Views
        var viewsList = new List<ProductView>();
        for (int day = 0; day < 30; day++)
        {
            var date = now.AddDays(-day);
            // p1 views (popular)
            for (int v = 0; v < 5 + (day % 3); v++)
            {
                viewsList.Add(new ProductView(p1.Id, $"vis_{Guid.NewGuid():N}"[..16], date.AddHours(-v)));
            }
            // p2 views
            for (int v = 0; v < 3 + (day % 2); v++)
            {
                viewsList.Add(new ProductView(p2.Id, $"vis_{Guid.NewGuid():N}"[..16], date.AddHours(-v)));
            }
            // p3 views
            for (int v = 0; v < 2 + (day % 2); v++)
            {
                viewsList.Add(new ProductView(p3.Id, $"vis_{Guid.NewGuid():N}"[..16], date.AddHours(-v)));
            }
        }
        await db.ProductViews.AddRangeAsync(viewsList, ct);

        // 4. Seed Realistic Abandoned Cart Sessions
        var cart1 = new CartSession(
            $"cs_cart_{Guid.NewGuid():N}"[..16],
            System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new { productId = p1.Id, productName = p1.Name, sku = p1.Sku, unitPrice = p1.Price, quantity = 2 }
            }),
            2,
            p1.Price * 2,
            null,
            null,
            "سارا احمدی",
            "09128887766",
            "sara.ahmadi@example.com"
        );
        typeof(CartSession).GetProperty(nameof(CartSession.LastActivityAtUtc))?.SetValue(cart1, now.AddHours(-2));

        var cart2 = new CartSession(
            $"cs_cart_{Guid.NewGuid():N}"[..16],
            System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new { productId = p2.Id, productName = p2.Name, sku = p2.Sku, unitPrice = p2.Price, quantity = 1 },
                new { productId = p3.Id, productName = p3.Name, sku = p3.Sku, unitPrice = p3.Price, quantity = 1 }
            }),
            2,
            p2.Price + p3.Price,
            null,
            null,
            "نیما کریمی",
            "09127776655",
            null
        );
        typeof(CartSession).GetProperty(nameof(CartSession.LastActivityAtUtc))?.SetValue(cart2, now.AddDays(-1));

        await db.CartSessions.AddRangeAsync([cart1, cart2], ct);
        await db.SaveChangesAsync(ct);
    }
}
