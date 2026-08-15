using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Terma.Api.Controllers;
using Terma.Application.Categories;
using Terma.Application.Common.Authorization;
using Terma.Infrastructure.Identity;

namespace Terma.IntegrationTests;

public sealed class AuthenticationApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task DevelopmentHttp_AntiforgeryEndpointReturnsToken()
    {
        using var client = factory.CreateHttpClient();

        var response = await client.GetFromJsonAsync<AntiforgeryTokenResponse>("/api/auth/antiforgery");

        Assert.False(string.IsNullOrWhiteSpace(response!.Token));
    }

    [Fact]
    public async Task AdminProvisioner_CreatesRoleAndRejectsSilentOverwrite()
    {
        var email = $"provisioned-{Guid.NewGuid():N}@example.test";
        const string firstPassword = "FirstAdmin!123";
        const string secondPassword = "SecondAdmin!456";
        await using var scope = factory.Services.CreateAsyncScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<AdminAccountProvisioner>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        await provisioner.ProvisionAsync(email, firstPassword);
        await Assert.ThrowsAsync<InvalidOperationException>(() => provisioner.ProvisionAsync(email, secondPassword));

        var user = await users.FindByEmailAsync(email);
        Assert.NotNull(user);
        Assert.True(await users.CheckPasswordAsync(user, firstPassword));
        Assert.True(await users.IsInRoleAsync(user, AdminAuthorization.Role));
    }

    [Fact]
    public async Task PublicCatalogReads_DoNotRequireAuthentication()
    {
        using var client = factory.CreateHttpsClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/categories")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/products")).StatusCode);
    }

    [Fact]
    public async Task LoginAndMe_ReturnAdminSession()
    {
        using var client = await factory.CreateAdminClientAsync();

        var session = await client.GetFromJsonAsync<AdminSessionResponse>("/api/auth/me");

        Assert.Equal(TermaApiFactory.AdminEmail, session!.Email);
        Assert.Equal("Admin", session.Role);
        Assert.InRange(
            session.ExpiresAtUtc - factory.Clock.GetUtcNow(),
            TimeSpan.FromMinutes(29),
            TimeSpan.FromMinutes(30));
    }

    [Fact]
    public async Task InvalidPassword_ReturnsGenericUnauthorizedProblem()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(TermaApiFactory.AdminEmail, "WrongPassword!123"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Login failed", json.RootElement.GetProperty("title").GetString());
        Assert.DoesNotContain(TermaApiFactory.AdminEmail, json.RootElement.ToString());
    }

    [Fact]
    public async Task FiveFailedAttempts_LockAccountTemporarily()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var rejected = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest(TermaApiFactory.LockoutEmail, "WrongPassword!123"));
            Assert.Equal(HttpStatusCode.Unauthorized, rejected.StatusCode);
        }

        var locked = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest(TermaApiFactory.LockoutEmail, "WrongPassword!123"));

        Assert.Equal((HttpStatusCode)423, locked.StatusCode);
    }

    [Fact]
    public async Task Logout_InvalidatesSession()
    {
        using var client = await factory.CreateAdminClientAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task SessionExpiresAfterThirtyMinutes()
    {
        using var client = await factory.CreateAdminClientAsync();

        factory.Clock.Advance(TimeSpan.FromMinutes(31));
        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AnonymousMutation_ReturnsUnauthorized()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var response = await client.PostAsJsonAsync("/api/admin/categories", ValidCategory());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedNonAdminMutation_ReturnsForbidden()
    {
        using var client = await factory.CreateAuthenticatedClientAsync(
            TermaApiFactory.UserEmail,
            TermaApiFactory.UserPassword);

        var response = await client.PostAsJsonAsync("/api/admin/categories", ValidCategory());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminMutationWithoutAntiforgeryToken_ReturnsProblemDetailsBadRequest()
    {
        using var client = await factory.CreateAdminClientAsync();
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");

        var response = await client.PostAsJsonAsync("/api/admin/categories", ValidCategory());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Invalid antiforgery token", json.RootElement.GetProperty("title").GetString());
    }

    private static CreateCategoryRequest ValidCategory() => new()
    {
        Name = $"Auth test {Guid.NewGuid():N}",
        Description = "Authorization integration test"
    };
}
