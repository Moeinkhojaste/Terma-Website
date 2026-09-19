using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class ProductTests
{
    [Fact]
    public void Create_WithValidValues_NormalizesSkuAndUsesUtcTimestamp()
    {
        var product = CreateProduct("  ter-nil-001  ");

        Assert.Equal("TER-NIL-001", product.Sku);
        Assert.True(product.IsActive);
        Assert.Equal(DateTimeKind.Utc, product.CreatedAt.Kind);
        Assert.Null(product.UpdatedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithNonPositivePrice_Throws(decimal price)
    {
        Assert.Throws<DomainException>(() => CreateProduct(price: price));
    }

    [Fact]
    public void Create_WithNegativeStock_Throws()
    {
        Assert.Throws<DomainException>(() => CreateProduct(stockQuantity: -1));
    }

    [Theory]
    [InlineData(0, 180)]
    [InlineData(150, 0)]
    public void Create_WithInvalidDimensions_Throws(decimal length, decimal width)
    {
        Assert.Throws<DomainException>(() => CreateProduct(length: length, width: width));
    }

    [Fact]
    public void Deactivate_IsIdempotent()
    {
        var product = CreateProduct();
        product.Deactivate();
        var updatedAt = product.UpdatedAt;

        product.Deactivate();

        Assert.False(product.IsActive);
        Assert.Equal(updatedAt, product.UpdatedAt);
    }

    [Fact]
    public void Create_And_Update_WithDetailedDescription_SetsPropertyCorrectly()
    {
        var categoryId = Guid.NewGuid();
        var product = new Product("Nila", "TER-NIL-001", "Short desc", 1_500_000m, 3, 4, 150m, 180m,
            "Termeh", "Satin", "Blue", "Boteh", categoryId, detailedDescription: "  توضیحات تفصیلی چندخطی  ");

        Assert.Equal("توضیحات تفصیلی چندخطی", product.DetailedDescription);

        product.Update("Nila", "TER-NIL-001", "Short desc", 1_500_000m, 3, 4, 150m, 180m,
            "Termeh", "Satin", "Blue", "Boteh", categoryId, detailedDescription: "توضیحات به‌روزرسانی‌شده");

        Assert.Equal("توضیحات به‌روزرسانی‌شده", product.DetailedDescription);
    }

    private static Product CreateProduct(
        string sku = "TER-NIL-001",
        decimal price = 1_500_000m,
        int stockQuantity = 3,
        decimal length = 150m,
        decimal width = 180m) =>
        new("Nila", sku, null, price, stockQuantity, 4, length, width,
            "Termeh", "Satin", "Blue", "Boteh Jegheh", Guid.NewGuid());
}
