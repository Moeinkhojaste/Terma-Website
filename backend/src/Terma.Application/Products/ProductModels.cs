using Terma.Application.Store;

namespace Terma.Application.Products;

public sealed record PublicProductVariantDto
{
    public Guid Id { get; init; }
    public Guid ProductId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Sku { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int TableCapacity { get; init; }
    public decimal Length { get; init; }
    public decimal Width { get; init; }
    public decimal Price { get; init; }
    public decimal? CompareAtPrice { get; init; }
    public int AvailableQuantity { get; init; }
}

public sealed record PublicProductDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Sku { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal Price { get; init; }
    public decimal? CompareAtPrice { get; init; }
    public int? DiscountPercent { get; init; }
    public int AvailableQuantity { get; init; }
    public int TableCapacity { get; init; }
    public decimal Length { get; init; }
    public decimal Width { get; init; }
    public string FabricType { get; init; } = string.Empty;
    public string LiningType { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public string Pattern { get; init; } = string.Empty;
    public Guid CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string CategorySlug { get; init; } = string.Empty;
    public IReadOnlyList<PublicProductVariantDto>? Variants { get; init; }
    public IReadOnlyList<ProductMediaDto>? Media { get; init; }
}

public sealed record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string Sku,
    string? Description,
    decimal Price,
    decimal? CompareAtPrice,
    int? DiscountPercent,
    int StockQuantity,
    int TableCapacity,
    decimal Length,
    decimal Width,
    string FabricType,
    string LiningType,
    string Color,
    string Pattern,
    bool IsActive,
    Guid CategoryId,
    string CategoryName,
    string CategorySlug,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<ProductVariantDto>? Variants = null,
    IReadOnlyList<ProductMediaDto>? Media = null);

public sealed record ProductFacetsDto(
    IReadOnlyList<string> Colors,
    IReadOnlyList<int> TableCapacities,
    decimal? MinimumPrice,
    decimal? MaximumPrice);

public class ProductWriteRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Slug { get; init; }
    public string Sku { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal Price { get; init; }
    public int? DiscountPercent { get; init; }
    public int StockQuantity { get; init; }
    public int TableCapacity { get; init; }
    public decimal Length { get; init; }
    public decimal Width { get; init; }
    public string FabricType { get; init; } = string.Empty;
    public string LiningType { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public string Pattern { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
    public Guid CategoryId { get; init; }
}

public sealed class CreateProductRequest : ProductWriteRequest;
public sealed class UpdateProductRequest : ProductWriteRequest;

public sealed class ProductListRequest
{
    public Guid? CategoryId { get; init; }
    public string? CategorySlug { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public int? TableCapacity { get; init; }
    public string? Color { get; init; }
    public bool? InStock { get; init; }
    public bool IsActive { get; init; } = true;
    public string? Search { get; init; }
    public string? Sort { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public sealed record SeoSitemapItemDto(
    string Loc,
    DateTime LastModifiedUtc,
    string ChangeFreq,
    double Priority,
    IReadOnlyList<string>? Images = null);

public sealed record SeoSitemapDto(IReadOnlyList<SeoSitemapItemDto> Items);
