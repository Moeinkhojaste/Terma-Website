using FluentValidation;

namespace Terma.Application.Store;

public sealed class CheckoutItemRequestValidator : AbstractValidator<CheckoutItemRequest>
{
    public CheckoutItemRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).InclusiveBetween(1, 100);
    }
}

public sealed class CheckoutRequestValidator : AbstractValidator<CheckoutRequest>
{
    public CheckoutRequestValidator()
    {
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one product is required.");
        RuleForEach(x => x.Items).SetValidator(new CheckoutItemRequestValidator());
        RuleFor(x => x.FullName).NotEmpty().Length(3, 200);
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^(09\d{9}|989\d{9}|\+989\d{9})$").WithMessage("A valid Iranian mobile number is required.");
        RuleFor(x => x.Email).EmailAddress().MaximumLength(320).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Province).NotEmpty().Length(2, 120);
        RuleFor(x => x.City).NotEmpty().Length(2, 120);
        RuleFor(x => x.Address).NotEmpty().Length(10, 1000);
        RuleFor(x => x.PostalCode).NotEmpty().Matches(@"^[\d\u06F0-\u06F9\u0660-\u0669]{10}$").WithMessage("A valid 10-digit postal code is required.");
        RuleFor(x => x.CustomerNotes).MaximumLength(1000);
        RuleFor(x => x.CouponCode).MaximumLength(50);
    }
}

public sealed class ProductVariantWriteRequestValidator : AbstractValidator<ProductVariantWriteRequest>
{
    public ProductVariantWriteRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(160);
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Color).NotEmpty().MaximumLength(120);
        RuleFor(x => x.TableCapacity).GreaterThan(0);
        RuleFor(x => x.Length).GreaterThan(0);
        RuleFor(x => x.Width).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.CompareAtPrice)
            .GreaterThanOrEqualTo(x => x.Price)
            .When(x => x.CompareAtPrice.HasValue);
        RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0);
    }
}

public sealed class ProductMediaWriteRequestValidator : AbstractValidator<ProductMediaWriteRequest>
{
    public ProductMediaWriteRequestValidator()
    {
        RuleFor(x => x.PublicUrl).NotEmpty().MaximumLength(1024).Must(uri => uri.StartsWith("/api/media/") || uri.StartsWith("http://") || uri.StartsWith("https://")).WithMessage("A valid media URL is required.");
        RuleFor(x => x.AltText).NotEmpty().MaximumLength(500);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class PromotionWriteRequestValidator : AbstractValidator<PromotionWriteRequest>
{
    public PromotionWriteRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Code).MaximumLength(50);
        RuleFor(x => x.Code)
            .NotEmpty()
            .When(x => x.Type == Domain.Entities.PromotionType.Coupon)
            .WithMessage("Coupon code is required for coupon promotions.");
        RuleFor(x => x.Value).GreaterThan(0);
        RuleFor(x => x.Value)
            .InclusiveBetween(1, 100)
            .When(x => x.DiscountType == Domain.Entities.DiscountType.Percentage);
        RuleFor(x => x.MinimumSubtotal).GreaterThanOrEqualTo(0).When(x => x.MinimumSubtotal.HasValue);
        RuleFor(x => x.MaximumDiscount).GreaterThan(0).When(x => x.MaximumDiscount.HasValue);
        RuleFor(x => x.UsageLimit).GreaterThan(0).When(x => x.UsageLimit.HasValue);
        RuleFor(x => x.EndsAtUtc)
            .GreaterThan(x => x.StartsAtUtc)
            .When(x => x.EndsAtUtc.HasValue);
    }
}

public sealed class ShippingRuleWriteRequestValidator : AbstractValidator<ShippingRuleWriteRequest>
{
    public ShippingRuleWriteRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Province).MaximumLength(120);
        RuleFor(x => x.City).MaximumLength(120);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.FreeAboveSubtotal).GreaterThanOrEqualTo(0).When(x => x.FreeAboveSubtotal.HasValue);
        RuleFor(x => x.Priority).GreaterThanOrEqualTo(0);
    }
}

public sealed class StoreContentWriteRequestValidator : AbstractValidator<StoreContentWriteRequest>
{
    public StoreContentWriteRequestValidator()
    {
        RuleFor(x => x.PageKey).NotEmpty().MaximumLength(80);
        RuleFor(x => x.SectionKey).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Body).NotEmpty().MaximumLength(10000);
        RuleFor(x => x.LinkUrl).MaximumLength(1000);
        RuleFor(x => x.ImageUrl).MaximumLength(1000);
        RuleFor(x => x.SeoTitle).MaximumLength(200);
        RuleFor(x => x.SeoDescription).MaximumLength(500);
    }
}

public sealed class ContactMessageWriteRequestValidator : AbstractValidator<ContactMessageWriteRequest>
{
    public ContactMessageWriteRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().Length(2, 160);
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^(09\d{9}|989\d{9}|\+989\d{9})$").WithMessage("A valid Iranian mobile number is required.");
        RuleFor(x => x.Email).EmailAddress().MaximumLength(320).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Topic).NotEmpty().Length(2, 160);
        RuleFor(x => x.Body).NotEmpty().Length(5, 4000);
    }
}

public sealed class UpdatePackagingSettingsRequestValidator : AbstractValidator<UpdatePackagingSettingsRequest>
{
    public UpdatePackagingSettingsRequestValidator()
    {
        RuleFor(x => x.GiftPackagingPrice).GreaterThanOrEqualTo(0);
    }
}

