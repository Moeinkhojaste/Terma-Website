using System.Net;
using System.Net.Http.Json;
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
        var productResponse = await admin.PostAsJsonAsync("/api/products", new CreateProductRequest { Name = "Checkout product", Sku = $"CHECK-{Guid.NewGuid():N}", Description = "test", Price = 1000, StockQuantity = 3, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;
        using var guest = factory.CreateHttpsClient();
        var request = new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "Guest Buyer", Phone = "09121234567", Province = "Tehran", City = "Tehran", Address = "A sufficiently long address", PostalCode = "1234567890" };
        var created = await guest.PostAsJsonAsync("/api/orders", request);
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var order = await created.Content.ReadFromJsonAsync<CreatedOrderDto>();
        Assert.NotNull(order);
        var orders = await admin.GetFromJsonAsync<List<AdminOrderDto>>("/api/admin/orders");
        Assert.Contains(orders!, x => x.Number == order!.Number);

        var updatedProduct = await admin.GetFromJsonAsync<ProductDto>($"/api/products/{product.Id}");
        Assert.NotNull(updatedProduct);
        Assert.Equal(2, updatedProduct.StockQuantity);
    }

    [Fact]
    public async Task ChangeOrderStatus_UpdatesOrderStatusSuccessfully()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategory(admin);
        var productResponse = await admin.PostAsJsonAsync("/api/products", new CreateProductRequest { Name = "Status product", Sku = $"STATUS-{Guid.NewGuid():N}", Description = "test", Price = 1000, StockQuantity = 5, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;
        using var guest = factory.CreateHttpsClient();
        var request = new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "Status Buyer", Phone = "09121234567", Province = "Tehran", City = "Tehran", Address = "Address info", PostalCode = "1234567890" };
        var created = await guest.PostAsJsonAsync("/api/orders", request);
        var order = (await created.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        var updateResponse = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Confirmed" });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedOrder = await updateResponse.Content.ReadFromJsonAsync<AdminOrderDto>();
        Assert.NotNull(updatedOrder);
        Assert.Equal(OrderStatus.Confirmed, updatedOrder.Status);
    }

    private static async Task<CategoryDto> CreateCategory(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest { Name = $"Checkout {Guid.NewGuid():N}" });
        return (await response.Content.ReadFromJsonAsync<CategoryDto>())!;
    }
}
