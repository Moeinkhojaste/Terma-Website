using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddDbContext<TermaDbContext>(options =>
            options.UseInMemoryDatabase("TermaDb"));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<TermaDbContext>());

        // Seed initial data
        using var scope = services.BuildServiceProvider().CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
        context.Database.EnsureCreated();

        if (!context.Products.Any())
        {
            context.Products.AddRange(
                new Product("سفره ترمه نیلا", "nila", "سفره ترمه ۴ نفره با نقش‌های بته‌جقه آبی و آستر ساتن", 1250000m, 4, "/images/nila-folded.jpeg"),
                new Product("سفره ترمه لاجورد", "lajvard", "سفره ترمه ۶ نفره با نقش‌های سفید و مسی", 1850000m, 6, "/images/lajvard-folded.jpeg"),
                new Product("سفره ترمه فیروزه", "firoozeh", "سفره ترمه ۸ نفره با نقش‌های آبی، کرم و مسی", 2450000m, 8, "/images/firoozeh-folded.jpeg")
            );
            context.SaveChanges();
        }

        return services;
    }
}
