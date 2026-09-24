using Terma.Domain.Entities;
using Xunit;

namespace Terma.UnitTests.Domain;

public sealed class OrderItemPackagingTests
{
    [Fact]
    public void OrderItem_DefaultPackaging_HasStandardTypeAndZeroFee()
    {
        var item = new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "رومیزی ترمه", "TRM-01", 500000m, 2);

        Assert.Equal(PackagingType.Standard, item.PackagingType);
        Assert.Equal(0m, item.PackagingFee);
        Assert.Equal(1000000m, item.LineTotal);
    }

    [Fact]
    public void OrderItem_GiftPackaging_CalculatesLineTotalWithPackagingFee()
    {
        var unitPrice = 750000m;
        var packagingFee = 200000m;
        var quantity = 3;

        var item = new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "رومیزی ترمه کادویی",
            "TRM-02",
            unitPrice,
            quantity,
            PackagingType.GiftBox,
            packagingFee);

        Assert.Equal(PackagingType.GiftBox, item.PackagingType);
        Assert.Equal(packagingFee, item.PackagingFee);
        Assert.Equal((unitPrice + packagingFee) * quantity, item.LineTotal);
    }

    [Fact]
    public void OrderItem_NegativePackagingFee_ClampsToZero()
    {
        var item = new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "رومیزی ترمه",
            "TRM-03",
            400000m,
            1,
            PackagingType.Standard,
            -50000m);

        Assert.Equal(0m, item.PackagingFee);
        Assert.Equal(400000m, item.LineTotal);
    }

    [Fact]
    public void Order_PackagingTotal_SumsPackagingFeeAcrossAllItems()
    {
        var customer = new Customer("مشتری تست", "09123456789", null);
        var order = new Order(
            "TRM-TEST-01",
            customer,
            "تهران",
            "تهران",
            "خیابان آزادی",
            "1234567890",
            subtotal: 2150000m,
            discountTotal: 0m,
            shippingTotal: 45000m,
            reservationExpiresAtUtc: DateTime.UtcNow.AddHours(24));

        var standardItem = new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "کالای عادی", "SKU-STD", 500000m, 1, PackagingType.Standard, 0m);
        var giftItem1 = new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "کالای کادویی ۱", "SKU-GFT1", 600000m, 2, PackagingType.GiftBox, 200000m);
        var giftItem2 = new OrderItem(Guid.NewGuid(), Guid.NewGuid(), "کالای کادویی ۲", "SKU-GFT2", 250000m, 1, PackagingType.GiftBox, 200000m);

        order.AddItem(standardItem);
        order.AddItem(giftItem1);
        order.AddItem(giftItem2);

        // Expected packaging total: (0 * 1) + (200000 * 2) + (200000 * 1) = 600000
        Assert.Equal(600000m, order.PackagingTotal);
    }
}
