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
        var categoryResponse = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"Account {Guid.NewGuid():N}" });
        var category = (await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>())!;
        var productResponse = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Account product", Sku = $"ACCOUNT-{Guid.NewGuid():N}", Description = "test", Price = 2500, StockQuantity = 3, TableCapacity = 4, Length = 150, Width = 180, FabricType = "Termeh", LiningType = "Satin", Color = "Blue", Pattern = "Pattern", CategoryId = category.Id });
        var product = (await productResponse.Content.ReadFromJsonAsync<ProductDto>())!;

        using var customer = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(customer);
        customer.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
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

        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/customer-auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/customer-auth/me")).StatusCode);
    }

    [Fact]
    public async Task Otp_ResendCooldownTwoMinutes_AndChangingPhoneSucceedsImmediately()
    {
        var testIp = $"198.51.102.{Random.Shared.Next(10, 99)}";
        var phone1 = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        var phone2 = $"0935{Random.Shared.Next(1_000_000, 9_999_999)}";

        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", testIp);

        // 1. First request for phone1 succeeds, returning 120 seconds retry delay
        var firstResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone1));
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstChallenge = (await firstResponse.Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        Assert.Equal(120, firstChallenge.RetryAfterSeconds);

        // 2. Immediate second request for SAME phone1 must be rejected with 429 and Retry-After
        var immediateResend = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone1));
        Assert.Equal(HttpStatusCode.TooManyRequests, immediateResend.StatusCode);
        Assert.True(immediateResend.Headers.Contains("Retry-After") || immediateResend.Headers.RetryAfter != null);

        // 3. Request for DIFFERENT phone2 must succeed immediately (no waiting required for changed number)
        var changePhoneResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone2));
        Assert.Equal(HttpStatusCode.OK, changePhoneResponse.StatusCode);
        var secondChallenge = (await changePhoneResponse.Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        Assert.Equal(120, secondChallenge.RetryAfterSeconds);

        // 4. After advancing clock past 2 minutes (121 seconds), requesting phone1 again succeeds
        factory.Clock.Advance(TimeSpan.FromSeconds(121));
        var afterCooldownResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone1));
        Assert.Equal(HttpStatusCode.OK, afterCooldownResponse.StatusCode);
    }

    [Fact]
    public async Task Otp_RateLimit_FiveRequestsInTenMinutes_SixthBlockedUntilTenMinutesExpire()
    {
        var phone = $"0911{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        // 5 requests spaced across the 10-minute window (e.g. every 2 minutes) must succeed
        for (var i = 1; i <= 5; i++)
        {
            client.DefaultRequestHeaders.Remove("X-Forwarded-For");
            client.DefaultRequestHeaders.Add("X-Forwarded-For", $"198.51.103.{i}");

            var response = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            if (i < 5)
            {
                factory.Clock.Advance(TimeSpan.FromSeconds(121)); // Wait past 2-min resend cooldown
            }
        }

        // 6th request within the 10-minute window must be rejected (limit is 5 in 10 minutes)
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.103.6");

        var sixthResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
        Assert.Equal(HttpStatusCode.TooManyRequests, sixthResponse.StatusCode);
        Assert.True(sixthResponse.Headers.Contains("Retry-After") || sixthResponse.Headers.RetryAfter != null);

        // Advance clock past the remaining window (total > 10 minutes from 1st request)
        factory.Clock.Advance(TimeSpan.FromMinutes(3));

        // Request should now succeed as the oldest request in the window rolled off
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.103.7");

        var afterWindowResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
        Assert.Equal(HttpStatusCode.OK, afterWindowResponse.StatusCode);
    }
}
