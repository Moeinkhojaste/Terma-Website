using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Customers;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Infrastructure.Identity;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class CustomerAccountsApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task GuestOrder_IsClaimedAfterOtp_AndCustomerCannotAccessAdmin()
    {
        var phone = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var admin = await factory.CreateAdminClientAsync();
        var categoryResponse = await admin.PostAsJsonAsync("/api/categories", new CreateCategoryRequest { Name = $"Account {Guid.NewGuid():N}" });
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!;
        var productResponse = await admin.PostAsJsonAsync("/api/products", new CreateProductRequest { Name = "Account product", Sku = $"ACCOUNT-{Guid.NewGuid():N}", Description = "test", Price = 2500, StockQuantity = 3, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var customer = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(customer);
        var orderResponse = await customer.PostAsJsonAsync("/api/orders", new CheckoutRequest { Items = [new CheckoutItemRequest(product.Id, null, 1)], FullName = "OTP Customer", Phone = phone, Province = "Tehran", City = "Tehran", Address = "A complete customer address", PostalCode = "1234567890" });
        orderResponse.EnsureSuccessStatusCode();
        var createdOrder = (await orderResponse.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        await using (var beforeScope = factory.Services.CreateAsyncScope())
            Assert.Null((await beforeScope.ServiceProvider.GetRequiredService<TermaDbContext>().Orders.SingleAsync(x => x.Id == createdOrder.Id)).UserId);

        var otpResponse = await customer.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
        otpResponse.EnsureSuccessStatusCode();
        var challenge = (await otpResponse.Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        Assert.NotNull(challenge.DevelopmentCode);
        var verifyResponse = await customer.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!));
        verifyResponse.EnsureSuccessStatusCode();
        var session = (await verifyResponse.Content.ReadFromJsonAsync<CustomerSessionDto>())!;
        Assert.Equal(1, session.ClaimedOrderCount);

        var orders = await customer.GetFromJsonAsync<Terma.Application.Common.Models.PagedResult<CustomerOrderSummaryDto>>("/api/customer/orders");
        Assert.Contains(orders!.Items, x => x.Id == createdOrder.Id);
        Assert.Equal(HttpStatusCode.Unauthorized, (await customer.GetAsync("/api/admin/dashboard")).StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        var phoneSuffix = phone.Substring(1);
        Assert.Equal(session.UserId, (await db.Orders.SingleAsync(x => x.Id == createdOrder.Id)).UserId);
        Assert.Equal(session.UserId, (await db.Customers.SingleAsync(x => x.NormalizedPhone.EndsWith(phoneSuffix))).UserId);
        var user = await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().FindByIdAsync(session.UserId.ToString());
        Assert.NotNull(user);
        Assert.Null(user!.PasswordHash);
        Assert.Equal(ApplicationUserType.Customer, user.AccountType);
    }

    [Fact]
    public async Task Otp_CannotBeReplayed()
    {
        var phone = $"0935{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var challenge = (await (await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone))).Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        (await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!))).EnsureSuccessStatusCode();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!))).StatusCode);
    }

    [Fact]
    public async Task ExpiredOtp_IsRejected()
    {
        var phone = $"0991{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var challenge = (await (await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone))).Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        factory.Clock.Advance(TimeSpan.FromMinutes(6));
        Assert.Equal(HttpStatusCode.Gone, (await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!))).StatusCode);
    }

    [Fact]
    public async Task CustomerSession_ExpiresAfterThirtyDays()
    {
        var phone = $"0901{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var challenge = (await (await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone))).Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        (await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!))).EnsureSuccessStatusCode();
        factory.Clock.Advance(TimeSpan.FromDays(31));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/customer-auth/me")).StatusCode);
    }

    [Fact]
    public async Task CustomerLogout_ClearsCustomerSession()
    {
        var phone = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var challenge = (await (await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone))).Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        (await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!))).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/customer-auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/customer-auth/me")).StatusCode);
    }
}
