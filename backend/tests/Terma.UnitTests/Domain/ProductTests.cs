using Terma.Domain.Entities;
using Terma.Domain.Exceptions;
using Xunit;

namespace Terma.UnitTests.Domain;

public class ProductTests
{
    [Fact]
    public void CreateProduct_WithValidParameters_ShouldSucceed()
    {
        var product = new Product("ترمه نیلا", "nila", "توضیحات", 1250000m, 4, "/images/nila.jpg");

        Assert.NotNull(product);
        Assert.Equal("ترمه نیلا", product.Name);
        Assert.Equal(1250000m, product.Price);
        Assert.True(product.IsActive);
    }

    [Fact]
    public void CreateProduct_WithNegativePrice_ShouldThrowDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new Product("ترمه نیلا", "nila", "توضیحات", -100m, 4, "/images/nila.jpg"));
    }

    [Fact]
    public void CreateProduct_WithEmptyName_ShouldThrowDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new Product("", "nila", "توضیحات", 100m, 4, "/images/nila.jpg"));
    }
}
