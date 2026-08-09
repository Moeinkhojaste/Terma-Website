using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Products.Queries;

namespace Terma.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IGetProductsQuery, GetProductsQuery>();
        return services;
    }
}
