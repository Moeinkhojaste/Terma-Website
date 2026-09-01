using System.Net;
using System.Net.Http.Json;
using Terma.Api.Controllers;
using Terma.Application.Customers;
using Terma.Application.Store;

namespace Terma.IntegrationTests;

public sealed class SecurityAndRateLimitingTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task OtpRequest_ExceedingRateLimit_Returns429TooManyRequestsAndRetryAfter()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var testIp = $"198.51.100.{Random.Shared.Next(10, 99)}";
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", testIp);

        // Policy 'otp-request' permits 5 requests per 10-minute window
        for (var i = 1; i <= 5; i++)
        {
            var phone = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
            var response = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        // 6th request from SAME IP partition must be rejected by RateLimiter middleware
        var sixthResponse = await client.PostAsJsonAsync(
            "/api/customer-auth/otp/request",
            new RequestOtpRequest("09129990000"));

        Assert.Equal(HttpStatusCode.TooManyRequests, sixthResponse.StatusCode);
        Assert.True(sixthResponse.Headers.Contains("Retry-After") || sixthResponse.Headers.RetryAfter != null);

        // A request from a DIFFERENT IP partition must succeed
        using var differentClient = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(differentClient);
        differentClient.DefaultRequestHeaders.Remove("X-Forwarded-For");
        differentClient.DefaultRequestHeaders.Add("X-Forwarded-For", $"198.51.100.{Random.Shared.Next(100, 199)}");

        var newPartitionResponse = await differentClient.PostAsJsonAsync(
            "/api/customer-auth/otp/request",
            new RequestOtpRequest("09128880000"));

        Assert.Equal(HttpStatusCode.OK, newPartitionResponse.StatusCode);
    }

    [Fact]
    public async Task AdminLogin_ExceedingRateLimit_Returns429TooManyRequests()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var testIp = $"198.51.101.{Random.Shared.Next(10, 99)}";
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", testIp);

        // Policy 'auth-login' permits 5 requests per 15-minute window
        for (var i = 1; i <= 5; i++)
        {
            var response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest($"user{i}@example.test", "AnyPassword!123"));
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        // 6th request must trigger 429
        var rejectedResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("attacker@example.test", "Password!123"));

        Assert.Equal(HttpStatusCode.TooManyRequests, rejectedResponse.StatusCode);
        Assert.True(rejectedResponse.Headers.Contains("Retry-After") || rejectedResponse.Headers.RetryAfter != null);
    }

    [Fact]
    public async Task ContactMessage_ExceedingRateLimit_Returns429TooManyRequests()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var testIp = $"198.51.102.{Random.Shared.Next(10, 99)}";
        client.DefaultRequestHeaders.Remove("X-Forwarded-For");
        client.DefaultRequestHeaders.Add("X-Forwarded-For", testIp);

        // Policy 'contact-message' permits 5 requests per 10-minute window
        for (var i = 1; i <= 5; i++)
        {
            var response = await client.PostAsJsonAsync("/api/store/messages", new ContactMessageWriteRequest
            {
                Name = $"User {i}",
                Phone = "09121234567",
                Topic = "Rate Limit Test",
                Body = "A sufficiently long valid contact body."
            });
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        // 6th request must trigger 429
        var rejectedResponse = await client.PostAsJsonAsync("/api/store/messages", new ContactMessageWriteRequest
        {
            Name = "Blocked User",
            Phone = "09121234567",
            Topic = "Rate Limit Test",
            Body = "A sufficiently long valid contact body."
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, rejectedResponse.StatusCode);
    }
}
