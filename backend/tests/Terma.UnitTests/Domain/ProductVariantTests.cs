using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class ProductVariantTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        var productId = Guid.NewGuid();
        var variant = new ProductVariant(
            productId: productId,
            title: "تنوع ۶ نفره زرشکی",
            sku: "VAR-6P-RED",
            color: "زرشکی",
            tableCapacity: 6,
            length: 160,
            width: 100,
            price: 1_200_000,
            compareAtPrice: 1_500_000,
            stockQuantity: 15,
            lowStockThreshold: 3,
            isActive: true);

        Assert.Equal(productId, variant.ProductId);
        Assert.Equal("تنوع ۶ نفره زرشکی", variant.Title);
        Assert.Equal("VAR-6P-RED", variant.Sku);
        Assert.Equal("زرشکی", variant.Color);
        Assert.Equal(6, variant.TableCapacity);
        Assert.Equal(160, variant.Length);
        Assert.Equal(100, variant.Width);
        Assert.Equal(1_200_000, variant.Price);
        Assert.Equal(1_500_000, variant.CompareAtPrice);
        Assert.Equal(15, variant.StockQuantity);
        Assert.Equal(0, variant.ReservedQuantity);
        Assert.Equal(15, variant.AvailableQuantity);
        Assert.Equal(3, variant.LowStockThreshold);
        Assert.True(variant.IsActive);
    }

    [Fact]
    public void Reserve_And_ReleaseReservation_ManageStockAccurately()
    {
        var variant = new ProductVariant(Guid.NewGuid(), "تنوع", "SKU1", "آبی", 4, 100, 100, 500_000, null, 10, 2);

        // Reserve 4
        variant.Reserve(4);
        Assert.Equal(10, variant.StockQuantity);
        Assert.Equal(4, variant.ReservedQuantity);
        Assert.Equal(6, variant.AvailableQuantity);

        // Cannot reserve more than available (trying to reserve 7 when 6 available)
        Assert.Throws<DomainException>(() => variant.Reserve(7));

        // Release 2
        variant.ReleaseReservation(2);
        Assert.Equal(2, variant.ReservedQuantity);
        Assert.Equal(8, variant.AvailableQuantity);

        // Cannot release more than reserved
        Assert.Throws<DomainException>(() => variant.ReleaseReservation(5));
    }

    [Fact]
    public void CommitReservation_DecrementsStockAndReserved()
    {
        var variant = new ProductVariant(Guid.NewGuid(), "تنوع", "SKU1", "آبی", 4, 100, 100, 500_000, null, 10, 2);
        variant.Reserve(3);

        variant.CommitReservation(3);
        Assert.Equal(7, variant.StockQuantity);
        Assert.Equal(0, variant.ReservedQuantity);
        Assert.Equal(7, variant.AvailableQuantity);
    }

    [Fact]
    public void AdjustStock_UpdatesQuantitySafely()
    {
        var variant = new ProductVariant(Guid.NewGuid(), "تنوع", "SKU1", "آبی", 4, 100, 100, 500_000, null, 10, 2);
        variant.Reserve(4);

        // Add 5 stock
        variant.AdjustStock(5);
        Assert.Equal(15, variant.StockQuantity);
        Assert.Equal(11, variant.AvailableQuantity);

        // Remove 8 stock (still >= 4 reserved)
        variant.AdjustStock(-8);
        Assert.Equal(7, variant.StockQuantity);
        Assert.Equal(3, variant.AvailableQuantity);

        // Trying to lower stock below reserved throws
        Assert.Throws<DomainException>(() => variant.AdjustStock(-4));
    }
}
