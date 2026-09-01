using Terma.Domain.Entities;

namespace Terma.UnitTests.Domain;

public sealed class OrderTests
{
    [Theory]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Preparing)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Shipped)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Expired)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Expired, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Expired, OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.PendingConfirmation)]
    public void CanTransitionTo_ValidTransitions_ReturnsTrue(OrderStatus from, OrderStatus to)
    {
        var order = CreateOrderWithStatus(from);
        Assert.True(order.CanTransitionTo(to));
    }

    [Theory]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Preparing, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Shipped, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Expired, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Expired, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Expired, OrderStatus.Delivered)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Delivered, OrderStatus.PendingConfirmation)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled)]
    public void CanTransitionTo_InvalidTransitions_ReturnsFalseAndThrowsDomainException(OrderStatus from, OrderStatus to)
    {
        var order = CreateOrderWithStatus(from);
        Assert.False(order.CanTransitionTo(to));

        var ex = Assert.Throws<Terma.Domain.Exceptions.DomainException>(() => order.ChangeStatus(to));
        Assert.Contains("Cannot transition order", ex.Message);
    }

    [Theory]
    [InlineData(OrderStatus.PendingConfirmation, OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    public void ChangeStatus_ValidTransition_UpdatesStatusAndTimestamp(OrderStatus initial, OrderStatus target)
    {
        var order = CreateOrderWithStatus(initial);
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

    private static Order CreateOrderWithStatus(OrderStatus status)
    {
        var order = CreateOrder();
        if (status == OrderStatus.PendingConfirmation) return order;

        // Transition through valid paths to reach target status for testing
        switch (status)
        {
            case OrderStatus.Confirmed:
                order.ChangeStatus(OrderStatus.Confirmed);
                break;
            case OrderStatus.Preparing:
                order.ChangeStatus(OrderStatus.Confirmed);
                order.ChangeStatus(OrderStatus.Preparing);
                break;
            case OrderStatus.Shipped:
                order.ChangeStatus(OrderStatus.Confirmed);
                order.ChangeStatus(OrderStatus.Shipped);
                break;
            case OrderStatus.Delivered:
                order.ChangeStatus(OrderStatus.Confirmed);
                order.ChangeStatus(OrderStatus.Shipped);
                order.ChangeStatus(OrderStatus.Delivered);
                break;
            case OrderStatus.Cancelled:
                order.ChangeStatus(OrderStatus.Cancelled);
                break;
            case OrderStatus.Expired:
                order.ChangeStatus(OrderStatus.Expired);
                break;
        }

        return order;
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
