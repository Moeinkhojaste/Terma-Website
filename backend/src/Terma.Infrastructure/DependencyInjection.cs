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
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection.Extensions;

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

        if (isDevelopment)
        {
            services.AddScoped<IPhoneOtpSender, DevelopmentPhoneOtpSender>();
        }

        services.AddScoped<ISecurityAuditService, SecurityAuditService>();
        services.AddScoped<ICustomerAccountService, CustomerAccountService>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IStoreOperationsService, StoreOperationsService>();
        services.AddScoped<ICmsService, CmsService>();
        services.AddScoped<CmsContentSeeder>();
        services.AddSingleton<IMediaStorage, LocalMediaStorage>();
        services.AddHostedService<ReservationExpirationService>();
        services.AddHostedService<CmsPublishingService>();
        return services;
    }
}
