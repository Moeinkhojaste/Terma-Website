using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class CustomerEntityTests
{
    [Fact]
    public void Constructor_InitializesPropertiesAndNormalizesPhone()
    {
        var customer = new Customer("زهرا کاظمی", "۰۹۱۲۳۴۵۶۷۸۹", "zahra@example.com");

        Assert.Equal("زهرا کاظمی", customer.FullName);
        Assert.Equal("۰۹۱۲۳۴۵۶۷۸۹", customer.Phone);
        Assert.Equal("989123456789", customer.NormalizedPhone);
        Assert.Equal("zahra@example.com", customer.Email);
        Assert.Equal(0, customer.OrderCount);
        Assert.Equal(0, customer.TotalOrderValue);
        Assert.Null(customer.UserId);
    }

    [Fact]
    public void RefreshProfile_UpdatesValuesCorrectly()
    {
        var customer = new Customer("نام قبلی", "09121111111", null);
        customer.RefreshProfile("نام جدید", "09122222222", "new@example.com");

        Assert.Equal("نام جدید", customer.FullName);
        Assert.Equal("09122222222", customer.Phone);
        Assert.Equal("989122222222", customer.NormalizedPhone);
        Assert.Equal("new@example.com", customer.Email);
    }

    [Fact]
    public void AddOrder_IncrementsCountAndOrderValue()
    {
        var customer = new Customer("مشتری", "09121234567", null);
        customer.AddOrder(150_000);
        Assert.Equal(1, customer.OrderCount);
        Assert.Equal(150_000, customer.TotalOrderValue);

        customer.AddOrder(250_000);
        Assert.Equal(2, customer.OrderCount);
        Assert.Equal(400_000, customer.TotalOrderValue);
    }

    [Fact]
    public void AttachToUser_LinksUserIdAndRejectsConflict()
    {
        var customer = new Customer("مشتری", "09121234567", null);
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();

        customer.AttachToUser(user1);
        Assert.Equal(user1, customer.UserId);

        // Same user ID is idempotent
        customer.AttachToUser(user1);
        Assert.Equal(user1, customer.UserId);

        // Different user ID throws exception
        Assert.Throws<DomainException>(() => customer.AttachToUser(user2));
    }
}
