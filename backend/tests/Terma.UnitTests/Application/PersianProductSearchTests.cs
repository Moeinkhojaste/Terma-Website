using Terma.Application.Products;

namespace Terma.UnitTests.Application;

public sealed class PersianProductSearchTests
{
    [Theory]
    [InlineData("سفره ۶ نفره", 6)]
    [InlineData("سفره 6 نفره", 6)]
    [InlineData("سفره ٦ نفره", 6)]
    public void Parse_NormalizesDigitsAndExtractsCapacity(string query, int expected)
    {
        var result = PersianProductSearch.Parse(query);

        Assert.Equal(expected, result.TableCapacity);
        Assert.Contains("سفره", result.Terms);
    }

    [Fact]
    public void Parse_ExtractsPersianWordPrice()
    {
        var result = PersianProductSearch.Parse("سفره زیر دو میلیون");

        Assert.Equal(2_000_000m, result.MaximumPrice);
        Assert.Contains("سفره", result.Terms);
        Assert.DoesNotContain("دو", result.Terms);
    }

    [Fact]
    public void Normalize_ConvertsArabicLettersAndHalfSpaces()
    {
        Assert.Equal("ترمه ی آبی", PersianProductSearch.Normalize("ترمه‌ی آبي"));
    }
}
