using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Common.Interfaces;
using Terma.Infrastructure.Identity;
using Terma.Infrastructure.Persistence;
using Terma.Infrastructure.Persistence.Repositories;
using Terma.Application.Store;
using Terma.Infrastructure.Store;
using Terma.Infrastructure.Media;
using Terma.Application.Cms;
using Terma.Infrastructure.Cms;
using Terma.Application.Customers;
using Terma.Application.Reviews;
using Terma.Infrastructure.Reviews;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Terma.Application.Telegram;
using Terma.Infrastructure.Telegram;
using Terma.Infrastructure.Sms;
using Terma.Infrastructure.Email;
using Terma.Application.Payments;
using Terma.Infrastructure.Payments;

namespace Terma.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration, bool isDevelopment = false)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? (isDevelopment ? "Server=(localdb)\\MSSQLLocalDB;Database=TermaDb;Trusted_Connection=True;TrustServerCertificate=True" : null);

        if (string.IsNullOrWhiteSpace(connectionString) && !isDevelopment)
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
        }

        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<TermaDbContext>(options => options.UseSqlServer(connectionString));
        }

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 12;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireDigit = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<TermaDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        services.RemoveAll<IUserValidator<ApplicationUser>>();
        services.AddScoped<IUserValidator<ApplicationUser>, ApplicationUserValidator>();
        services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, ApplicationUserClaimsPrincipalFactory>();
        services.AddScoped<AdminAccountProvisioner>();
        services.Configure<OtpOptions>(configuration.GetSection(OtpOptions.SectionName));
        services.Configure<SmsIrOptions>(configuration.GetSection(SmsIrOptions.SectionName));

        services.AddHttpClient<IPhoneOtpSender, SmsIrPhoneOtpSender>(client =>
        {
            client.BaseAddress = new Uri("https://api.sms.ir/v1/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<ISecurityAuditService, SecurityAuditService>();
        services.AddScoped<ICustomerAccountService, CustomerAccountService>();
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IAdminPasswordResetService, AdminPasswordResetService>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IStoreOperationsService, StoreOperationsService>();
        services.AddScoped<ICmsService, CmsService>();
        services.AddScoped<IProductReviewService, ProductReviewService>();
        services.AddScoped<CmsContentSeeder>();
        services.AddScoped<CatalogDataSeeder>();
        services.AddScoped<AnalyticsDemoSeeder>();
        services.AddSingleton<IMediaStorage, LocalMediaStorage>();
        services.AddSingleton<IImageOptimizer, ImageOptimizer>();
        services.AddHostedService<CmsPublishingService>();

        services.Configure<TelegramOptions>(configuration.GetSection(TelegramOptions.SectionName));
        services.AddHttpClient<ITelegramBotService, TelegramBotService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddHttpClient("TelegramBotClient", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(35);
        });
        services.AddScoped<ITelegramUpdateHandler, TelegramUpdateHandler>();
        services.AddHostedService<TelegramPollingService>();
        services.Configure<ZarinPalOptions>(configuration.GetSection(ZarinPalOptions.SectionName));
        services.AddHttpClient<IPaymentGatewayService, ZarinPalGatewayService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Accept.Clear();
            client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        return services;
    }
}
