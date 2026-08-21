using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class ShippingRuleTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        var rule = new ShippingRule(
            name: "ارسال اختصاصی تهران",
            province: "تهران",
            city: "تهران",
            cost: 45_000,
            freeAboveSubtotal: 500_000,
            priority: 10,
            isActive: true);

        Assert.Equal("ارسال اختصاصی تهران", rule.Name);
        Assert.Equal("تهران", rule.Province);
        Assert.Equal("تهران", rule.City);
        Assert.Equal(45_000, rule.Cost);
        Assert.Equal(500_000, rule.FreeAboveSubtotal);
        Assert.Equal(10, rule.Priority);
        Assert.True(rule.IsActive);
    }

    [Fact]
    public void Constructor_ThrowsDomainException_OnInvalidData()
    {
        Assert.Throws<DomainException>(() => new ShippingRule("", "تهران", "تهران", 1000, null, 1));
        Assert.Throws<DomainException>(() => new ShippingRule("قانون", "تهران", "تهران", -10, null, 1));
        Assert.Throws<DomainException>(() => new ShippingRule("قانون", "تهران", "تهران", 1000, -500, 1));
    }

    [Fact]
    public void Matches_EvaluatesProvinceAndCityProperly()
    {
        var provinceRule = new ShippingRule("ارسال استانی یزد", "یزد", null, 60_000, null, 5);
        var cityRule = new ShippingRule("ارسال شهر مشهد", "خراسان رضوی", "مشهد", 40_000, null, 8);
        var globalRule = new ShippingRule("ارسال سراسری پست پیشتاز", null, null, 70_000, null, 1);

        // Province matching
        Assert.True(provinceRule.Matches("یزد", "میبد"));
        Assert.True(provinceRule.Matches("  یزد  ", "اردکان"));
        Assert.False(provinceRule.Matches("تهران", "تهران"));

        // City & Province matching
        Assert.True(cityRule.Matches("خراسان رضوی", "مشهد"));
        Assert.False(cityRule.Matches("خراسان رضوی", "نیشابور"));

        // Global rule matches any location
        Assert.True(globalRule.Matches("اصفهان", "کاشان"));
        Assert.True(globalRule.Matches("فارس", "شیراز"));

        // Inactive rule does not match
        globalRule.SetActive(false);
        Assert.False(globalRule.Matches("اصفهان", "کاشان"));
    }

    [Fact]
    public void Calculate_ConsidersFreeAboveThreshold()
    {
        var rule = new ShippingRule("ارسال تهران با آستانه رایگان", "تهران", "تهران", 50_000, 1_000_000, 10);

        // Below threshold
        Assert.Equal(50_000, rule.Calculate(800_000));

        // Exactly at threshold
        Assert.Equal(0, rule.Calculate(1_000_000));

        // Above threshold
        Assert.Equal(0, rule.Calculate(1_500_000));
    }

    [Fact]
    public void Update_ModifiesPropertiesCorrectly()
    {
        var rule = new ShippingRule("قانون قدیم", "البرز", "کرج", 30_000, null, 1);
        rule.Update("قانون جدید", "البرز", null, 40_000, 700_000, 2, false);

        Assert.Equal("قانون جدید", rule.Name);
        Assert.Null(rule.City);
        Assert.Equal(40_000, rule.Cost);
        Assert.Equal(700_000, rule.FreeAboveSubtotal);
        Assert.Equal(2, rule.Priority);
        Assert.False(rule.IsActive);
    }
}
