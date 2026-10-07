using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Payments;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class PaymentApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private async Task<CreatedOrderDto> CreateTestOrderAsync(string phone = "09129876543")
    {
        using var admin = await factory.CreateAdminClientAsync();
        var categoryResponse = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest
        {
            Name = "سفال و ترمه"
        });
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!;

        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "ترمه شاه عباسی",
            Sku = $"PAY-{Guid.NewGuid():N}",
            Description = "توضیحات تست",
            Price = 1200000,
            StockQuantity = 5,
            TableCapacity = 6,
            Length = 100,
            Width = 100,
            FabricType = "ابریشم",
            LiningType = "ساتن",
            Color = "فیروزه‌ای",
            Pattern = "سنتی",
            CategoryId = category.Id
        });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var checkoutRequest = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "مشتری درگاه",
            Phone = phone,
            Province = "تهران",
            City = "تهران",
            Address = "خیابان ولیعصر پلاک ۱۰",
            PostalCode = "1987654321"
        };

        var createdResponse = await guest.PostAsJsonAsync("/api/orders", checkoutRequest);
        Assert.Equal(HttpStatusCode.OK, createdResponse.StatusCode);
        return (await createdResponse.Content.ReadFromJsonAsync<CreatedOrderDto>())!;
    }

    [Fact]
    public async Task PaymentInitiate_ValidOrder_ReturnsPaymentUrlAndCreatesTransaction()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>();
        Assert.NotNull(content);
        Assert.True(content.Success);
        Assert.NotNull(content.Authority);
        Assert.StartsWith("https://sandbox.zarinpal.com/pg/StartPay/", content.PaymentUrl);

        // Verify transaction is stored in DB
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var tx = await db.PaymentTransactions.SingleOrDefaultAsync(x => x.Authority == content.Authority);
        Assert.NotNull(tx);
        Assert.Equal(order.Id, tx.OrderId);
        Assert.Equal(PaymentStatus.Initiated, tx.Status);
    }

    [Fact]
    public async Task PaymentInitiate_NonExistentOrder_ReturnsNotFound()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(Guid.NewGuid()));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PaymentCallback_SuccessfulPayment_ConfirmsOrderAndRedirectsToSuccess()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient(allowAutoRedirect: false);
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var initiateResponse = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id));
        var initiateResult = (await initiateResponse.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>())!;

        // Invoke callback with Status=OK
        var callbackResponse = await client.GetAsync($"/api/payment/zarinpal/callback?Authority={initiateResult.Authority}&Status=OK");
        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);

        var redirectLocation = callbackResponse.Headers.Location?.ToString();
        Assert.NotNull(redirectLocation);
        Assert.Contains("/order/success", redirectLocation);
        Assert.Contains($"order={Uri.EscapeDataString(order.Number)}", redirectLocation);
        Assert.Contains("refId=123456789012", redirectLocation);

        // Check order status changed to Confirmed
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var updatedOrder = await db.Orders.Include(x => x.Payments).SingleAsync(x => x.Id == order.Id);
        Assert.Equal(OrderStatus.Confirmed, updatedOrder.Status);

        var tx = updatedOrder.Payments.Single(x => x.Authority == initiateResult.Authority);
        Assert.Equal(PaymentStatus.Verified, tx.Status);
        Assert.Equal(123456789012, tx.RefId);
    }

    [Fact]
    public async Task PaymentCallback_CancelledByUser_RedirectsToCancelled()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient(allowAutoRedirect: false);
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var initiateResponse = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id));
        var initiateResult = (await initiateResponse.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>())!;

        // Invoke callback with Status=NOK
        var callbackResponse = await client.GetAsync($"/api/payment/zarinpal/callback?Authority={initiateResult.Authority}&Status=NOK");
        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);

        var redirectLocation = callbackResponse.Headers.Location?.ToString();
        Assert.NotNull(redirectLocation);
        Assert.Contains("/order/cancelled", redirectLocation);

        // Verify transaction is marked Cancelled and Order is Cancelled with restored stock
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var tx = await db.PaymentTransactions.SingleAsync(x => x.Authority == initiateResult.Authority);
        Assert.Equal(PaymentStatus.Cancelled, tx.Status);

        var cancelledOrder = await db.Orders.Include(x => x.Items).SingleAsync(x => x.Id == order.Id);
        Assert.Equal(OrderStatus.Cancelled, cancelledOrder.Status);

        var product = await db.Products.SingleAsync(x => x.Id == cancelledOrder.Items.First().ProductId);
        Assert.Equal(5, product.StockQuantity);
    }

    [Fact]
    public async Task TorobEligibility_ValidAmount_ReturnsEligible()
    {
        using var client = factory.CreateHttpsClient();
        var response = await client.GetAsync("/api/payment/torob/eligibility?amount=1200000");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadFromJsonAsync<TorobEligibilityDto>();
        Assert.NotNull(content);
        Assert.True(content.Eligible);
        Assert.Equal("پرداخت اقساطی با ترب‌پی", content.TitleMessage);
    }

    [Fact]
    public async Task PaymentInitiate_TorobPay_ReturnsTorobPaymentUrlAndCreatesTransaction()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id, "TorobPay"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>();
        Assert.NotNull(content);
        Assert.True(content.Success);
        Assert.NotNull(content.Authority);
        Assert.StartsWith("https://cpg.torobpay.com/", content.PaymentUrl);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var tx = await db.PaymentTransactions.SingleOrDefaultAsync(x => x.Authority == content.Authority);
        Assert.NotNull(tx);
        Assert.Equal(order.Id, tx.OrderId);
        Assert.Equal("TorobPay", tx.Gateway);
        Assert.Equal(PaymentStatus.Initiated, tx.Status);
    }

    [Fact]
    public async Task TorobPayCallback_Success_ConfirmsOrderAndRedirectsToSuccess()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient(allowAutoRedirect: false);
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var initiateResponse = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id, "TorobPay"));
        var initiateResult = (await initiateResponse.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>())!;

        var formData = new Dictionary<string, string>
        {
            ["transactionId"] = order.Id.ToString("N"),
            ["state"] = "OK",
            ["amount"] = (order.Total * 10).ToString()
        };

        var callbackResponse = await client.PostAsync("/api/payment/torob/callback", new FormUrlEncodedContent(formData));
        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);

        var redirectLocation = callbackResponse.Headers.Location?.ToString();
        Assert.NotNull(redirectLocation);
        Assert.Contains("/order/success", redirectLocation);
        Assert.Contains($"order={order.Number}", redirectLocation);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var updatedOrder = await db.Orders.Include(x => x.Payments).SingleAsync(x => x.Id == order.Id);
        Assert.Equal(OrderStatus.Confirmed, updatedOrder.Status);

        var tx = updatedOrder.Payments.Single(x => x.Authority == initiateResult.Authority);
        Assert.Equal(PaymentStatus.Verified, tx.Status);
        Assert.Equal("TorobPay", tx.Gateway);
    }

    [Fact]
    public async Task TorobPayCallback_FailedState_CancelsOrderAndRedirectsToCancelled()
    {
        var order = await CreateTestOrderAsync();

        using var client = factory.CreateHttpsClient(allowAutoRedirect: false);
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var initiateResponse = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id, "TorobPay"));
        var initiateResult = (await initiateResponse.Content.ReadFromJsonAsync<PaymentInitiateJsonResult>())!;

        var formData = new Dictionary<string, string>
        {
            ["transactionId"] = order.Id.ToString("N"),
            ["state"] = "FAILED",
            ["amount"] = (order.Total * 10).ToString()
        };

        var callbackResponse = await client.PostAsync("/api/payment/torob/callback", new FormUrlEncodedContent(formData));
        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);

        var redirectLocation = callbackResponse.Headers.Location?.ToString();
        Assert.NotNull(redirectLocation);
        Assert.Contains("/order/cancelled", redirectLocation);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var tx = await db.PaymentTransactions.SingleAsync(x => x.Authority == initiateResult.Authority);
        Assert.Equal(PaymentStatus.Cancelled, tx.Status);

        var cancelledOrder = await db.Orders.SingleAsync(x => x.Id == order.Id);
        Assert.Equal(OrderStatus.Cancelled, cancelledOrder.Status);
    }

    [Fact]
    public async Task PaymentInitiate_TorobPayFailure_CancelsOrderAndReleasesStock()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var categoryResponse = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = "تست درگاه ترب" });
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!;

        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "محصول تست ترب‌پی لغو",
            Sku = $"TOROB-FAIL-{Guid.NewGuid():N}",
            Description = "توضیحات تست",
            Price = 1_000_000,
            StockQuantity = 10,
            TableCapacity = 4,
            Length = 100,
            Width = 100,
            FabricType = "ترمه",
            LiningType = "ساتن",
            Color = "قرمز",
            Pattern = "سنتی",
            CategoryId = category.Id
        });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var guest = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(guest);
        guest.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        // Place order with phone 09120000000 which triggers simulate error
        var checkoutRequest = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 2)],
            FullName = "مشتری خطای درگاه",
            Phone = "09120000000",
            Province = "تهران",
            City = "تهران",
            Address = "خیابان تست پلاک ۱",
            PostalCode = "1234567890"
        };

        var createdResponse = await guest.PostAsJsonAsync("/api/orders", checkoutRequest);
        Assert.Equal(HttpStatusCode.OK, createdResponse.StatusCode);
        var order = (await createdResponse.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // Attempt initiate payment
        var initiateResponse = await guest.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id, "TorobPay"));
        Assert.Equal(HttpStatusCode.BadRequest, initiateResponse.StatusCode);

        // The customer only receives the safe wording, never the gateway's technical reason
        var problem = await initiateResponse.Content.ReadFromJsonAsync<JsonElement>();
        var detail = problem.GetProperty("detail").GetString();
        Assert.Equal(PaymentCustomerMessages.TorobUnavailable, detail);
        Assert.DoesNotContain("احراز هویت", detail);
        Assert.DoesNotContain("رمز عبور", detail);

        // Verify order is now Cancelled and stock reservation is released
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var dbOrder = await db.Orders.SingleAsync(x => x.Id == order.Id);
        Assert.Equal(OrderStatus.Cancelled, dbOrder.Status);

        var dbProduct = await db.Products.Include(p => p.Variants).SingleAsync(p => p.Id == product.Id);
        Assert.Equal(10, dbProduct.StockQuantity);
        Assert.Equal(0, dbProduct.Variants.Sum(v => v.ReservedQuantity));
    }

    [Fact]
    public async Task PaymentInitiate_GatewayWithoutCustomerWording_ReturnsGenericCustomerSafeDetail()
    {
        var order = await CreateTestOrderAsync("09120000001");

        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync("/api/payment/initiate", new PaymentInitiateRequest(order.Id, "TorobPay"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var detail = problem.GetProperty("detail").GetString();

        Assert.Equal(PaymentCustomerMessages.GatewayUnavailable, detail);
        Assert.DoesNotContain("merchant", detail);
        Assert.DoesNotContain("authenticated", detail);
    }

    private sealed record PaymentInitiateJsonResult(bool Success, string? PaymentUrl, string? Authority);
}
