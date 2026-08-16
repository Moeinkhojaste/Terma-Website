using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class CustomerAddressTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        var userId = Guid.NewGuid();
        var address = new CustomerAddress(
            userId: userId,
            title: "دفتر کار",
            receiverName: "علی رضایی",
            receiverPhone: "09121234567",
            province: "تهران",
            city: "تهران",
            address: "خیابان آزادی، خیابان حبیب‌الله، پلاک ۱",
            postalCode: "1458812345",
            isDefault: true);

        Assert.Equal(userId, address.UserId);
        Assert.Equal("دفتر کار", address.Title);
        Assert.Equal("علی رضایی", address.ReceiverName);
        Assert.Equal("09121234567", address.ReceiverPhone);
        Assert.Equal("تهران", address.Province);
        Assert.Equal("تهران", address.City);
        Assert.Equal("خیابان آزادی، خیابان حبیب‌الله، پلاک ۱", address.Address);
        Assert.Equal("1458812345", address.PostalCode);
        Assert.True(address.IsDefault);
    }

    [Fact]
    public void Constructor_ThrowsDomainException_OnMissingRequiredFields()
    {
        var userId = Guid.NewGuid();

        // Empty userId
        Assert.Throws<DomainException>(() => new CustomerAddress(Guid.Empty, "title", "name", "0912", "P", "C", "A", "123"));

        // Empty receiver name
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "", "0912", "P", "C", "A", "123"));

        // Empty phone
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "name", "", "P", "C", "A", "123"));

        // Empty province
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "name", "0912", "", "C", "A", "123"));

        // Empty city
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "name", "0912", "P", "", "A", "123"));

        // Empty address
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "name", "0912", "P", "C", "", "123"));

        // Empty postal code
        Assert.Throws<DomainException>(() => new CustomerAddress(userId, "title", "name", "0912", "P", "C", "A", ""));
    }

    [Fact]
    public void SetDefault_UpdatesDefaultFlagCorrectly()
    {
        var address = new CustomerAddress(Guid.NewGuid(), "منزل", "نام", "0912", "تهران", "تهران", "آدرس", "12345", isDefault: false);
        Assert.False(address.IsDefault);

        address.SetDefault(true);
        Assert.True(address.IsDefault);

        address.SetDefault(false);
        Assert.False(address.IsDefault);
    }
}
