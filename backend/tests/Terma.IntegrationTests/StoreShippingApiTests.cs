using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class StoreShippingApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private static async Task<CategoryDto> CreateCategoryAsync(HttpClient admin)
    {
        var res = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest
        {
            Name = $"ShippingCat {Guid.NewGuid():N}"
        });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<CategoryDto>())!;
    }

    private static async Task<ProductDto> CreateProductAsync(HttpClient admin, Guid categoryId, decimal price = 200_000, int stock = 20)
    {
        var res = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "رومیزی ترمه سنتی",
            Sku = $"SHP-{Guid.NewGuid():N}"[..12],
            Description = "محصول آزمایشی ارسال",
            Price = price,
            StockQuantity = stock,
            TableCapacity = 6,
            Length = 100,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ابریشم",
            Color = "آبی",
            Pattern = "ترنج",
            CategoryId = categoryId
        });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ProductDto>())!;
    }

    [Fact]
    public async Task GetPublicShippingSettings_ReturnsDefaultSettings()
    {
        using var client = factory.CreateHttpsClient();
        var response = await client.GetAsync("/api/store/shipping");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var settings = await response.Content.ReadFromJsonAsync<PublicShippingSettingsDto>();
        Assert.NotNull(settings);
        Assert.True(settings.PishtazPrice >= 0);
        Assert.True(settings.IsPishtazEnabled);
        Assert.True(settings.IsTipaxEnabled);
    }

    [Fact]
    public async Task UpdateShippingSettings_AsAdmin_UpdatesPriceAndStatus()
    {
        using var admin = await factory.CreateAdminClientAsync();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);

        var updateRes = await admin.PutAsJsonAsync("/api/admin/settings/shipping", new UpdateShippingSettingsRequest(155_000, true, true));
        updateRes.EnsureSuccessStatusCode();

        var updated = await updateRes.Content.ReadFromJsonAsync<StoreSettingsDto>();
        Assert.NotNull(updated);
        Assert.Equal(155_000, updated.PishtazShippingPrice);

        using var publicClient = factory.CreateHttpsClient();
        var pubRes = await publicClient.GetAsync("/api/store/shipping");
        var pubSettings = await pubRes.Content.ReadFromJsonAsync<PublicShippingSettingsDto>();
        Assert.NotNull(pubSettings);
        Assert.Equal(155_000, pubSettings.PishtazPrice);

        // Revert back to 140,000 for standard tests
        var revertRes = await admin.PutAsJsonAsync("/api/admin/settings/shipping", new UpdateShippingSettingsRequest(140_000, true, true));
        revertRes.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task UpdateShippingSettings_NegativePrice_ReturnsBadRequest()
    {
        using var admin = await factory.CreateAdminClientAsync();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);

        var res = await admin.PutAsJsonAsync("/api/admin/settings/shipping", new UpdateShippingSettingsRequest(-10_000, true, true));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Quote_WithPishtaz_IncludesPostalFee()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 300_000);

        using var guest = factory.CreateHttpsClient();
        var quoteRes = await guest.PostAsJsonAsync("/api/checkout/quote", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            ShippingMethod = ShippingMethod.Pishtaz,
            Province = "یزد",
            City = "یزد"
        });
        quoteRes.EnsureSuccessStatusCode();
        var quote = await quoteRes.Content.ReadFromJsonAsync<CheckoutQuoteDto>();
        Assert.NotNull(quote);
        Assert.Equal(300_000, quote.Subtotal);
        Assert.Equal(140_000, quote.ShippingTotal);
        Assert.Equal(440_000, quote.Total);
        Assert.Equal(ShippingMethod.Pishtaz, quote.ShippingMethod);
    }

    [Fact]
    public async Task Quote_WithTipax_HasZeroOnlineShipping()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 300_000);

        using var guest = factory.CreateHttpsClient();
        var quoteRes = await guest.PostAsJsonAsync("/api/checkout/quote", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            ShippingMethod = ShippingMethod.Tipax,
            Province = "یزد",
            City = "یزد"
        });
        quoteRes.EnsureSuccessStatusCode();
        var quote = await quoteRes.Content.ReadFromJsonAsync<CheckoutQuoteDto>();
        Assert.NotNull(quote);
        Assert.Equal(300_000, quote.Subtotal);
        Assert.Equal(0, quote.ShippingTotal);
        Assert.Equal(300_000, quote.Total);
        Assert.Equal(ShippingMethod.Tipax, quote.ShippingMethod);
    }

    [Fact]
    public async Task CreateOrder_WithTipax_PersistsShippingMethodAndZeroShippingTotal()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 250_000, stock: 5);

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRequest = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "مشتری تیپاکس",
            Phone = "09131234567",
            Province = "اصفهان",
            City = "اصفهان",
            Address = "چهارباغ عباسی، مجتمع پارسیان",
            PostalCode = "8146512345",
            ShippingMethod = ShippingMethod.Tipax
        };

        var orderRes = await guest.PostAsJsonAsync("/api/orders", orderRequest);
        orderRes.EnsureSuccessStatusCode();
        var createdOrder = await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>();
        Assert.NotNull(createdOrder);
        Assert.Equal(250_000, createdOrder.Total);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var orderInDb = await db.Orders.SingleOrDefaultAsync(o => o.Id == createdOrder.Id);
        Assert.NotNull(orderInDb);
        Assert.Equal(ShippingMethod.Tipax, orderInDb.ShippingMethod);
        Assert.Equal(0, orderInDb.ShippingTotal);
        Assert.Equal(250_000, orderInDb.Total);
    }

    [Fact]
    public async Task CreateOrder_WithPishtaz_PersistsShippingMethodAndPostalFee()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 200_000, stock: 5);

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRequest = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "مشتری پیشتاز",
            Phone = "09139876543",
            Province = "فارس",
            City = "شیراز",
            Address = "خیابان زند، کوچه هفدهم",
            PostalCode = "7134512345",
            ShippingMethod = ShippingMethod.Pishtaz
        };

        var orderRes = await guest.PostAsJsonAsync("/api/orders", orderRequest);
        orderRes.EnsureSuccessStatusCode();
        var createdOrder = await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>();
        Assert.NotNull(createdOrder);
        Assert.Equal(340_000, createdOrder.Total);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var orderInDb = await db.Orders.SingleOrDefaultAsync(o => o.Id == createdOrder.Id);
        Assert.NotNull(orderInDb);
        Assert.Equal(ShippingMethod.Pishtaz, orderInDb.ShippingMethod);
        Assert.Equal(140_000, orderInDb.ShippingTotal);
        Assert.Equal(340_000, orderInDb.Total);
    }
}
