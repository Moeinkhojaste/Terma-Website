using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Application;
using Terma.Application.Common.Authorization;
using Terma.Infrastructure;
using Terma.Infrastructure.Identity;
using Terma.Infrastructure.Persistence;

using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var useSecureCookies = !builder.Environment.IsDevelopment();

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
            Title = "Validation failed",
            Detail = "One or more validation errors occurred.",
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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("public-write", limiter =>
    {
        limiter.PermitLimit = 30;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();
builder.Services.AddAuthorization(options =>
    options.AddPolicy(AdminAuthorization.Policy, policy =>
        policy.RequireRole(AdminAuthorization.Role)));
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = useSecureCookies ? "__Host-Terma.Antiforgery" : "Terma.Antiforgery.Dev";
    options.Cookie.HttpOnly = true;
    options.Cookie.Path = "/";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = useSecureCookies ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
});
builder.Services.AddOptions<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme)
    .Configure<TimeProvider>((options, timeProvider) =>
    {
        options.Cookie.Name = useSecureCookies ? "__Host-Terma.Admin" : "Terma.Admin.Dev";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.Path = "/";
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = useSecureCookies
            ? CookieSecurePolicy.Always
            : CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = false;
        options.TimeProvider = timeProvider;
        options.Events.OnRedirectToLogin = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status401Unauthorized,
            "Authentication required",
            "The session is missing or has expired.");
        options.Events.OnRedirectToAccessDenied = context => WriteAuthenticationProblemAsync(
            context,
            StatusCodes.Status403Forbidden,
            "Access denied",
            "The signed-in account does not have permission to perform this action.");
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

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
    if (dbContext.Database.IsSqlServer())
    {
        await dbContext.Database.MigrateAsync();
    }
}

if (args.Contains("--seed-admin", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var provisioner = scope.ServiceProvider.GetRequiredService<AdminAccountProvisioner>();
    var pass = configuration["AdminSeed:Password"] ?? "AdminPassword123!";
    var email = configuration["AdminSeed:Email"] ?? "admin@terma.local";
    await provisioner.ProvisionAsync(email, pass);
    if (!string.Equals(email, "admin@terma.ir", StringComparison.OrdinalIgnoreCase))
    {
        await provisioner.ProvisionAsync("admin@terma.ir", pass);
    }
    app.Logger.LogInformation("The admin accounts were provisioned successfully.");
    return;
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
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
