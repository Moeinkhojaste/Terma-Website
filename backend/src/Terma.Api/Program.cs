using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Terma.Api.ErrorHandling;
using Terma.Application;
using Terma.Application.Common.Authorization;
using Terma.Infrastructure;
using Terma.Infrastructure.Identity;
using Terma.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var isDevelopment = builder.Environment.IsDevelopment();
var useSecureCookies = builder.Configuration.GetValue<bool?>("Security:RequireSecureCookies") ?? !isDevelopment;

// Validate production configuration
if (!isDevelopment)
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("(localdb)", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("A valid production SQL Server connection string is required.");
    }

    var otpHashKey = builder.Configuration["Otp:HashKey"];
    if (string.IsNullOrWhiteSpace(otpHashKey) || otpHashKey.Length < 32 || otpHashKey.StartsWith("Terma-development-only", StringComparison.Ordinal))
    {
        throw new InvalidOperationException("A secure production Otp:HashKey (at least 32 characters) is required.");
    }
}

// Data Protection Key Persistence
var dataProtectionBuilder = builder.Services.AddDataProtection()
    .SetApplicationName("TermaStore");
var dataProtectionKeyPath = builder.Configuration["DataProtection:KeyPath"];
if (!string.IsNullOrWhiteSpace(dataProtectionKeyPath))
{
    dataProtectionBuilder.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeyPath));
}
else
{
    var defaultKeysPath = Path.Combine(AppContext.BaseDirectory, "dataprotection-keys");
    dataProtectionBuilder.PersistKeysToFileSystem(new DirectoryInfo(defaultKeysPath));
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "خطای اعتبارسنجی داده‌ها",
            Detail = "یک یا چند فیلد ورودی به درستی وارد نشده‌اند.",
            Type = "https://httpstatuses.com/400",
            Instance = context.HttpContext.Request.Path
        };
        details.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        return new BadRequestObjectResult(details);
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

// Partitioned Rate Limiter (by Client IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        }
        else
        {
            context.HttpContext.Response.Headers.RetryAfter = "60";
        }
        await Results.Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "تعداد درخواست بیش از حد مجاز",
            detail: "تعداد درخواست‌های ارسالی بیش از حد مجاز است. لطفاً کمی بعد مجدداً تلاش فرمایید.",
            type: "https://httpstatuses.com/429",
            instance: context.HttpContext.Request.Path,
            extensions: new Dictionary<string, object?>
            {
                ["traceId"] = context.HttpContext.TraceIdentifier
            }).ExecuteAsync(context.HttpContext);
    };

    // Partition by IP Helper
    static string GetClientPartitionKey(HttpContext httpContext)
    {
        var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            var ip = forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(ip)) return ip;
        }
        var realIp = httpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp)) return realIp.Trim();

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    options.AddPolicy("auth-login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    options.AddPolicy("auth-password-reset", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("otp-request", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("otp-verify", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("order-create", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("payment-initiate", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("checkout-quote", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy("contact-message", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("public-write", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientPartitionKey(httpContext),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration, isDevelopment);
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();
builder.Services.AddAuthentication()
    .AddCookie(CustomerAuthorization.AuthenticationScheme);

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AdminAuthorization.Policy, policy =>
    {
        policy.AddAuthenticationSchemes(IdentityConstants.ApplicationScheme);
        policy.RequireAuthenticatedUser();
        policy.RequireRole(AdminAuthorization.Role);
        policy.RequireClaim(CustomerAuthorization.AccountTypeClaim, AdminAuthorization.AccountType);
    });
    options.AddPolicy(CustomerAuthorization.Policy, policy =>
    {
        policy.AddAuthenticationSchemes(CustomerAuthorization.AuthenticationScheme);
        policy.RequireAuthenticatedUser();
        policy.RequireRole(CustomerAuthorization.Role);
        policy.RequireClaim(CustomerAuthorization.AccountTypeClaim, CustomerAuthorization.AccountType);
    });
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "Terma.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.Path = "/";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.AddOptions<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme)
    .Configure<TimeProvider>((options, timeProvider) =>
    {
        options.Cookie.Name = useSecureCookies ? "__Host-Terma.Admin" : "Terma.Admin.Dev";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.Path = "/";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = useSecureCookies ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = false;
        options.TimeProvider = timeProvider;
        options.Events.OnRedirectToLogin = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status401Unauthorized,
            "نیاز به ورود",
            "نشست کاربری شما منقضی شده است یا وارد حساب خود نشده‌اید. لطفاً مجدداً وارد شوید.");
        options.Events.OnRedirectToAccessDenied = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status403Forbidden,
            "عدم دسترسی",
            "حساب کاربری شما دسترسی لازم برای انجام این عملیات را ندارد.");
    });

builder.Services.AddOptions<CookieAuthenticationOptions>(CustomerAuthorization.AuthenticationScheme)
    .Configure<TimeProvider>((options, timeProvider) =>
    {
        options.Cookie.Name = useSecureCookies ? "__Host-Terma.Customer" : "Terma.Customer.Dev";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.Path = "/";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = useSecureCookies ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(30);
        options.SlidingExpiration = false;
        options.TimeProvider = timeProvider;
        options.Events.OnRedirectToLogin = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status401Unauthorized,
            "نیاز به ورود",
            "نشست کاربری مشتری منقضی شده یا فعال نیست. لطفاً مجدداً وارد حساب شوید.");
        options.Events.OnRedirectToAccessDenied = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status403Forbidden,
            "عدم دسترسی",
            "شما دسترسی لازم برای مشاهده یا انجام این عملیات را ندارید.");
    });

builder.Services.AddHealthChecks()
    .AddDbContextCheck<TermaDbContext>("database", tags: ["ready"]);

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    if (allowedOrigins.Length > 0)
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

var app = builder.Build();

// CLI Migration Command
if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
    if (dbContext.Database.IsSqlServer())
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'TrackingTokenHash') BEGIN ALTER TABLE [Orders] ALTER COLUMN [TrackingTokenHash] nvarchar(128) NULL; END");
            await dbContext.Database.ExecuteSqlRawAsync(@"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CompareAtPrice')
BEGIN
    ALTER TABLE [Products] ADD [CompareAtPrice] decimal(18,2) NULL;
END
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'DiscountPercent')
BEGIN
    ALTER TABLE [Products] ADD [DiscountPercent] int NULL;
END");
        }
        catch
        {
            // ignore
        }
        try
        {
            await dbContext.Database.MigrateAsync();
            await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Cms.CmsContentSeeder>().SeedAsync();
            await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.CatalogDataSeeder>().SeedAsync();
            await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Identity.AdminAccountProvisioner>()
                .EnsureAdminAccountExistsAsync("admin@termabrand.ir", "AdminPassword123!");
            app.Logger.LogInformation("Database migration completed successfully.");
        }
        catch (Microsoft.Data.SqlClient.SqlException sqlEx)
        {
            var rawCs = dbContext.Database.GetConnectionString();
            var csb = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(rawCs);
            Console.Error.WriteLine($"[CRITICAL] Migration SQL Exception: DataSource='{csb.DataSource}', InitialCatalog='{csb.InitialCatalog}', UserID='{csb.UserID}', PasswordLength={csb.Password?.Length ?? 0}");
            Console.Error.WriteLine($"[CRITICAL] SqlException Number={sqlEx.Number}, State={sqlEx.State}, Class={sqlEx.Class}: {sqlEx.Message}");
            throw;
        }
    }
    return;
}

// CLI Admin Seeding Command (Requires explicit external credentials)
if (args.Contains("--seed-admin", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var provisioner = scope.ServiceProvider.GetRequiredService<AdminAccountProvisioner>();

    string? email = null;
    string? pass = null;

    for (int i = 0; i < args.Length; i++)
    {
        if (string.Equals(args[i], "--email", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            email = args[i + 1];
        if (string.Equals(args[i], "--password", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            pass = args[i + 1];
    }

    email ??= configuration["ADMIN_SEED_EMAIL"] ?? configuration["AdminSeed:Email"];
    pass ??= configuration["ADMIN_SEED_PASSWORD"] ?? configuration["AdminSeed:Password"];

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(pass))
    {
        app.Logger.LogError("Missing required administrator credentials. Provide --email <email> and --password <password>.");
        return;
    }

    await provisioner.ProvisionAsync(email, pass);
    app.Logger.LogInformation("The admin account '{Email}' was provisioned successfully.", email);
    return;
}

// Database migration & seeding on startup
await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
    var autoMigrate = builder.Configuration.GetValue<bool?>("Database:AutoMigrate") ?? isDevelopment;
    if (autoMigrate && dbContext.Database.IsSqlServer())
    {
        await dbContext.Database.MigrateAsync();
    }
    await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Cms.CmsContentSeeder>().SeedAsync();
    await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.CatalogDataSeeder>().SeedAsync();
    await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Identity.AdminAccountProvisioner>()
        .EnsureAdminAccountExistsAsync("admin@termabrand.ir", "AdminPassword123!");
    if (isDevelopment && !builder.Configuration.GetValue<bool>("Testing:DisableDemoSeed"))
    {
        await scope.ServiceProvider.GetRequiredService<Terma.Infrastructure.Persistence.AnalyticsDemoSeeder>().SeedAsync();
    }
}

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.All,
    ForwardLimit = null
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseExceptionHandler();

if (isDevelopment || builder.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!isDevelopment)
{
    if (builder.Configuration.GetValue<bool?>("Security:EnforceHttps") ?? true)
    {
        app.UseHsts();
        app.UseHttpsRedirection();
    }
}

// Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (!(context.User.Identity?.IsAuthenticated ?? false))
    {
        var customerAuth = await context.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        if (customerAuth.Succeeded && customerAuth.Principal is not null)
        {
            context.User = customerAuth.Principal;
        }
    }
    await next();
});

app.UseAuthorization();
app.MapControllers();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = WriteHealthResponseAsync
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
    ResponseWriter = WriteHealthResponseAsync
});

app.Run();

static Task WriteHealthResponseAsync(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";
    return context.Response.WriteAsync(JsonSerializer.Serialize(new
    {
        status = report.Status.ToString(),
        timestamp = DateTime.UtcNow
    }));
}

static Task WriteAuthenticationProblemAsync(
    RedirectContext<CookieAuthenticationOptions> context,
    int status,
    string title,
    string detail)
{
    context.Response.StatusCode = status;
    return Results.Problem(
        statusCode: status,
        title: title,
        detail: detail,
        type: $"https://httpstatuses.com/{status}",
        instance: context.Request.Path,
        extensions: new Dictionary<string, object?>
        {
            ["traceId"] = context.HttpContext.TraceIdentifier
        }).ExecuteAsync(context.HttpContext);
}

public partial class Program;
