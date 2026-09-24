# Data Model: Customer Order SMS Notifications

**Feature**: `001-customer-sms-tracking`  
**Date**: 2026-09-22  
**Status**: Ready for Implementation  

---

## 1. Domain Entities (`Terma.Domain`)

### `OrderSmsNotification`
Represents an outbox record for transactional SMS notifications tied to orders.

```csharp
namespace Terma.Domain.Entities;

public enum SmsNotificationType
{
    OrderConfirmed = 1,
    OrderShipped = 2
}

public enum SmsNotificationStatus
{
    Pending = 1,
    Sent = 2,
    Failed = 3
}

public sealed class OrderSmsNotification : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Order Order { get; private set; } = null!;
    public string RecipientPhone { get; private set; } = string.Empty;
    public SmsNotificationType Type { get; private set; }
    public SmsNotificationStatus Status { get; private set; } = SmsNotificationStatus.Pending;
    public string ParametersJson { get; private set; } = "{}";
    public int RetryCount { get; private set; } = 0;
    public DateTime? NextAttemptAtUtc { get; private set; }
    public DateTime? SentAtUtc { get; private set; }
    public string? LastErrorMessage { get; private set; }

    private OrderSmsNotification() { }

    public OrderSmsNotification(
        Guid orderId,
        string recipientPhone,
        SmsNotificationType type,
        string parametersJson)
    {
        Id = Guid.NewGuid();
        OrderId = orderId;
        RecipientPhone = recipientPhone.Trim();
        Type = type;
        ParametersJson = parametersJson;
        Status = SmsNotificationStatus.Pending;
        NextAttemptAtUtc = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkSent()
    {
        Status = SmsNotificationStatus.Sent;
        SentAtUtc = DateTime.UtcNow;
        LastErrorMessage = null;
        MarkUpdated();
    }

    public void MarkFailed(string errorMessage, bool canRetry)
    {
        RetryCount++;
        LastErrorMessage = errorMessage;

        if (canRetry && RetryCount < 3)
        {
            Status = SmsNotificationStatus.Pending;
            // Exponential backoff: 1 min, 3 min, 10 min
            var delayMinutes = RetryCount switch
            {
                1 => 1,
                2 => 3,
                _ => 10
            };
            NextAttemptAtUtc = DateTime.UtcNow.AddMinutes(delayMinutes);
        }
        else
        {
            Status = SmsNotificationStatus.Failed;
            NextAttemptAtUtc = null;
        }

        MarkUpdated();
    }
}
```

---

## 2. Application Model Updates (`Terma.Application`)

### `OrderStatusRequest` (`Terma.Application/Store/StoreModels.cs`)
Updated to support optional customer SMS notification flag:
```csharp
public sealed class OrderStatusRequest
{
    public OrderStatus Status { get; init; }
    public string? PostalTrackingCode { get; init; }
    public bool ResendNotification { get; init; } = false;
}
```

---

## 3. Entity Framework Core Configuration (`Terma.Infrastructure`)

### Table: `OrderSmsNotifications`
- Primary Key: `Id` (UUID)
- Foreign Key: `OrderId` -> `Orders.Id` (Cascade delete)
- Indexes:
  - `IX_OrderSmsNotifications_Status_NextAttemptAtUtc` (Filtered index for pending worker polling: `WHERE Status = 1`)
  - `IX_OrderSmsNotifications_OrderId`
- Column Configurations:
  - `RecipientPhone`: `nvarchar(20)`, Required
  - `ParametersJson`: `nvarchar(max)`, Required
  - `LastErrorMessage`: `nvarchar(1000)`, Nullable
