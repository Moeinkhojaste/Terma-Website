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

        // 3. Change status from Confirmed to Delivered
        var deliveredResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Delivered" });
        Assert.True(deliveredResponse.IsSuccessStatusCode);
        var deliveredOrder = await deliveredResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(deliveredOrder);
        Assert.Equal(OrderStatus.Delivered, deliveredOrder.Status);

        // 4. Change status from Delivered back to Shipped
        var shippedResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Shipped" });
        Assert.True(shippedResponse.IsSuccessStatusCode);
        var shippedOrder = await shippedResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(shippedOrder);
        Assert.Equal(OrderStatus.Shipped, shippedOrder.Status);
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

    private static async Task<CategoryDto> CreateCategory(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"Checkout {Guid.NewGuid():N}" });
        return (await response.Content.ReadFromJsonAsync<CategoryDto>())!;
    }
}
