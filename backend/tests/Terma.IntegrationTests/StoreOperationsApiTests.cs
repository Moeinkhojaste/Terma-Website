using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.IntegrationTests;

public sealed class StoreOperationsApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task AdminDashboard_RequiresAdminAndReturnsStats()
    {
        using var anonymous = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/dashboard")).StatusCode);
        using var admin = await factory.CreateAdminClientAsync();
        var response = await admin.GetAsync("/api/admin/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(await response.Content.ReadFromJsonAsync<DashboardDto>());
    }

    [Fact]
    public async Task StoreContent_IsPublicAndMessagesRequireAntiforgery()
    {
        using var client = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/store/content?page=home")).StatusCode);
        var response = await client.PostAsJsonAsync("/api/store/messages", new ContactMessageWriteRequest { Name = "Test", Phone = "09121234567", Topic = "Question", Body = "A sufficiently long message." });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GuestCheckout_CreatesOrderAndCanBeReadByAdmin()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Checkout product", Sku = $"CHECK-{Guid.NewGuid():N}", Description = "test", Price = 1000, StockQuantity = 3, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;
        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var request = new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "Guest Buyer", Phone = "09121234567", Province = "Tehran", City = "Tehran", Address = "A sufficiently long address", PostalCode = "1234567890" };
        var created = await guest.PostAsJsonAsync("/api/orders", request);
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var order = await created.Content.ReadFromJsonAsync<CreatedOrderDto>();
        Assert.NotNull(order);
        var orders = await admin.GetFromJsonAsync<List<AdminOrderDto>>("/api/admin/orders");
        Assert.Contains(orders!, x => x.Number == order!.Number);

        var updatedProduct = await admin.GetFromJsonAsync<ProductDto>($"/api/admin/products/{product.Id}");
        Assert.NotNull(updatedProduct);
        Assert.Equal(2, updatedProduct.StockQuantity);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.TermaDbContext>();
            var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.ProductVariants, x => x.ProductId == product.Id);
            Assert.Equal(3, variant.StockQuantity);
            Assert.Equal(1, variant.ReservedQuantity);
            Assert.Equal(2, variant.AvailableQuantity);
        }
    }

    [Fact]
    public async Task ChangeOrderStatus_UpdatesOrderStatusSuccessfully()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Status product", Sku = $"STATUS-{Guid.NewGuid():N}", Description = "test", Price = 1000, StockQuantity = 5, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;
        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var request = new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "Status Buyer", Phone = "09121234567", Province = "Tehran", City = "Tehran", Address = "A sufficiently long address", PostalCode = "1234567890" };
        var created = await guest.PostAsJsonAsync("/api/orders", request);
        var order = (await created.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        var updateResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Confirmed" });
        var content = await updateResponse.Content.ReadAsStringAsync();
        Assert.True(updateResponse.IsSuccessStatusCode, content);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedOrder = await updateResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(updatedOrder);
        Assert.Equal(OrderStatus.Confirmed, updatedOrder.Status);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.TermaDbContext>();
            var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.ProductVariants, x => x.ProductId == product.Id);
            Assert.Equal(4, variant.StockQuantity);
            Assert.Equal(0, variant.ReservedQuantity);
            Assert.Equal(4, variant.AvailableQuantity);
        }
    }

    [Fact]
    public async Task ChangeOrderStatus_FromExpiredToConfirmedAndDelivered_UpdatesSuccessfully()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Expired product", Sku = $"EXP-{Guid.NewGuid():N}", Description = "test", Price = 1000, StockQuantity = 5, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;
        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var request = new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "Expired Buyer", Phone = "09121234567", Province = "Tehran", City = "Tehran", Address = "A sufficiently long address", PostalCode = "1234567890" };
        var created = await guest.PostAsJsonAsync("/api/orders", request);
        var order = (await created.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // 1. Change status to Expired
        var expireResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Expired" });
        Assert.True(expireResponse.IsSuccessStatusCode);
        var expiredOrder = await expireResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(expiredOrder);
        Assert.Equal(OrderStatus.Expired, expiredOrder.Status);

        // 2. Change status from Expired back to Confirmed
        var confirmResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Confirmed" });
        Assert.True(confirmResponse.IsSuccessStatusCode);
        var confirmedOrder = await confirmResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(confirmedOrder);
        Assert.Equal(OrderStatus.Confirmed, confirmedOrder.Status);

        // 3. Change status from Confirmed to Shipped
        var shippedResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Shipped" });
        Assert.True(shippedResponse.IsSuccessStatusCode);
        var shippedOrder = await shippedResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(shippedOrder);
        Assert.Equal(OrderStatus.Shipped, shippedOrder.Status);

        // 4. Change status from Shipped to Delivered
        var deliveredResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Delivered" });
        Assert.True(deliveredResponse.IsSuccessStatusCode);
        var deliveredOrder = await deliveredResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(deliveredOrder);
        Assert.Equal(OrderStatus.Delivered, deliveredOrder.Status);

        // 5. Attempting to transition from terminal state Delivered back to Shipped must be rejected with 400 BadRequest
        var invalidResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Shipped" });
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
    }

    [Fact]
    public async Task TelegramWebhook_ProcessesUpdateSuccessfully()
    {
        using var client = factory.CreateHttpsClient();
        var options = factory.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Terma.Infrastructure.Telegram.TelegramOptions>>().Value;

        var update = new
        {
            update_id = 9999,
            message = new
            {
                message_id = 1,
                chat = new { id = 12345, type = "private" },
                from = new { id = 12345, is_bot = false, first_name = "Admin" },
                date = 1700000000,
                text = "/help"
            }
        };

        if (!string.IsNullOrWhiteSpace(options.WebhookSecret))
        {
            var unauthorizedResponse = await client.PostAsJsonAsync("/api/telegram/webhook", update);
            Assert.Equal(HttpStatusCode.Unauthorized, unauthorizedResponse.StatusCode);

            client.DefaultRequestHeaders.Add("X-Telegram-Bot-Api-Secret-Token", options.WebhookSecret);
        }

        var response = await client.PostAsJsonAsync("/api/telegram/webhook", update);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReservationExpiration_WhenReservationExpires_ReleasesInventoryAndTransitionsToExpired()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "Expire Test Product",
            Sku = $"EXP-{Guid.NewGuid():N}",
            Description = "test",
            Price = 2000,
            StockQuantity = 5,
            TableCapacity = 4,
            Length = 100,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ساتن",
            Color = "قرمز",
            Pattern = "ترنج",
            CategoryId = category.Id
        });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        // 1. Guest places order for 2 items -> reserved = 2, available = 3
        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRes = await guest.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 2)],
            FullName = "مشتری انقضا",
            Phone = "09121234567",
            Province = "تهران",
            City = "تهران",
            Address = "خیابان آزادی، کوچه پنجم",
            PostalCode = "1234567890"
        });
        orderRes.EnsureSuccessStatusCode();
        var createdOrder = (await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // 2. Set ReservationExpiresAtUtc to 1 hour in the past
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.TermaDbContext>();
            var orderEntity = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.Orders, x => x.Id == createdOrder.Id);
            db.Entry(orderEntity).Property(x => x.ReservationExpiresAtUtc).CurrentValue = DateTime.UtcNow.AddHours(-1);
            await db.SaveChangesAsync();
        }

        // 3. Trigger a sweep of the reservation expiration logic
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.TermaDbContext>();
            var now = DateTime.UtcNow;
            var expiredOrders = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include(
                    db.Orders.Where(x => x.Status == OrderStatus.PendingConfirmation && x.ReservationExpiresAtUtc <= now),
                    x => x.Items));

            foreach (var order in expiredOrders)
            {
                foreach (var item in order.Items.Where(x => x.VariantId.HasValue))
                {
                    var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleOrDefaultAsync(db.ProductVariants, x => x.Id == item.VariantId);
                    variant?.ReleaseReservation(item.Quantity);
                    var prod = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleOrDefaultAsync(db.Products, x => x.Id == item.ProductId);
                    prod?.AdjustStock(item.Quantity);
                }
                order.ChangeStatus(OrderStatus.Expired);
            }
            if (expiredOrders.Count > 0) await db.SaveChangesAsync();
        }

        // 4. Verify order is Expired and reserved stock is fully released (reserved = 0, available = 5)
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.TermaDbContext>();
            var orderEntity = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.Orders, x => x.Id == createdOrder.Id);
            Assert.Equal(OrderStatus.Expired, orderEntity.Status);

            var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.ProductVariants, x => x.ProductId == product.Id);
            Assert.Equal(5, variant.StockQuantity);
            Assert.Equal(0, variant.ReservedQuantity);
            Assert.Equal(5, variant.AvailableQuantity);
        }
    }

    [Fact]
    public async Task CreateOrder_Should_Set_Reservation_Expiry_To_15_Minutes()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "تست رزرو ۱۵ دقیقه‌ای",
            Sku = $"EXP15-{Guid.NewGuid():N}"[..12],
            Description = "تست زمان انقضای رزرو",
            Price = 1_000_000,
            StockQuantity = 3,
            TableCapacity = 6,
            Length = 100,
            Width = 100,
            FabricType = "ابریشم",
            LiningType = "ساتن",
            Color = "آبی",
            Pattern = "ترنج",
            CategoryId = category.Id
        });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRes = await guest.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "مشتری تست",
            Phone = "09121112233",
            Province = "یزد",
            City = "یزد",
            Address = "میدان امیرچخماق",
            PostalCode = "1234567890"
        });
        orderRes.EnsureSuccessStatusCode();
        var createdOrder = (await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        var now = DateTime.UtcNow;
        var diff = createdOrder.ReservationExpiresAtUtc - now;
        Assert.True(diff <= TimeSpan.FromMinutes(15).Add(TimeSpan.FromSeconds(10)), $"Expiry was too large: {diff}");
        Assert.True(diff >= TimeSpan.FromMinutes(14), $"Expiry was too small: {diff}");
    }

    [Fact]
    public async Task ValidateCart_Should_Detect_OutOfStock_Deactivated_And_Quantity_Adjustments()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "ترمه شاه‌عباسی تست اعتبار",
            Sku = $"VAL-{Guid.NewGuid():N}"[..12],
            Description = "تست اعتبارسنجی سبد",
            Price = 2_000_000,
            StockQuantity = 1,
            TableCapacity = 6,
            Length = 100,
            Width = 100,
            FabricType = "ابریشم",
            LiningType = "ساتن",
            Color = "قرمز",
            Pattern = "شاه‌عباسی",
            CategoryId = category.Id
        });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var client = factory.CreateHttpsClient();

        // 1. Initial check: item is available (1 in stock)
        var valRes1 = await client.PostAsJsonAsync("/api/store/cart/validate", new ValidateCartRequest
        {
            Items = [new CartValidationItemRequest(product.Id, null, 1)]
        });
        valRes1.EnsureSuccessStatusCode();
        var result1 = (await valRes1.Content.ReadFromJsonAsync<ValidateCartResponseDto>())!;
        Assert.False(result1.HasChanges);
        Assert.Single(result1.Items);
        Assert.Equal("Available", result1.Items[0].Status);
        Assert.Equal(1, result1.Items[0].AvailableQuantity);

        // 2. Admin sets stock to 0 -> OutOfStock
        var updateRes = await admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", new UpdateProductRequest
        {
            Name = product.Name,
            Sku = product.Sku,
            Description = product.Description,
            Price = product.Price,
            StockQuantity = 0,
            TableCapacity = product.TableCapacity,
            Length = product.Length,
            Width = product.Width,
            FabricType = product.FabricType,
            LiningType = product.LiningType,
            Color = product.Color,
            Pattern = product.Pattern,
            CategoryId = product.CategoryId,
            IsActive = true
        });
        updateRes.EnsureSuccessStatusCode();

        var valRes2 = await client.PostAsJsonAsync("/api/store/cart/validate", new ValidateCartRequest
        {
            Items = [new CartValidationItemRequest(product.Id, null, 1)]
        });
        valRes2.EnsureSuccessStatusCode();
        var result2 = (await valRes2.Content.ReadFromJsonAsync<ValidateCartResponseDto>())!;
        Assert.True(result2.HasChanges);
        Assert.Single(result2.Items);
        Assert.Equal("OutOfStock", result2.Items[0].Status);
        Assert.Single(result2.Notifications);
        Assert.Contains("اتمام موجودی", result2.Notifications[0]);

        // 3. Admin deactivates product -> Inactive
        var deactRes = await admin.PutAsJsonAsync($"/api/admin/products/{product.Id}", new UpdateProductRequest
        {
            Name = product.Name,
            Sku = product.Sku,
            Description = product.Description,
            Price = product.Price,
            StockQuantity = 5,
            TableCapacity = product.TableCapacity,
            Length = product.Length,
            Width = product.Width,
            FabricType = product.FabricType,
            LiningType = product.LiningType,
            Color = product.Color,
            Pattern = product.Pattern,
            CategoryId = product.CategoryId,
            IsActive = false
        });
        deactRes.EnsureSuccessStatusCode();

        var valRes3 = await client.PostAsJsonAsync("/api/store/cart/validate", new ValidateCartRequest
        {
            Items = [new CartValidationItemRequest(product.Id, null, 1)]
        });
        valRes3.EnsureSuccessStatusCode();
        var result3 = (await valRes3.Content.ReadFromJsonAsync<ValidateCartResponseDto>())!;
        Assert.True(result3.HasChanges);
        Assert.Single(result3.Items);
        Assert.Equal("Inactive", result3.Items[0].Status);
        Assert.Single(result3.Notifications);
        Assert.Contains("حذف گردید", result3.Notifications[0]);
    }

    private static async Task<CategoryDto> CreateCategory(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"Checkout {Guid.NewGuid():N}" });
        return (await response.Content.ReadFromJsonAsync<CategoryDto>())!;
    }
}

