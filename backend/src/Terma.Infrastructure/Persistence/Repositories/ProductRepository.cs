using Microsoft.EntityFrameworkCore;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Application.Products;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Repositories;

public sealed class ProductRepository(TermaDbContext dbContext) : IProductRepository
{
    public async Task<PagedResult<Product>> ListAsync(ProductListRequest request, CancellationToken cancellationToken)
    {
        var query = dbContext.Products.AsNoTracking()
            .Include(product => product.Category)
            .Include(product => product.Variants)
            .Where(product => product.IsActive == request.IsActive);

        if (request.IsActive) query = query.Where(product => product.Category.IsActive);
        if (request.CategoryId.HasValue) query = query.Where(product => product.CategoryId == request.CategoryId.Value);
        if (request.MinPrice.HasValue) query = query.Where(product => product.Price >= request.MinPrice.Value);
        if (request.MaxPrice.HasValue) query = query.Where(product => product.Price <= request.MaxPrice.Value);
        if (request.TableCapacity.HasValue) query = query.Where(product => product.TableCapacity == request.TableCapacity.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            query = query.Where(product => product.Name.Contains(search) || product.Sku.Contains(search));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(product => product.Name).ThenBy(product => product.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Product>(items, request.Page, request.PageSize, totalCount);
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Products.Include(product => product.Category).Include(product => product.Variants)
            .SingleOrDefaultAsync(product => product.Id == id, cancellationToken);

    public Task<bool> SkuExistsAsync(string sku, Guid? excludedProductId, CancellationToken cancellationToken) =>
        dbContext.Products.AnyAsync(
            product => product.Sku == sku && (!excludedProductId.HasValue || product.Id != excludedProductId.Value),
            cancellationToken);

    public async Task AddAsync(Product product, CancellationToken cancellationToken) =>
        await dbContext.Products.AddAsync(product, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsSkuConflict(exception))
        {
            throw new ConflictException("A product with this SKU already exists.");
        }
    }

    private static bool IsSkuConflict(DbUpdateException exception)
    {
        var message = exception.ToString();
        return message.Contains("IX_Products_Sku", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products.Sku", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products', column 'Sku", StringComparison.OrdinalIgnoreCase);
    }
}
