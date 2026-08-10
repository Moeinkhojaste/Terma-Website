using AutoMapper;
using FluentValidation;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Application.Common.Models;
using Terma.Domain.Entities;

namespace Terma.Application.Products;

public interface IProductService
{
    Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken);
    Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class ProductService(
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator,
    IValidator<ProductListRequest> listValidator,
    IMapper mapper) : IProductService
{
    public async Task<PagedResult<ProductDto>> ListAsync(ProductListRequest request, CancellationToken cancellationToken)
    {
        await listValidator.ValidateAndThrowAsync(request, cancellationToken);
        var result = await productRepository.ListAsync(request, cancellationToken);
        return new PagedResult<ProductDto>(
            mapper.Map<IReadOnlyList<ProductDto>>(result.Items),
            result.Page,
            result.PageSize,
            result.TotalCount);
    }

    public async Task<ProductDto> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await GetProductAsync(id, cancellationToken);
        return mapper.Map<ProductDto>(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, null, cancellationToken);

        var product = CreateProduct(request);
        await productRepository.AddAsync(product, cancellationToken);
        await productRepository.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProductDto>(await GetProductAsync(product.Id, cancellationToken));
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var product = await GetProductAsync(id, cancellationToken);
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        await EnsureUniqueSkuAsync(request.Sku, id, cancellationToken);

        product.Update(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive);
        var defaultVariant = product.Variants.FirstOrDefault(variant => variant.Title == "تنوع پیش‌فرض");
        defaultVariant?.SyncFromLegacy(request.Sku, request.Color, request.TableCapacity, request.Length, request.Width, product.Price, request.StockQuantity, request.IsActive);
        await productRepository.SaveChangesAsync(cancellationToken);
        return mapper.Map<ProductDto>(await GetProductAsync(id, cancellationToken));
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await GetProductAsync(id, cancellationToken);
        product.Deactivate();
        await productRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<Product> GetProductAsync(Guid id, CancellationToken cancellationToken)
    {
        return await productRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Product '{id}' was not found.");
    }

    private async Task EnsureCategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        if (await categoryRepository.GetByIdAsync(categoryId, cancellationToken) is null)
        {
            throw new NotFoundException($"Category '{categoryId}' was not found.");
        }
    }

    private async Task EnsureUniqueSkuAsync(string sku, Guid? excludedId, CancellationToken cancellationToken)
    {
        if (await productRepository.SkuExistsAsync(sku.Trim().ToUpperInvariant(), excludedId, cancellationToken))
        {
            throw new ConflictException("A product with this SKU already exists.");
        }
    }

    private static Product CreateProduct(ProductWriteRequest request)
    {
        return new Product(request.Name, request.Sku, request.Description, request.Price, request.StockQuantity,
            request.TableCapacity, request.Length, request.Width, request.FabricType, request.LiningType,
            request.Color, request.Pattern, request.CategoryId, request.DiscountPercent, request.IsActive);
    }
}
