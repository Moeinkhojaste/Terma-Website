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
            .Include(product => product.Media)
            .Where(product => product.IsActive == request.IsActive);

        var parsedSearch = PersianProductSearch.Parse(request.Search);
        var minimumPrice = Max(request.MinPrice, parsedSearch.MinimumPrice);
        var maximumPrice = Min(request.MaxPrice, parsedSearch.MaximumPrice);
        var tableCapacity = request.TableCapacity ?? parsedSearch.TableCapacity;

        if (request.IsActive) query = query.Where(product => product.Category.IsActive);
        if (request.CategoryId.HasValue) query = query.Where(product => product.CategoryId == request.CategoryId.Value);
        if (!string.IsNullOrWhiteSpace(request.CategorySlug)) query = query.Where(product => product.Category.Slug == request.CategorySlug.Trim());

        var color = request.Color?.Trim();
        if (minimumPrice.HasValue || maximumPrice.HasValue || tableCapacity.HasValue || !string.IsNullOrWhiteSpace(color) || request.InStock == true)
        {
            query = query.Where(product => product.Variants.Any(variant => variant.IsActive
                && (!minimumPrice.HasValue || variant.Price >= minimumPrice.Value)
                && (!maximumPrice.HasValue || variant.Price <= maximumPrice.Value)
                && (!tableCapacity.HasValue || variant.TableCapacity == tableCapacity.Value)
                && (string.IsNullOrEmpty(color) || product.Color.Contains(color) || variant.Color.Contains(color))
                && (request.InStock != true || variant.StockQuantity > variant.ReservedQuantity)));
        }
        if (request.InStock == false)
        {
            query = query.Where(product => !product.Variants.Any(variant => variant.IsActive && variant.StockQuantity > variant.ReservedQuantity));
        }

        foreach (var searchTerm in parsedSearch.Terms)
        {
            var term = searchTerm;
            query = query.Where(product =>
                product.Name.Contains(term)
                || product.Sku.Contains(term)
                || (product.Description != null && product.Description.Contains(term))
                || product.FabricType.Contains(term)
                || product.LiningType.Contains(term)
                || product.Color.Contains(term)
                || product.Pattern.Contains(term)
                || product.Category.Name.Contains(term)
                || product.Variants.Any(variant => variant.IsActive &&
                    (variant.Title.Contains(term) || variant.Sku.Contains(term) || variant.Color.Contains(term))));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(product => product.Name).ThenBy(product => product.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Product>(items, request.Page, request.PageSize, totalCount);
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Products.Include(product => product.Category).Include(product => product.Variants).Include(product => product.Media)
            .SingleOrDefaultAsync(product => product.Id == id, cancellationToken);

    public Task<Product?> GetBySlugAsync(string slug, CancellationToken cancellationToken) =>
        dbContext.Products.Include(product => product.Category).Include(product => product.Variants).Include(product => product.Media)
            .SingleOrDefaultAsync(product => product.Slug == slug, cancellationToken);

    public async Task<ProductFacetsDto> FacetsAsync(CancellationToken cancellationToken)
    {
        var variants = await dbContext.ProductVariants.AsNoTracking()
            .Where(variant => variant.IsActive && variant.Product.IsActive && variant.Product.Category.IsActive)
            .Select(variant => new { variant.Color, variant.TableCapacity, variant.Price })
            .ToListAsync(cancellationToken);
        var colors = variants.Select(variant => variant.Color).Distinct().OrderBy(color => color).ToList();
        var capacities = variants.Select(variant => variant.TableCapacity).Distinct().OrderBy(capacity => capacity).ToList();
        var minimumPrice = variants.Count == 0 ? null : (decimal?)variants.Min(variant => variant.Price);
        var maximumPrice = variants.Count == 0 ? null : (decimal?)variants.Max(variant => variant.Price);
        return new ProductFacetsDto(colors, capacities, minimumPrice, maximumPrice);
    }

    public async Task<IReadOnlyList<Product>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        var products = await dbContext.Products.AsNoTracking()
            .Include(product => product.Category).Include(product => product.Variants).Include(product => product.Media)
            .Where(product => ids.Contains(product.Id) && product.IsActive && product.Category.IsActive)
            .ToListAsync(cancellationToken);
        var order = ids.Select((id, index) => (id, index)).ToDictionary(item => item.id, item => item.index);
        return products.OrderBy(product => order[product.Id]).ToList();
    }

    public async Task<IReadOnlyList<Product>> RecommendationCandidatesAsync(Guid excludedProductId, CancellationToken cancellationToken) =>
        await dbContext.Products.AsNoTracking()
            .Include(product => product.Category).Include(product => product.Variants).Include(product => product.Media)
            .Where(product => product.Id != excludedProductId && product.IsActive && product.Category.IsActive
                && product.Variants.Any(variant => variant.IsActive && variant.StockQuantity > variant.ReservedQuantity))
            .ToListAsync(cancellationToken);

    public Task<bool> SkuExistsAsync(string sku, Guid? excludedProductId, CancellationToken cancellationToken) =>
        dbContext.Products.AnyAsync(
            product => product.Sku == sku && (!excludedProductId.HasValue || product.Id != excludedProductId.Value),
            cancellationToken);

    public Task<bool> SlugExistsAsync(string slug, Guid? excludedProductId, CancellationToken cancellationToken) =>
        dbContext.Products.AnyAsync(
            product => product.Slug == slug && (!excludedProductId.HasValue || product.Id != excludedProductId.Value),
            cancellationToken);

    public async Task<IReadOnlyList<Product>> GetAllActiveForSitemapAsync(CancellationToken cancellationToken) =>
        await dbContext.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Media)
            .Where(p => p.IsActive && p.Category.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);

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
        catch (DbUpdateException exception) when (IsSlugConflict(exception))
        {
            throw new ConflictException("A product with this slug already exists.");
        }
    }

    private static bool IsSkuConflict(DbUpdateException exception)
    {
        var message = exception.ToString();
        return message.Contains("IX_Products_Sku", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products.Sku", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products', column 'Sku", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSlugConflict(DbUpdateException exception)
    {
        var message = exception.ToString();
        return message.Contains("IX_Products_Slug", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products.Slug", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Products', column 'Slug", StringComparison.OrdinalIgnoreCase);
    }

    private static decimal? Max(decimal? first, decimal? second) => first.HasValue && second.HasValue
        ? Math.Max(first.Value, second.Value)
        : first ?? second;

    private static decimal? Min(decimal? first, decimal? second) => first.HasValue && second.HasValue
        ? Math.Min(first.Value, second.Value)
        : first ?? second;
}
