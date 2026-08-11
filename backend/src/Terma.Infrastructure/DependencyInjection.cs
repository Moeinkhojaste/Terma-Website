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

namespace Terma.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<TermaDbContext>(options => options.UseSqlServer(connectionString));
        services.AddIdentityCore<AdminUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 6;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireDigit = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<TermaDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();
        services.AddScoped<AdminAccountProvisioner>();
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
