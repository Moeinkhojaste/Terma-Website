using Terma.Domain.Exceptions;
using Terma.Domain.Services;

namespace Terma.UnitTests.Domain;

public sealed class IranianPhoneNumberTests
{
    [Theory]
    [InlineData("09121234567")]
    [InlineData("+989121234567")]
    [InlineData("00989121234567")]
    [InlineData("۰۹۱۲۱۲۳۴۵۶۷")]
    [InlineData("٠٩١٢١٢٣٤٥٦٧")]
    public void Normalize_AcceptsSupportedIranianFormats(string value) =>
        Assert.Equal("989121234567", IranianPhoneNumber.Normalize(value));

    [Theory]
    [InlineData("")]
    [InlineData("02112345678")]
    [InlineData("0912123")]
    public void Normalize_RejectsInvalidNumbers(string value) =>
        Assert.Throws<DomainException>(() => IranianPhoneNumber.Normalize(value));
}
