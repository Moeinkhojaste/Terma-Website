using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class PaymentTransactionTests
{
    [Fact]
    public void Constructor_ValidArguments_InitializesTransaction()
    {
        var orderId = Guid.NewGuid();
        var transaction = new PaymentTransaction(orderId, 1500000m, "A00000000000000000000000000000000000", "ZarinPal", "IRT");

        Assert.Equal(orderId, transaction.OrderId);
        Assert.Equal(1500000m, transaction.Amount);
        Assert.Equal("A00000000000000000000000000000000000", transaction.Authority);
        Assert.Equal("ZarinPal", transaction.Gateway);
        Assert.Equal("IRT", transaction.Currency);
        Assert.Equal(PaymentStatus.Initiated, transaction.Status);
        Assert.Null(transaction.RefId);
        Assert.Null(transaction.VerifiedAt);
    }

    [Fact]
    public void Constructor_EmptyOrderId_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new PaymentTransaction(Guid.Empty, 1000m, "auth-123"));
    }

    [Fact]
    public void Constructor_ZeroOrNegativeAmount_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new PaymentTransaction(Guid.NewGuid(), 0m, "auth-123"));
        Assert.Throws<DomainException>(() =>
            new PaymentTransaction(Guid.NewGuid(), -500m, "auth-123"));
    }

    [Fact]
    public void Constructor_EmptyAuthority_ThrowsDomainException()
    {
        Assert.Throws<DomainException>(() =>
            new PaymentTransaction(Guid.NewGuid(), 1000m, "  "));
    }

    [Fact]
    public void MarkVerified_SetsRefIdAndStatusToVerified()
    {
        var transaction = new PaymentTransaction(Guid.NewGuid(), 2500000m, "auth-123");

        transaction.MarkVerified(987654321, "502229******1234", "hash-abcdef");

        Assert.Equal(PaymentStatus.Verified, transaction.Status);
        Assert.Equal(987654321, transaction.RefId);
        Assert.Equal("502229******1234", transaction.CardPan);
        Assert.Equal("hash-abcdef", transaction.CardHash);
        Assert.NotNull(transaction.VerifiedAt);
        Assert.Null(transaction.FailureReason);
    }

    [Fact]
    public void MarkFailed_SetsFailureReasonAndStatusToFailed()
    {
        var transaction = new PaymentTransaction(Guid.NewGuid(), 1000m, "auth-123");

        transaction.MarkFailed("پرداخت توسط کاربر لغو شد.");

        Assert.Equal(PaymentStatus.Failed, transaction.Status);
        Assert.Equal("پرداخت توسط کاربر لغو شد.", transaction.FailureReason);
    }

    [Fact]
    public void MarkFailed_WhenAlreadyVerified_ThrowsDomainException()
    {
        var transaction = new PaymentTransaction(Guid.NewGuid(), 1000m, "auth-123");
        transaction.MarkVerified(12345, null, null);

        Assert.Throws<DomainException>(() => transaction.MarkFailed("Error"));
    }

    [Fact]
    public void MarkCancelled_WhenAlreadyVerified_ThrowsDomainException()
    {
        var transaction = new PaymentTransaction(Guid.NewGuid(), 1000m, "auth-123");
        transaction.MarkVerified(12345, null, null);

        Assert.Throws<DomainException>(() => transaction.MarkCancelled());
    }

    [Fact]
    public void MarkCancelled_SetsStatusToCancelled()
    {
        var transaction = new PaymentTransaction(Guid.NewGuid(), 1000m, "auth-123");

        transaction.MarkCancelled();

        Assert.Equal(PaymentStatus.Cancelled, transaction.Status);
    }
}
