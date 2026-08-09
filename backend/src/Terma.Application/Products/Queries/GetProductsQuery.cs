using Terma.Application.Common.Interfaces;
using Terma.Application.Products.Dtos;

namespace Terma.Application.Products.Queries;

public interface IGetProductsQuery
{
    Task<IEnumerable<ProductDto>> ExecuteAsync(CancellationToken cancellationToken = default);
}

public class GetProductsQuery : IGetProductsQuery
{
    private readonly IApplicationDbContext _context;

    public GetProductsQuery(IApplicationDbContext context)
    {
        _context = context;
    }

    public Task<IEnumerable<ProductDto>> ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var products = _context.Products
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(
                p.Id,
                p.Name,
                p.Slug,
                p.Description,
                p.Price,
                p.CapacityPersons,
                p.ImageUrl,
                p.IsActive
            ))
            .AsEnumerable();

        return Task.FromResult(products);
    }
}
