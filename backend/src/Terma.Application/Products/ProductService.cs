using AutoMapper;
using FluentValidation;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Domain.Entities;
using Terma.Domain.Services;

namespace Terma.Application.Products;

public interface IProductService
{
    Task<PagedResult<PublicProductDto>> ListPublicAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<PagedResult<ProductDto>> ListAdminAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<PublicProductDto> GetPublicByIdOrSlugAsync(string identifier, CancellationToken cancellationToken);
    Task<ProductDto> GetAdminByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<ProductFacetsDto> FacetsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<PublicProductDto>> LookupPublicAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDto>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken);
    Task<IReadOnlyList<PublicProductDto>> RecommendationsPublicAsync(string identifier, Guid? variantId, int limit, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDto>> RecommendationsAsync(Guid id, Guid? variantId, int limit, CancellationToken cancellationToken);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<SeoSitemapDto> SeoSitemapAsync(CancellationToken cancellationToken);
}

public sealed class ProductService(
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator,
    IValidator<ProductListRequest> listValidator,
    IMapper mapper) : IProductService
{
    public async Task<PagedResult<PublicProductDto>> ListPublicAsync(ProductListRequest request, CancellationToken cancellationToken)
    {
        var publicRequest = new ProductListRequest
        {
            CategoryId = request.CategoryId,
            CategorySlug = request.CategorySlug,
            MinPrice = request.MinPrice,
            MaxPrice = request.MaxPrice,
            TableCapacity = request.TableCapacity,
            Color = request.Color,
            InStock = request.InStock,
            IsActive = true,
            Search = request.Search,
            Sort = request.Sort,
            Page = request.Page,
            PageSize = request.PageSize
        };
        await listValidator.ValidateAndThrowAsync(publicRequest, cancellationToken);
        var result = await productRepository.ListAsync(publicRequest, cancellationToken);
        return new PagedResult<PublicProductDto>(
            mapper.Map<IReadOnlyList<PublicProductDto>>(result.Items),
            result.Page,
            result.PageSize,
            result.TotalCount);
    }

    public async Task<PagedResult<ProductDto>> ListAdminAsync(ProductListRequest request, CancellationToken cancellationToken)
    {
        await listValidator.ValidateAndThrowAsync(request, cancellationToken);
        var result = await productRepository.ListAsync(request, cancellationToken);
        return new PagedResult<ProductDto>(
            mapper.Map<IReadOnlyList<ProductDto>>(result.Items),
            result.Page,
            result.PageSize,
            result.TotalCount);
    }

    public Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken) =>
        ListAdminAsync(request, cancellationToken);

    public async Task<PublicProductDto> GetPublicByIdOrSlugAsync(string identifier, CancellationToken cancellationToken)
    {
        Product? product = null;
        if (Guid.TryParse(identifier, out var id))
        {
            product = await productRepository.GetByIdAsync(id, cancellationToken);
        }
        else
        {
            var normalizedSlug = PersianSlugHelper.GenerateSlug(identifier);
            product = await productRepository.GetBySlugAsync(normalizedSlug, cancellationToken);
        }

        if (product is null || !product.IsActive || (product.Category != null && !product.Category.IsActive))
            throw new NotFoundException($"Product '{identifier}' was not found.");

        return mapper.Map<PublicProductDto>(product);
    }

    public async Task<ProductDto> GetAdminByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product '{id}' was not found.");
        return mapper.Map<ProductDto>(product);
    }

    public Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken) =>
        GetAdminByIdAsync(id, cancellationToken);

    public Task<ProductFacetsDto> FacetsAsync(CancellationToken cancellationToken) =>
        productRepository.FacetsAsync(cancellationToken);

    public async Task<IReadOnlyList<PublicProductDto>> LookupPublicAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        var distinctIds = ids.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count > 8) throw new ValidationException("A maximum of 8 product IDs can be requested.");
        var items = (await productRepository.LookupAsync(distinctIds, cancellationToken))
            .Where(x => x.IsActive)
            .ToList();
        return mapper.Map<IReadOnlyList<PublicProductDto>>(items);
    }

    public async Task<IReadOnlyList<ProductDto>> LookupAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
    {
        var distinctIds = ids.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count > 8) throw new ValidationException("A maximum of 8 product IDs can be requested.");
        return mapper.Map<IReadOnlyList<ProductDto>>(await productRepository.LookupAsync(distinctIds, cancellationToken));
    }

    public async Task<IReadOnlyList<PublicProductDto>> RecommendationsPublicAsync(string identifier, Guid? variantId, int limit, CancellationToken cancellationToken)
    {
        if (limit is < 1 or > 12) throw new ValidationException("Recommendation limit must be between 1 and 12.");

        Product? current = null;
        if (Guid.TryParse(identifier, out var id))
            current = await productRepository.GetByIdAsync(id, cancellationToken);
        else
            current = await productRepository.GetBySlugAsync(PersianSlugHelper.GenerateSlug(identifier), cancellationToken);

        if (current is null || !current.IsActive)
            throw new NotFoundException($"Product '{identifier}' was not found.");

        var selected = variantId.HasValue
            ? current.Variants.SingleOrDefault(variant => variant.Id == variantId.Value && variant.IsActive)
                ?? throw new NotFoundException($"Variant '{variantId}' was not found for product '{identifier}'.")
            : current.Variants.Where(variant => variant.IsActive && variant.AvailableQuantity > 0)
                .OrderBy(variant => variant.Price).ThenBy(variant => variant.TableCapacity).FirstOrDefault();

        var currentCapacity = selected?.TableCapacity ?? current.TableCapacity;
        var currentPrice = selected?.Price ?? current.Price;
        var currentColor = selected?.Color ?? current.Color;
        var candidates = (await productRepository.RecommendationCandidatesAsync(current.Id, cancellationToken))
            .Where(c => c.IsActive && c.Variants.Any(v => v.IsActive && v.AvailableQuantity > 0))
            .ToList();

        var ranked = candidates
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
            .Select(item => mapper.Map<PublicProductDto>(item.Product))
            .ToList();

        return ranked;
    }

    public async Task<IReadOnlyList<ProductDto>> RecommendationsAsync(Guid id, Guid? variantId, int limit, CancellationToken cancellationToken)
    {
        var publicList = await RecommendationsPublicAsync(id.ToString(), variantId, limit, cancellationToken);
        return mapper.Map<IReadOnlyList<ProductDto>>(publicList);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, null, cancellationToken);

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? await GenerateUniqueSlugAsync(request.Name, null, cancellationToken)
            : PersianSlugHelper.NormalizeSlug(request.Slug);

        if (await productRepository.SlugExistsAsync(slug, null, cancellationToken))
            throw new ConflictException($"A product with slug '{slug}' already exists.");

        var product = new Product(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive, slug,
            request.DetailedDescription);

        await productRepository.AddAsync(product, cancellationToken);
        await productRepository.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProductDto>(await productRepository.GetByIdAsync(product.Id, cancellationToken));
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var product = await productRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product '{id}' was not found.");
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, id, cancellationToken);

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? product.Slug
            : PersianSlugHelper.NormalizeSlug(request.Slug);

        if (slug != product.Slug && await productRepository.SlugExistsAsync(slug, id, cancellationToken))
            throw new ConflictException($"A product with slug '{slug}' already exists.");

        product.Update(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive, slug,
            request.DetailedDescription);

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
        return mapper.Map<ProductDto>(await productRepository.GetByIdAsync(id, cancellationToken));
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product '{id}' was not found.");
        product.Deactivate();
        await productRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<SeoSitemapDto> SeoSitemapAsync(CancellationToken cancellationToken)
    {
        var products = await productRepository.GetAllActiveForSitemapAsync(cancellationToken);
        var items = new List<SeoSitemapItemDto>();

        foreach (var product in products)
        {
            var images = product.Media
                .OrderByDescending(m => m.IsPrimary)
                .ThenBy(m => m.SortOrder)
                .Select(m => m.PublicUrl)
                .ToList();

            items.Add(new SeoSitemapItemDto(
                $"/products/{product.Slug}",
                product.UpdatedAt ?? product.CreatedAt,
                "weekly",
                0.9,
                images.Count > 0 ? images : null));
        }

        return new SeoSitemapDto(items);
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, Guid? excludedId, CancellationToken cancellationToken)
    {
        var baseSlug = PersianSlugHelper.GenerateSlug(name);
        var slug = baseSlug;
        var suffix = 1;
        while (await productRepository.SlugExistsAsync(slug, excludedId, cancellationToken))
        {
            suffix++;
            slug = $"{baseSlug}-{suffix}";
        }
        return slug;
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
