using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public sealed class ProductVariant : BaseEntity
{
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = null!;
    public string Title { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public string Color { get; private set; } = string.Empty;
    public int TableCapacity { get; private set; }
    public decimal Length { get; private set; }
    public decimal Width { get; private set; }
    public decimal Price { get; private set; }
    public decimal? CompareAtPrice { get; private set; }
    public int StockQuantity { get; private set; }
    public int ReservedQuantity { get; private set; }
    public int LowStockThreshold { get; private set; } = 2;
    public bool IsActive { get; private set; } = true;

    private ProductVariant() { }

    public ProductVariant(Guid productId, string title, string sku, string color, int tableCapacity,
        decimal length, decimal width, decimal price, decimal? compareAtPrice, int stockQuantity,
        int lowStockThreshold, bool isActive = true)
    {
        ProductId = productId;
        Apply(title, sku, color, tableCapacity, length, width, price, compareAtPrice,
            stockQuantity, lowStockThreshold, isActive);
    }

    public int AvailableQuantity => Math.Max(0, StockQuantity - ReservedQuantity);

    public void Update(string title, string sku, string color, int tableCapacity, decimal length,
        decimal width, decimal price, decimal? compareAtPrice, int lowStockThreshold, bool isActive)
    {
        Apply(title, sku, color, tableCapacity, length, width, price, compareAtPrice,
            StockQuantity, lowStockThreshold, isActive);
        MarkUpdated();
    }

    public void SyncFromLegacy(string sku, string color, int tableCapacity, decimal length, decimal width, decimal price, int stockQuantity, bool isActive)
    {
        Apply(Title, sku, color, tableCapacity, length, width, price, CompareAtPrice, stockQuantity, LowStockThreshold, isActive);
        if (ReservedQuantity > StockQuantity) throw new DomainException("Stock cannot be lower than the reserved quantity.");
        MarkUpdated();
    }

    public void AdjustStock(int quantity)
    {
        if (StockQuantity + quantity < ReservedQuantity)
            throw new DomainException("Stock cannot be lower than the reserved quantity.");
        StockQuantity += quantity;
        MarkUpdated();
    }

    public void Reserve(int quantity)
    {
        if (quantity <= 0 || quantity > AvailableQuantity)
            throw new DomainException("The requested quantity is not available.");
        ReservedQuantity += quantity;
        MarkUpdated();
    }

    public void ReleaseReservation(int quantity)
    {
        if (quantity < 0 || quantity > ReservedQuantity)
            throw new DomainException("Invalid reservation release quantity.");
        ReservedQuantity -= quantity;
        MarkUpdated();
    }

    public void CommitReservation(int quantity)
    {
        if (quantity < 0 || quantity > ReservedQuantity || quantity > StockQuantity)
            throw new DomainException("Invalid reservation commit quantity.");
        ReservedQuantity -= quantity;
        StockQuantity -= quantity;
        MarkUpdated();
    }

    private void Apply(string title, string sku, string color, int tableCapacity, decimal length,
        decimal width, decimal price, decimal? compareAtPrice, int stockQuantity,
        int lowStockThreshold, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new DomainException("Variant title is required.");
        if (string.IsNullOrWhiteSpace(sku)) throw new DomainException("Variant SKU is required.");
        if (tableCapacity <= 0 || length <= 0 || width <= 0) throw new DomainException("Variant dimensions must be greater than zero.");
        if (price <= 0 || stockQuantity < 0 || lowStockThreshold < 0) throw new DomainException("Variant values are invalid.");
        if (compareAtPrice.HasValue && compareAtPrice.Value < price) throw new DomainException("Compare-at price must be greater than the selling price.");
        Title = title.Trim();
        Sku = sku.Trim().ToUpperInvariant();
        Color = string.IsNullOrWhiteSpace(color) ? "بدون رنگ" : color.Trim();
        TableCapacity = tableCapacity;
        Length = length;
        Width = width;
        Price = price;
        CompareAtPrice = compareAtPrice;
        StockQuantity = stockQuantity;
        LowStockThreshold = lowStockThreshold;
        IsActive = isActive;
    }
}
