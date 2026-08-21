using FluentValidation;

namespace Terma.Application.Products;

public abstract class ProductWriteRequestValidator<TRequest> : AbstractValidator<TRequest>
    where TRequest : ProductWriteRequest
{
    protected ProductWriteRequestValidator()
    {
        RuleFor(request => request.Name).NotEmpty().MaximumLength(200);
        RuleFor(request => request.Slug).MaximumLength(160);
        RuleFor(request => request.Sku).NotEmpty().MaximumLength(64);
        RuleFor(request => request.Description).MaximumLength(4000);
        RuleFor(request => request.Price).GreaterThan(0);
        RuleFor(request => request.DiscountPercent)
            .InclusiveBetween(1, 99)
            .When(request => request.DiscountPercent.HasValue && request.DiscountPercent.Value > 0);
        RuleFor(request => request.StockQuantity).GreaterThanOrEqualTo(0);
        RuleFor(request => request.TableCapacity).GreaterThan(0);
        RuleFor(request => request.Length).GreaterThan(0);
        RuleFor(request => request.Width).GreaterThan(0);
        RuleFor(request => request.FabricType).NotEmpty().MaximumLength(150);
        RuleFor(request => request.LiningType).NotEmpty().MaximumLength(150);
        RuleFor(request => request.Color).NotEmpty().MaximumLength(300);
        RuleFor(request => request.Pattern).NotEmpty().MaximumLength(500);
        RuleFor(request => request.CategoryId).NotEmpty();
    }
}

public sealed class CreateProductRequestValidator : ProductWriteRequestValidator<CreateProductRequest>;
public sealed class UpdateProductRequestValidator : ProductWriteRequestValidator<UpdateProductRequest>;

public sealed class ProductListRequestValidator : AbstractValidator<ProductListRequest>
{
    public ProductListRequestValidator()
    {
        RuleFor(request => request.MinPrice).GreaterThanOrEqualTo(0).When(request => request.MinPrice.HasValue);
        RuleFor(request => request.MaxPrice).GreaterThanOrEqualTo(0).When(request => request.MaxPrice.HasValue);
        RuleFor(request => request.MaxPrice)
            .GreaterThanOrEqualTo(request => request.MinPrice!.Value)
            .When(request => request.MinPrice.HasValue && request.MaxPrice.HasValue);
        RuleFor(request => request.TableCapacity).GreaterThan(0).When(request => request.TableCapacity.HasValue);
        RuleFor(request => request.Color).MaximumLength(120);
        RuleFor(request => request.Search).MaximumLength(200);
        RuleFor(request => request.Sort).MaximumLength(50);
        RuleFor(request => request.CategorySlug).MaximumLength(160);
        RuleFor(request => request.Page).GreaterThanOrEqualTo(1);
        RuleFor(request => request.PageSize).InclusiveBetween(1, 100);
    }
}
