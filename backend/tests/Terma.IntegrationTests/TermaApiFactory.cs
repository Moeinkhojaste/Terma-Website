using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Terma.Api.Controllers;
using Terma.Application.Common.Authorization;
using Terma.Infrastructure.Identity;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class TermaApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private static int _clientCounter;
    public AdjustableTimeProvider Clock { get; } = new();

    public const string AdminEmail = "admin@example.test";
    public const string AdminPassword = "AdminPass!123";
    public const string UserEmail = "user@example.test";
    public const string UserPassword = "UserPass!1234";
    public const string LockoutEmail = "lockout@example.test";

    static TermaApiFactory()
    {
        SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_winsqlite3());
        SQLitePCL.raw.FreezeProvider();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        _connection.Open();

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<TermaDbContext>>();
            services.RemoveAll<TermaDbContext>();
            services.RemoveAll<TimeProvider>();
            services.AddDbContext<TermaDbContext>(options => options.UseSqlite(_connection));
            services.AddSingleton<TimeProvider>(Clock);

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            scope.ServiceProvider.GetRequiredService<TermaDbContext>().Database.EnsureCreated();
            SeedIdentityAsync(scope.ServiceProvider).GetAwaiter().GetResult();
        });
    }

    public HttpClient CreateHttpsClient()
    {
        Clock.Reset();
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.0.0.{Interlocked.Increment(ref _clientCounter)}");
        return client;
    }

    public HttpClient CreateHttpClient()
    {
        Clock.Reset();
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("http://localhost")
        });
        client.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.0.0.{Interlocked.Increment(ref _clientCounter)}");
        return client;
    }

    public async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = CreateHttpsClient();
        await SetAntiforgeryHeaderAsync(client);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        login.EnsureSuccessStatusCode();

        await SetAntiforgeryHeaderAsync(client);
        return client;
    }

    public Task<HttpClient> CreateAdminClientAsync() =>
        CreateAuthenticatedClientAsync(AdminEmail, AdminPassword);

    public static async Task SetAntiforgeryHeaderAsync(HttpClient client)
    {
        var response = await client.GetFromJsonAsync<AntiforgeryTokenResponse>("/api/auth/antiforgery");
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", response!.Token);
    }

    private static async Task SeedIdentityAsync(IServiceProvider services)
    {
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        if (!await roles.RoleExistsAsync(AdminAuthorization.Role))
            Assert.True((await roles.CreateAsync(new IdentityRole<Guid>(AdminAuthorization.Role))).Succeeded);

        await CreateUserAsync(users, AdminEmail, AdminPassword, AdminAuthorization.Role);
        await CreateUserAsync(users, UserEmail, UserPassword);
        await CreateUserAsync(users, LockoutEmail, AdminPassword);
    }

    private static async Task CreateUserAsync(
        UserManager<ApplicationUser> users,
        string email,
        string password,
        string? role = null)
    {
        if (await users.FindByEmailAsync(email) is not null)
            return;

        var user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true, AccountType = ApplicationUserType.Admin };
        Assert.True((await users.CreateAsync(user, password)).Succeeded);
        if (role is not null)
            Assert.True((await users.AddToRoleAsync(user, role)).Succeeded);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
            _connection.Dispose();
    }
}

public sealed class AdjustableTimeProvider : TimeProvider
{
    private DateTimeOffset _utcNow = DateTimeOffset.UtcNow;

    public override DateTimeOffset GetUtcNow() => _utcNow;

    public void Advance(TimeSpan amount) => _utcNow = _utcNow.Add(amount);

    public void Reset() => _utcNow = DateTimeOffset.UtcNow;
}
