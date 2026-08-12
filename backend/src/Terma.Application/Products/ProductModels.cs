using Terma.Application.Store;

namespace Terma.Application.Products;

public sealed record ProductDto(
    Guid Id,
    string Name,
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
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<ProductVariantDto>? Variants = null);

public class ProductWriteRequest
{
    public string Name { get; init; } = string.Empty;
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
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public int? TableCapacity { get; init; }
    public bool IsActive { get; init; } = true;
    public string? Search { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
