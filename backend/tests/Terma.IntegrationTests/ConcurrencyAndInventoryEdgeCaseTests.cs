using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class ConcurrencyAndInventoryEdgeCaseTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task Checkout_WithInsufficientStock_ReturnsBadRequest()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"StockCat {Guid.NewGuid():N}" });
        var cat = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;

        // Product with only 1 in stock
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "Low Stock Product",
            Sku = $"LOW-{Guid.NewGuid():N}",
            Description = "desc",
            Price = 2000,
            StockQuantity = 1,
            TableCapacity = 4,
            Length = 100,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ساتن",
            Color = "قرمز",
            Pattern = "ترنج",
            CategoryId = cat.Id
        });
        var prod = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        // Attempt to checkout 2 items when only 1 is available
        var request = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(prod.Id, null, 2)],
            FullName = "خریدار تستی",
            Phone = "09121234567",
            Province = "تهران",
            City = "تهران",
            Address = "خیابان انقلاب، روبروی دانشگاه تهران، پلاک ۱۰۰",
            PostalCode = "1417812345"
        };

        var response = await client.PostAsJsonAsync("/api/orders", request);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task OrderCancellation_RestoresAvailableInventory()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"CancelCat {Guid.NewGuid():N}" });
        var cat = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;

        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "Cancel Test Product",
            Sku = $"CNC-{Guid.NewGuid():N}",
            Description = "desc",
            Price = 1500,
            StockQuantity = 3,
            TableCapacity = 6,
            Length = 150,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ساتن",
            Color = "آبی",
            Pattern = "بته جقه",
            CategoryId = cat.Id
        });
        var prod = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        // Guest places order for 2 items
        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRes = await guest.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(prod.Id, null, 2)],
            FullName = "مشتری لغو",
            Phone = "09121234567",
            Province = "یزد",
            City = "یزد",
            Address = "خیابان کاشانی، پلاک ۵",
            PostalCode = "8916712345"
        });
        orderRes.EnsureSuccessStatusCode();
        var order = (await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // Check reserved inventory = 2, available = 1
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
            var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.ProductVariants, x => x.ProductId == prod.Id);
            Assert.Equal(3, variant.StockQuantity);
            Assert.Equal(2, variant.ReservedQuantity);
            Assert.Equal(1, variant.AvailableQuantity);
        }

        // Admin cancels order
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var cancelRes = await admin.PutAsJsonAsync($"/api/admin/orders/{order.Id}/status", new { status = "Cancelled" });
        cancelRes.EnsureSuccessStatusCode();

        // Verify reserved quantity is released (reserved = 0, available = 3)
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
            var variant = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.ProductVariants, x => x.ProductId == prod.Id);
            Assert.Equal(3, variant.StockQuantity);
            Assert.Equal(0, variant.ReservedQuantity);
            Assert.Equal(3, variant.AvailableQuantity);
        }
    }
}
