using AutoMapper;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Mapping;
using Terma.Application.Products;
using Terma.Domain.Entities;

namespace Terma.UnitTests.Application;

public sealed class ProductServiceTests
{
    [Fact]
    public async Task Create_WhenSkuExists_ThrowsConflict()
    {
        var category = new Category("Tablecloths", null);
        var products = new Mock<IProductRepository>();
        var categories = new Mock<ICategoryRepository>();
        categories.Setup(repository => repository.GetByIdAsync(category.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(category);
        products.Setup(repository => repository.SkuExistsAsync("TER-001", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var service = CreateService(products.Object, categories.Object);

        var action = () => service.CreateAsync(ValidRequest(category.Id), CancellationToken.None);

        await Assert.ThrowsAsync<ConflictException>(action);
        products.Verify(repository => repository.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void Product_WithDiscountPercent_CalculatesDiscountedPrice()
    {
        var categoryId = Guid.NewGuid();
        var product = new Product("Nila", "TER-001", "desc", 1_000_000, 5, 4, 150, 180, "Termeh", "Satin", "Blue", "Boteh", categoryId, 20);

        Assert.Equal(20, product.DiscountPercent);
        Assert.Equal(1_000_000, product.CompareAtPrice);
        Assert.Equal(800_000, product.Price);
    }

    [Fact]
    public async Task Update_WhenPriceAndDiscountChanged_SyncsDefaultVariantSuccessfully()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Tablecloths", null);
        var product = new Product("Sabz 006", "TER-006-6P", "desc", 1_900_000, 1, 6, 160, 110, "Termeh", "Satin", "Green", "Boteh", categoryId, 15);
        
        var products = new Mock<IProductRepository>();
        var categories = new Mock<ICategoryRepository>();
        categories.Setup(r => r.GetByIdAsync(categoryId, It.IsAny<CancellationToken>())).ReturnsAsync(category);
        products.Setup(r => r.GetByIdAsync(product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(product);
        products.Setup(r => r.SkuExistsAsync(It.IsAny<string>(), product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        products.Setup(r => r.SlugExistsAsync(It.IsAny<string>(), product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = CreateService(products.Object, categories.Object);

        var updateRequest = new UpdateProductRequest
        {
            Name = "Sabz 006",
            Sku = "TER-006-6P",
            Price = 3_000_000,
            DiscountPercent = 15,
            StockQuantity = 1,
            TableCapacity = 6,
            Length = 160,
            Width = 110,
            FabricType = "Termeh",
            LiningType = "Satin",
            Color = "Green",
            Pattern = "Boteh",
            CategoryId = categoryId,
            IsActive = true,
        };

        var result = await service.UpdateAsync(product.Id, updateRequest, CancellationToken.None);

        Assert.Equal(2_550_000, product.Price);
        Assert.Equal(3_000_000, product.CompareAtPrice);
        Assert.Equal(15, product.DiscountPercent);

        var defaultVariant = product.Variants.First(v => v.Title == "تنوع پیش‌فرض");
        Assert.Equal(2_550_000, defaultVariant.Price);
        Assert.Equal(3_000_000, defaultVariant.CompareAtPrice);
    }

    [Fact]
    public async Task Update_WhenDiscountRemoved_ClearsDefaultVariantCompareAtPrice()
    {
        var categoryId = Guid.NewGuid();
        var category = new Category("Tablecloths", null);
        var product = new Product("Sabz 006", "TER-006-6P", "desc", 1_900_000, 1, 6, 160, 110, "Termeh", "Satin", "Green", "Boteh", categoryId, 15);
        
        var products = new Mock<IProductRepository>();
        var categories = new Mock<ICategoryRepository>();
        categories.Setup(r => r.GetByIdAsync(categoryId, It.IsAny<CancellationToken>())).ReturnsAsync(category);
        products.Setup(r => r.GetByIdAsync(product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(product);
        products.Setup(r => r.SkuExistsAsync(It.IsAny<string>(), product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        products.Setup(r => r.SlugExistsAsync(It.IsAny<string>(), product.Id, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var service = CreateService(products.Object, categories.Object);

        var updateRequest = new UpdateProductRequest
        {
            Name = "Sabz 006",
            Sku = "TER-006-6P",
            Price = 3_000_000,
            DiscountPercent = null,
            StockQuantity = 1,
            TableCapacity = 6,
            Length = 160,
            Width = 110,
            FabricType = "Termeh",
            LiningType = "Satin",
            Color = "Green",
            Pattern = "Boteh",
            CategoryId = categoryId,
            IsActive = true,
        };

        await service.UpdateAsync(product.Id, updateRequest, CancellationToken.None);

        Assert.Equal(3_000_000, product.Price);
        Assert.Null(product.CompareAtPrice);
        Assert.Null(product.DiscountPercent);

        var defaultVariant = product.Variants.First(v => v.Title == "تنوع پیش‌فرض");
        Assert.Equal(3_000_000, defaultVariant.Price);
        Assert.Null(defaultVariant.CompareAtPrice);
    }

    [Fact]
    public void AutoMapperConfiguration_IsValid()
    {
        using var provider = CreateMapperProvider();
        var configuration = provider.GetRequiredService<IConfigurationProvider>();

        configuration.AssertConfigurationIsValid();
    }

    private static ProductService CreateService(IProductRepository products, ICategoryRepository categories)
    {
        var provider = CreateMapperProvider();
        return new ProductService(
            products,
            categories,
            new CreateProductRequestValidator(),
            new UpdateProductRequestValidator(),
            new ProductListRequestValidator(),
            provider.GetRequiredService<IMapper>());
    }

    private static ServiceProvider CreateMapperProvider()
    {
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddAutoMapper(_ => { }, typeof(CatalogMappingProfile).Assembly);
        return services.BuildServiceProvider();
    }

    private static CreateProductRequest ValidRequest(Guid categoryId) => new()
    {
        Name = "Nila",
        Sku = " ter-001 ",
        Price = 1_500_000,
        StockQuantity = 3,
        TableCapacity = 4,
        Length = 150,
        Width = 180,
        FabricType = "Termeh",
        LiningType = "Satin",
        Color = "Blue",
        Pattern = "Boteh Jegheh",
        CategoryId = categoryId
    };
}
