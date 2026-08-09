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
