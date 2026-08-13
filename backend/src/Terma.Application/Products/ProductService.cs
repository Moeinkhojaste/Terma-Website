using AutoMapper;
using FluentValidation;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Domain.Entities;

namespace Terma.Application.Products;

public interface IProductService
{
    Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductFacetsDto> FacetsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDto>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDto>> RecommendationsAsync(Guid id, Guid? variantId, int limit, CancellationToken cancellationToken);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class ProductService(
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator,
    IValidator<ProductListRequest> listValidator,
    IMapper mapper) : IProductService
{
    public async Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken)
    {
        await listValidator.ValidateAndThrowAsync(request, cancellationToken);
        var result = await productRepository.ListAsync(request, cancellationToken);
        return new PagedResult<ProductDto>(
            mapper.Map<IReadOnlyList<ProductDto>>(result.Items),
            result.Page,
            result.PageSize,
            result.TotalCount);
    }

    public async Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await GetProductAsync(id, cancellationToken);
        return mapper.Map<ProductDto>(product);
    }

    public Task<ProductFacetsDto> FacetsAsync(CancellationToken cancellationToken) =>
        productRepository.FacetsAsync(cancellationToken);

    public async Task<IReadOnlyList<ProductDto>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        var distinctIds = ids.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count > 8) throw new ValidationException("A maximum of 8 product IDs can be requested.");
        return mapper.Map<IReadOnlyList<ProductDto>>(await productRepository.LookupAsync(distinctIds, cancellationToken));
    }

    public async Task<IReadOnlyList<ProductDto>> RecommendationsAsync(Guid id, Guid? variantId, int limit, CancellationToken cancellationToken)
    {
        if (limit is < 1 or > 12) throw new ValidationException("Recommendation limit must be between 1 and 12.");
        var current = await GetProductAsync(id, cancellationToken);
        var selected = variantId.HasValue
            ? current.Variants.SingleOrDefault(variant => variant.Id == variantId.Value && variant.IsActive)
                ?? throw new NotFoundException($"Variant '{variantId}' was not found for product '{id}'.")
            : current.Variants.Where(variant => variant.IsActive && variant.AvailableQuantity > 0)
                .OrderBy(variant => variant.Price).ThenBy(variant => variant.TableCapacity).FirstOrDefault();

        var currentCapacity = selected?.TableCapacity ?? current.TableCapacity;
        var currentPrice = selected?.Price ?? current.Price;
        var currentColor = selected?.Color ?? current.Color;
        var candidates = await productRepository.RecommendationCandidatesAsync(id, cancellationToken);

        return candidates
            .Select(candidate =>
            {
                var comparisonVariant = candidate.Variants
                    .Where(variant => variant.IsActive && variant.AvailableQuantity > 0)
                    .OrderByDescending(variant => variant.TableCapacity == currentCapacity)
                    .ThenBy(variant => Math.Abs(variant.Price - currentPrice))
                    .First();
                var capacityScore = comparisonVariant.TableCapacity == currentCapacity ? 40d : 0d;
                var patternScore = 25d * TokenSimilarity(current.Pattern, candidate.Pattern);
                var colorScore = 20d * TokenSimilarity(currentColor, comparisonVariant.Color);
                var priceScore = 15d * Math.Max(0d, 1d - (double)(Math.Abs(comparisonVariant.Price - currentPrice) / Math.Max(currentPrice, 1m)));
                return new { Product = candidate, Score = capacityScore + patternScore + colorScore + priceScore, PriceDistance = Math.Abs(comparisonVariant.Price - currentPrice) };
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.PriceDistance)
            .ThenBy(item => item.Product.Name)
            .ThenBy(item => item.Product.Id)
            .Take(limit)
            .Select(item => mapper.Map<ProductDto>(item.Product))
            .ToList();
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, null, cancellationToken);

        var product = CreateProduct(request);
        await productRepository.AddAsync(product, cancellationToken);
        await productRepository.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProductDto>(await GetProductAsync(product.Id, cancellationToken));
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var product = await GetProductAsync(id, cancellationToken);
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, id, cancellationToken);

        product.Update(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive);

        foreach (var variant in product.Variants)
        {
            if (variant.Color != request.Color)
            {
                variant.Update(variant.Title, variant.Sku, request.Color, variant.TableCapacity, variant.Length,
                    variant.Width, variant.Price, variant.CompareAtPrice, variant.LowStockThreshold, variant.IsActive);
            }
        }

        var defaultVariant = product.Variants.FirstOrDefault(variant => variant.Title == "تنوع پیش‌فرض");
        defaultVariant?.SyncFromLegacy(request.Sku, request.Color, request.TableCapacity, request.Length, request.Width, product.Price, request.StockQuantity, request.IsActive);
        await productRepository.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProductDto>(await GetProductAsync(id, cancellationToken));
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await GetProductAsync(id, cancellationToken);
        product.Deactivate();
        await productRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<Product> GetProductAsync(Guid id, CancellationToken cancellationToken)
    {
        return await productRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product '{id}' was not found.");
    }

    private async Task EnsureCategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        if (await categoryRepository.GetByIdAsync(categoryId, cancellationToken) is null)
        {
            throw new NotFoundException($"Category '{categoryId}' was not found.");
        }
    }

    private async Task EnsureUniqueSkuAsync(string sku, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (await productRepository.SkuExistsAsync(sku.Trim().ToUpperInvariant(), excludedId, cancellationToken))
        {
            throw new ConflictException("A product with this SKU already exists.");
        }
    }

    private static Product CreateProduct(ProductWriteRequest request)
    {
        return new Product(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive);
    }

    private static double TokenSimilarity(string first, string second)
    {
        var firstTokens = PersianProductSearch.Normalize(first).Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        var secondTokens = PersianProductSearch.Normalize(second).Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        if (firstTokens.Count == 0 || secondTokens.Count == 0) return 0;
        var intersection = firstTokens.Count(secondTokens.Contains);
        var union = firstTokens.Union(secondTokens).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }
}
