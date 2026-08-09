using Terma.Application.Categories;
using Terma.Application.Products;

namespace Terma.UnitTests.Application;

public sealed class ValidationTests
{
    [Fact]
    public async Task ProductValidator_RejectsInvalidCatalogValues()
    {
        var request = new CreateProductRequest
        {
            Name = "",
            Sku = "",
            Price = 0,
            StockQuantity = -1,
            TableCapacity = 0,
            Length = 0,
            Width = -1,
            CategoryId = Guid.Empty
        };

        var result = await new CreateProductRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.Price));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.StockQuantity));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.CategoryId));
    }

    [Fact]
    public async Task CategoryValidator_RejectsMissingName()
    {
        var result = await new CreateCategoryRequestValidator().ValidateAsync(new CreateCategoryRequest());

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(CreateCategoryRequest.Name));
    }

    [Fact]
    public async Task ProductListValidator_RejectsInvalidRangeAndPagination()
    {
        var request = new ProductListRequest { MinPrice = 20, MaxPrice = 10, Page = 0, PageSize = 101 };

        var result = await new ProductListRequestValidator().ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.MaxPrice));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.Page));
        Assert.Contains(result.Errors, error => error.PropertyName == nameof(request.PageSize));
    }
}
