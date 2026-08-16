using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.UnitTests.Application;

public sealed class StoreValidatorsTests
{
    [Fact]
    public async Task CheckoutRequestValidator_ValidatesIranianPhoneAndPostalCode()
    {
        var validator = new CheckoutRequestValidator();

        var validReq = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(Guid.NewGuid(), null, 2)],
            FullName = "احمد محمدی",
            Phone = "09121234567",
            Email = "ahmad@example.com",
            Province = "یزد",
            City = "یزد",
            Address = "خیابان امام خمینی، کوچه ترنج، پلاک ۵",
            PostalCode = "8916712345"
        };

        var validRes = await validator.ValidateAsync(validReq);
        Assert.True(validRes.IsValid);

        // Invalid phone & invalid postal code
        var invalidReq = new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(Guid.NewGuid(), null, 2)],
            FullName = "احمد محمدی",
            Phone = "123456",
            Email = "ahmad@example.com",
            Province = "یزد",
            City = "یزد",
            Address = "خیابان امام خمینی، کوچه ترنج، پلاک ۵",
            PostalCode = "123" // not 10 digits
        };
        var invalidRes = await validator.ValidateAsync(invalidReq);
        Assert.False(invalidRes.IsValid);
        Assert.Contains(invalidRes.Errors, e => e.PropertyName == nameof(CheckoutRequest.Phone));
        Assert.Contains(invalidRes.Errors, e => e.PropertyName == nameof(CheckoutRequest.PostalCode));
    }

    [Fact]
    public async Task PromotionWriteRequestValidator_ValidatesCouponCodeAndPercentageRange()
    {
        var validator = new PromotionWriteRequestValidator();

        // Coupon without code
        var noCodeCoupon = new PromotionWriteRequest
        {
            Name = "تخفیف کوپنی",
            Code = "",
            Type = PromotionType.Coupon,
            DiscountType = DiscountType.Percentage,
            Value = 20,
            StartsAtUtc = DateTime.UtcNow
        };
        var res1 = await validator.ValidateAsync(noCodeCoupon);
        Assert.False(res1.IsValid);
        Assert.Contains(res1.Errors, e => e.PropertyName == nameof(PromotionWriteRequest.Code));

        // Percentage > 100
        var invalidPercent = new PromotionWriteRequest
        {
            Name = "تخفیف نامعتبر",
            Code = "SAVE150",
            Type = PromotionType.Coupon,
            DiscountType = DiscountType.Percentage,
            Value = 150,
            StartsAtUtc = DateTime.UtcNow
        };
        var res2 = await validator.ValidateAsync(invalidPercent);
        Assert.False(res2.IsValid);
        Assert.Contains(res2.Errors, e => e.PropertyName == nameof(PromotionWriteRequest.Value));

        // Valid promotion
        var valid = new PromotionWriteRequest
        {
            Name = "تخفیف معتبر",
            Code = "SAVE20",
            Type = PromotionType.Coupon,
            DiscountType = DiscountType.Percentage,
            Value = 20,
            StartsAtUtc = DateTime.UtcNow,
            EndsAtUtc = DateTime.UtcNow.AddDays(7)
        };
        var res3 = await validator.ValidateAsync(valid);
        Assert.True(res3.IsValid);
    }

    [Fact]
    public async Task ShippingRuleWriteRequestValidator_ValidatesRequiredFields()
    {
        var validator = new ShippingRuleWriteRequestValidator();

        var invalid = new ShippingRuleWriteRequest
        {
            Name = "",
            Cost = -100,
            FreeAboveSubtotal = -500
        };
        var res = await validator.ValidateAsync(invalid);
        Assert.False(res.IsValid);
        Assert.Contains(res.Errors, e => e.PropertyName == nameof(ShippingRuleWriteRequest.Name));
        Assert.Contains(res.Errors, e => e.PropertyName == nameof(ShippingRuleWriteRequest.Cost));
        Assert.Contains(res.Errors, e => e.PropertyName == nameof(ShippingRuleWriteRequest.FreeAboveSubtotal));
    }

    [Fact]
    public async Task ContactMessageWriteRequestValidator_ValidatesIranianPhoneAndLength()
    {
        var validator = new ContactMessageWriteRequestValidator();

        var valid = new ContactMessageWriteRequest
        {
            Name = "محمد",
            Phone = "09351234567",
            Topic = "مشاوره خرید",
            Body = "سلام، در خصوص شستشوی ترمه راهنمایی می‌خواستم."
        };
        Assert.True((await validator.ValidateAsync(valid)).IsValid);

        var invalid = new ContactMessageWriteRequest
        {
            Name = "م", // too short
            Phone = "000000",
            Topic = "",
            Body = "کوتاه" // < 5 chars
        };
        var res = await validator.ValidateAsync(invalid);
        Assert.False(res.IsValid);
        Assert.Equal(4, res.Errors.Count);
    }
}
