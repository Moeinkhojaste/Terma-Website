using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class PromotionTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly_ForPercentageCoupon()
    {
        var start = DateTime.UtcNow.AddDays(-1);
        var end = DateTime.UtcNow.AddDays(10);
        var promo = new Promotion(
            name: "تخفیف نوروزی",
            code: "norooz1403",
            type: PromotionType.Coupon,
            discountType: DiscountType.Percentage,
            value: 20,
            minimumSubtotal: 100_000,
            maximumDiscount: 50_000,
            usageLimit: 100,
            startsAtUtc: start,
            endsAtUtc: end,
            isActive: true);

        Assert.Equal("تخفیف نوروزی", promo.Name);
        Assert.Equal("NOROOZ1403", promo.Code);
        Assert.Equal(PromotionType.Coupon, promo.Type);
        Assert.Equal(DiscountType.Percentage, promo.DiscountType);
        Assert.Equal(20, promo.Value);
        Assert.Equal(100_000, promo.MinimumSubtotal);
        Assert.Equal(50_000, promo.MaximumDiscount);
        Assert.Equal(100, promo.UsageLimit);
        Assert.Equal(0, promo.UsageCount);
        Assert.True(promo.IsActive);
    }

    [Fact]
    public void Constructor_ThrowsDomainException_OnInvalidData()
    {
        // Empty Name
        Assert.Throws<DomainException>(() => new Promotion("", "CODE", PromotionType.Coupon, DiscountType.FixedAmount, 1000, null, null, null, DateTime.UtcNow, null));

        // Coupon without code
        Assert.Throws<DomainException>(() => new Promotion("Test", "", PromotionType.Coupon, DiscountType.FixedAmount, 1000, null, null, null, DateTime.UtcNow, null));

        // Value <= 0
        Assert.Throws<DomainException>(() => new Promotion("Test", "CODE", PromotionType.Coupon, DiscountType.FixedAmount, 0, null, null, null, DateTime.UtcNow, null));

        // Percentage > 100
        Assert.Throws<DomainException>(() => new Promotion("Test", "CODE", PromotionType.Coupon, DiscountType.Percentage, 105, null, null, null, DateTime.UtcNow, null));

        // Negative min subtotal
        Assert.Throws<DomainException>(() => new Promotion("Test", "CODE", PromotionType.Coupon, DiscountType.FixedAmount, 100, -50, null, null, DateTime.UtcNow, null));

        // Starts after End
        Assert.Throws<DomainException>(() => new Promotion("Test", "CODE", PromotionType.Coupon, DiscountType.FixedAmount, 100, null, null, null, DateTime.UtcNow.AddDays(5), DateTime.UtcNow.AddDays(1)));
    }

    [Fact]
    public void Applies_EvaluatesCorrectly()
    {
        var now = DateTime.UtcNow;
        var promo = new Promotion(
            "تخفیف خودکار",
            null,
            PromotionType.Automatic,
            DiscountType.Percentage,
            15,
            minimumSubtotal: 200_000,
            maximumDiscount: null,
            usageLimit: 5,
            startsAtUtc: now.AddHours(-1),
            endsAtUtc: now.AddHours(2),
            isActive: true);

        // Valid conditions
        Assert.True(promo.Applies(null, 250_000, now));

        // Subtotal below minimum
        Assert.False(promo.Applies(null, 150_000, now));

        // Before start
        Assert.False(promo.Applies(null, 300_000, now.AddHours(-2)));

        // After end
        Assert.False(promo.Applies(null, 300_000, now.AddHours(3)));

        // Inactive
        promo.SetActive(false);
        Assert.False(promo.Applies(null, 300_000, now));
    }

    [Fact]
    public void Calculate_AppliesPercentageAndCappedDiscount()
    {
        var promo = new Promotion(
            "تخفیف درصدی با سقف",
            "SAVE50",
            PromotionType.Coupon,
            DiscountType.Percentage,
            50,
            minimumSubtotal: 0,
            maximumDiscount: 100_000,
            usageLimit: 10,
            startsAtUtc: DateTime.UtcNow.AddDays(-1),
            endsAtUtc: null,
            isActive: true);

        // 50% of 100,000 is 50,000 (below cap)
        Assert.Equal(50_000, promo.Calculate(100_000));

        // 50% of 400,000 is 200,000, but capped at 100,000
        Assert.Equal(100_000, promo.Calculate(400_000));
    }

    [Fact]
    public void Calculate_AppliesFixedAmountDiscount()
    {
        var promo = new Promotion(
            "تخفیف نقدی",
            "CASH30",
            PromotionType.Coupon,
            DiscountType.FixedAmount,
            30_000,
            minimumSubtotal: 0,
            maximumDiscount: null,
            usageLimit: null,
            startsAtUtc: DateTime.UtcNow.AddDays(-1),
            endsAtUtc: null,
            isActive: true);

        Assert.Equal(30_000, promo.Calculate(200_000));
    }

    [Fact]
    public void IncrementUsage_TracksCountAndEnforcesLimit()
    {
        var promo = new Promotion(
            "تخفیف محدود",
            "LIMIT2",
            PromotionType.Coupon,
            DiscountType.FixedAmount,
            10_000,
            null,
            null,
            usageLimit: 2,
            startsAtUtc: DateTime.UtcNow.AddDays(-1),
            endsAtUtc: null,
            isActive: true);

        Assert.Equal(0, promo.UsageCount);
        promo.IncrementUsage();
        Assert.Equal(1, promo.UsageCount);
        promo.IncrementUsage();
        Assert.Equal(2, promo.UsageCount);

        Assert.Throws<DomainException>(() => promo.IncrementUsage());
        Assert.False(promo.Applies("LIMIT2", 50_000, DateTime.UtcNow));
    }
}
