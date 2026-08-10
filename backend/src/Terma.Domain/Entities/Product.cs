using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public class Product : BaseEntity
{
    private readonly List<ProductVariant> _variants = [];
    private readonly List<ProductMedia> _media = [];
    public string Name { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public decimal Price { get; private set; }
    public decimal? CompareAtPrice { get; private set; }
    public int? DiscountPercent { get; private set; }
    public int StockQuantity { get; private set; }
    public int TableCapacity { get; private set; }
    public decimal Length { get; private set; }
    public decimal Width { get; private set; }
    public string FabricType { get; private set; } = string.Empty;
    public string LiningType { get; private set; } = string.Empty;
    public string Color { get; private set; } = string.Empty;
    public string Pattern { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;
    public Guid CategoryId { get; private set; }
    public Category Category { get; private set; } = null!;
    public IReadOnlyCollection<ProductVariant> Variants => _variants.AsReadOnly();
    public IReadOnlyCollection<ProductMedia> Media => _media.AsReadOnly();

    private Product() { }

    public Product(
        string name,
        string sku,
        string? description,
        decimal price,
        int stockQuantity,
        int tableCapacity,
        decimal length,
        decimal width,
        string fabricType,
        string liningType,
        string color,
        string pattern,
        Guid categoryId,
        int? discountPercent = null,
        bool isActive = true)
    {
        ApplyChanges(name, sku, description, price, stockQuantity, tableCapacity, length, width,
            fabricType, liningType, color, pattern, categoryId, discountPercent, isActive);
        _variants.Add(new ProductVariant(Id, "تنوع پیش‌فرض", Sku, Color, TableCapacity, Length, Width, Price, CompareAtPrice, StockQuantity, 2, isActive));
    }

    public void Update(
        string name,
        string sku,
        string? description,
        decimal price,
        int stockQuantity,
        int tableCapacity,
        decimal length,
        decimal width,
        string fabricType,
        string liningType,
        string color,
        string pattern,
        Guid categoryId,
        int? discountPercent = null,
        bool isActive = true)
    {
        ApplyChanges(name, sku, description, price, stockQuantity, tableCapacity, length, width,
            fabricType, liningType, color, pattern, categoryId, discountPercent, isActive);
        MarkUpdated();
    }

    public void Deactivate()
    {
        if (!IsActive)
        {
            return;
        }

        IsActive = false;
        MarkUpdated();
    }

    private void ApplyChanges(
        string name,
        string sku,
        string? description,
        decimal price,
        int stockQuantity,
        int tableCapacity,
        decimal length,
        decimal width,
        string fabricType,
        string liningType,
        string color,
        string pattern,
        Guid categoryId,
        int? discountPercent,
        bool isActive)
    {
        Name = Required(name, "Product name");
        Sku = Required(sku, "Product SKU").ToUpperInvariant();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();

        if (price <= 0) throw new DomainException("Product price must be greater than zero.");
        if (stockQuantity < 0) throw new DomainException("Stock quantity cannot be negative.");
        if (tableCapacity <= 0) throw new DomainException("Table capacity must be greater than zero.");
        if (length <= 0) throw new DomainException("Length must be greater than zero.");
        if (width <= 0) throw new DomainException("Width must be greater than zero.");
        if (categoryId == Guid.Empty) throw new DomainException("Category is required.");

        if (discountPercent.HasValue && discountPercent.Value > 0)
        {
            if (discountPercent.Value < 0 || discountPercent.Value >= 100)
                throw new DomainException("Discount percentage must be between 1 and 99.");
            CompareAtPrice = price;
            DiscountPercent = discountPercent.Value;
            Price = Math.Round(price * (100 - discountPercent.Value) / 100m, 2);
        }
        else
        {
            CompareAtPrice = null;
            DiscountPercent = null;
            Price = price;
        }

        StockQuantity = stockQuantity;
        TableCapacity = tableCapacity;
        Length = length;
        Width = width;
        FabricType = Required(fabricType, "Fabric type");
        LiningType = Required(liningType, "Lining type");
        Color = Required(color, "Color");
        Pattern = Required(pattern, "Pattern");
        CategoryId = categoryId;
        IsActive = isActive;
    }

    private static string Required(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException($"{fieldName} is required.");
        }

        return value.Trim();
    }
}
