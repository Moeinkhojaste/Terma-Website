using Terma.Application.Common.Models;
using Terma.Application.Products;
using Terma.Domain.Entities;

namespace Terma.Application.Common.Interfaces;

public interface IProductRepository
{
    Task<PagedResult<Product>> ListAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> SkuExistsAsync(string sku, Guid? excludedProductId, CancellationToken cancellationToken);
    Task AddAsync(Product product, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
