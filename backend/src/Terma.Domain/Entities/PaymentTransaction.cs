using System.Text.Json.Serialization;
using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentStatus
{
    Initiated,
    Verified,
    Failed,
    Cancelled
}

public sealed class PaymentTransaction : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Order Order { get; private set; } = null!;
    public string Gateway { get; private set; } = "ZarinPal";
    public string Authority { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "IRT";
    public PaymentStatus Status { get; private set; } = PaymentStatus.Initiated;
    public long? RefId { get; private set; }
    public string? CardPan { get; private set; }
    public string? CardHash { get; private set; }
    public string? FailureReason { get; private set; }
    public DateTime? VerifiedAt { get; private set; }

    private PaymentTransaction() { }

    public PaymentTransaction(Guid orderId, decimal amount, string authority, string gateway = "ZarinPal", string currency = "IRT")
    {
        if (orderId == Guid.Empty)
            throw new DomainException("OrderId is required for payment transaction.");

        if (amount <= 0)
            throw new DomainException("Payment amount must be greater than zero.");

        if (string.IsNullOrWhiteSpace(authority))
            throw new DomainException("Payment authority token is required.");

        OrderId = orderId;
        Amount = amount;
        Authority = authority.Trim();
        Gateway = string.IsNullOrWhiteSpace(gateway) ? "ZarinPal" : gateway.Trim();
        Currency = string.IsNullOrWhiteSpace(currency) ? "IRT" : currency.Trim();
        Status = PaymentStatus.Initiated;
    }

    public void MarkVerified(long refId, string? cardPan, string? cardHash)
    {
        if (Status == PaymentStatus.Verified)
            return;

        Status = PaymentStatus.Verified;
        RefId = refId;
        CardPan = string.IsNullOrWhiteSpace(cardPan) ? null : cardPan.Trim();
        CardHash = string.IsNullOrWhiteSpace(cardHash) ? null : cardHash.Trim();
        FailureReason = null;
        VerifiedAt = DateTime.UtcNow;
        MarkUpdated();
    }

    public void MarkFailed(string failureReason)
    {
        if (Status == PaymentStatus.Verified)
            throw new DomainException("A verified transaction cannot be marked as failed.");

        Status = PaymentStatus.Failed;
        FailureReason = string.IsNullOrWhiteSpace(failureReason) ? "Payment failed or rejected by gateway." : failureReason.Trim();
        MarkUpdated();
    }

    public void MarkCancelled()
    {
        if (Status == PaymentStatus.Verified)
            throw new DomainException("A verified transaction cannot be marked as cancelled.");

        Status = PaymentStatus.Cancelled;
        FailureReason = "Payment was cancelled by user.";
        MarkUpdated();
    }
}
