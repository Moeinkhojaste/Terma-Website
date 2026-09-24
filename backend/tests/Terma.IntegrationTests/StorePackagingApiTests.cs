using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Api.Controllers;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class StorePackagingApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private static async Task<CategoryDto> CreateCategoryAsync(HttpClient admin)
    {
        var res = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest
        {
            Name = $"PackagingCat {Guid.NewGuid():N}"
        });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<CategoryDto>())!;
    }

    private static async Task<ProductDto> CreateProductAsync(HttpClient admin, Guid categoryId, decimal price = 100_000, int stock = 20)
    {
        var res = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "سفره ترمه ممتاز",
            Sku = $"PKG-{Guid.NewGuid():N}"[..12],
            Description = "محصول آزمایشی بسته‌بندی",
            Price = price,
            StockQuantity = stock,
            TableCapacity = 6,
            Length = 100,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ابریشم",
            Color = "قرمز",
            Pattern = "بته جقه",
            CategoryId = categoryId
        });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ProductDto>())!;
    }

    [Fact]
    public async Task GetPublicPackagingSettings_ReturnsDefaultSettings()
    {
        using var client = factory.CreateHttpsClient();
        var response = await client.GetAsync("/api/store/packaging");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var settings = await response.Content.ReadFromJsonAsync<PublicPackagingSettingsDto>();
        Assert.NotNull(settings);
        Assert.True(settings.GiftPackagingPrice >= 0);
    }

    [Fact]
    public async Task CheckoutQuote_WithMixedPackaging_CalculatesCorrectPackagingTotalAndSubtotal()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 100_000, stock: 20);

        // Ensure default settings are active
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var updateSettingsRes = await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(200_000, true));
        updateSettingsRes.EnsureSuccessStatusCode();

        using var client = factory.CreateHttpsClient();
        var quoteRequest = new CheckoutRequest
        {
            Items =
            [
                new CheckoutItemRequest(product.Id, null, 2, PackagingType.Standard),
                new CheckoutItemRequest(product.Id, null, 3, PackagingType.GiftBox)
            ]
        };

        var quoteRes = await client.PostAsJsonAsync("/api/checkout/quote", quoteRequest);
        Assert.Equal(HttpStatusCode.OK, quoteRes.StatusCode);

        var quote = await quoteRes.Content.ReadFromJsonAsync<CheckoutQuoteDto>();
        Assert.NotNull(quote);
        Assert.Equal(2, quote.Items.Count);

        var standardItem = quote.Items.Single(x => x.PackagingType == PackagingType.Standard);
        var giftItem = quote.Items.Single(x => x.PackagingType == PackagingType.GiftBox);

        Assert.Equal(0, standardItem.PackagingFee);
        Assert.Equal(200_000, giftItem.PackagingFee);

        // Standard: 2 * 100,000 = 200,000
        // GiftBox: 3 * (100,000 + 200,000) = 900,000
        // PackagingTotal: 3 * 200,000 = 600,000
        // Subtotal: 200,000 + 900,000 = 1,100,000
        Assert.Equal(600_000, quote.PackagingTotal);
        Assert.Equal(1_100_000, quote.Subtotal);
    }

    [Fact]
    public async Task CreateOrder_WithPackaging_FreezesHistoricalPriceAndSnapshot()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 150_000, stock: 10);

        // Set gift packaging price to 200,000
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var setupRes = await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(200_000, true));
        setupRes.EnsureSuccessStatusCode();

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var orderRequest = new CheckoutRequest
        {
            Items =
            [
                new CheckoutItemRequest(product.Id, null, 1, PackagingType.Standard),
                new CheckoutItemRequest(product.Id, null, 2, PackagingType.GiftBox)
            ],
            FullName = "مشتری بسته‌بندی",
            Phone = "09121112233",
            Province = "یزد",
            City = "یزد",
            Address = "میدان امیرچقماق، کوچه بازارچه",
            PostalCode = "8913812345"
        };

        var orderRes = await guest.PostAsJsonAsync("/api/orders", orderRequest);
        Assert.Equal(HttpStatusCode.OK, orderRes.StatusCode);
        var createdOrder = await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>();
        Assert.NotNull(createdOrder);

        // Verify order in database
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
            var orderEntity = await db.Orders
                .Include(o => o.Items)
                .SingleAsync(o => o.Id == createdOrder.Id);

            Assert.Equal(2, orderEntity.Items.Count);
            var giftItem = orderEntity.Items.Single(x => x.PackagingType == PackagingType.GiftBox);
            Assert.Equal(200_000, giftItem.PackagingFee);
            Assert.Equal(2, giftItem.Quantity);
            Assert.Equal((150_000 + 200_000) * 2, giftItem.LineTotal);
            Assert.Equal(400_000, orderEntity.PackagingTotal);
        }

        // Now Admin updates packaging price to 300,000
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var updatePriceRes = await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(300_000, true));
        updatePriceRes.EnsureSuccessStatusCode();

        // Historical price immutability check: The order must still have 200,000 fee
        var adminOrders = await admin.GetFromJsonAsync<List<AdminOrderDto>>("/api/admin/orders");
        var savedAdminOrder = adminOrders!.Single(o => o.Id == createdOrder.Id);
        var adminGiftItem = savedAdminOrder.Items.Single(x => x.PackagingType == PackagingType.GiftBox);
        Assert.Equal(200_000, adminGiftItem.PackagingFee);
    }

    [Fact]
    public async Task AdminSettings_RequiresAdminRoleAndAntiforgery_UpdatesSuccessfully()
    {
        // 1. Anonymous access is unauthorized
        using var anonymous = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/settings")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(220_000, true))).StatusCode);

        // 2. Admin access without antiforgery token gets 400 Bad Request
        using var adminWithoutCsrf = factory.CreateHttpsClient();
        var loginRes = await adminWithoutCsrf.PostAsJsonAsync("/api/auth/login", new LoginRequest(TermaApiFactory.AdminEmail, TermaApiFactory.AdminPassword));
        loginRes.EnsureSuccessStatusCode();
        var csrfMissingRes = await adminWithoutCsrf.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(220_000, true));
        Assert.Equal(HttpStatusCode.BadRequest, csrfMissingRes.StatusCode);

        // 3. Admin access with antiforgery token succeeds
        using var admin = await factory.CreateAdminClientAsync();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);

        var putRes = await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(250_000, false));
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<StoreSettingsDto>();
        Assert.NotNull(updated);
        Assert.Equal(250_000, updated.GiftPackagingPrice);
        Assert.False(updated.IsGiftPackagingEnabled);

        // 4. Verify GET /api/admin/settings returns updated values
        var getSettingsRes = await admin.GetAsync("/api/admin/settings");
        Assert.Equal(HttpStatusCode.OK, getSettingsRes.StatusCode);
        var currentSettings = await getSettingsRes.Content.ReadFromJsonAsync<StoreSettingsDto>();
        Assert.NotNull(currentSettings);
        Assert.Equal(250_000, currentSettings.GiftPackagingPrice);
        Assert.False(currentSettings.IsGiftPackagingEnabled);

        // 5. Verify public endpoint reflects changes
        using var publicClient = factory.CreateHttpsClient();
        var publicSettings = await publicClient.GetFromJsonAsync<PublicPackagingSettingsDto>("/api/store/packaging");
        Assert.NotNull(publicSettings);
        Assert.Equal(250_000, publicSettings.GiftPackagingPrice);
        Assert.False(publicSettings.IsGiftPackagingEnabled);

        // Restore settings for subsequent tests
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(200_000, true));
    }

    [Fact]
    public async Task CheckoutQuote_WhenGiftPackagingDisabled_FallsBackToStandard()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var category = await CreateCategoryAsync(admin);
        var product = await CreateProductAsync(admin, category.Id, price: 100_000, stock: 10);

        // Disable gift packaging
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var disableRes = await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(200_000, false));
        disableRes.EnsureSuccessStatusCode();

        using var client = factory.CreateHttpsClient();
        var quoteRequest = new CheckoutRequest
        {
            Items =
            [
                new CheckoutItemRequest(product.Id, null, 1, PackagingType.GiftBox)
            ]
        };

        var quoteRes = await client.PostAsJsonAsync("/api/checkout/quote", quoteRequest);
        Assert.Equal(HttpStatusCode.OK, quoteRes.StatusCode);

        var quote = await quoteRes.Content.ReadFromJsonAsync<CheckoutQuoteDto>();
        Assert.NotNull(quote);

        // Should fall back to Standard packaging with 0 fee
        var item = Assert.Single(quote.Items);
        Assert.Equal(PackagingType.Standard, item.PackagingType);
        Assert.Equal(0, item.PackagingFee);
        Assert.Equal(0, quote.PackagingTotal);
        Assert.Equal(100_000, quote.Subtotal);

        // Restore setting
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        await admin.PutAsJsonAsync("/api/admin/settings/packaging", new UpdatePackagingSettingsRequest(200_000, true));
    }
}
