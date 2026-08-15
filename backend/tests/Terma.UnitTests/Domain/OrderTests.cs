using Terma.Domain.Entities;

namespace Terma.UnitTests.Domain;

public sealed class OrderTests
{
    [Theory]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Preparing)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Shipped)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Delivered)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Expired)]
    [InlineData(OrderStatus.Expired, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Expired, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Expired, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Expired, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Expired, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Expired, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled)]
    public void CanTransitionTo_BetweenAnyStatuses_ReturnsTrue(OrderStatus from, OrderStatus to)
    {
        var order = CreateOrder();
        if (from != OrderStatus.PendingConfirmation)
        {
            order.ChangeStatus(from);
        }

        Assert.True(order.CanTransitionTo(to));
    }

    [Theory]
    [InlineData(OrderStatus.Expired, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Expired, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Shipped)]
    public void ChangeStatus_TransitionsSuccessfully(OrderStatus initial, OrderStatus target)
    {
        var order = CreateOrder();
        order.ChangeStatus(initial);
        var initialUpdatedAt = order.UpdatedAt;

        order.ChangeStatus(target);

        Assert.Equal(target, order.Status);
        Assert.NotNull(order.UpdatedAt);
    }

    [Fact]
    public void ChangeStatus_ToSameStatus_DoesNotChangeUpdatedAt()
    {
        var order = CreateOrder();
        order.ChangeStatus(OrderStatus.Confirmed);
        var updatedAt = order.UpdatedAt;

        order.ChangeStatus(OrderStatus.Confirmed);

        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(updatedAt, order.UpdatedAt);
    }

    private static Order CreateOrder()
    {
        var customer = new Customer("Test Customer", "09121234567", "test@example.com");
        return new Order(
            "TRM-20260816-123456",
            customer,
            "Tehran",
            "Tehran",
            "Valiasr St, No 123",
            "1234567890",
            1_000_000,
            0,
            50_000,
            DateTime.UtcNow.AddHours(24),
            null,
            "Please deliver in morning");
    }
}
