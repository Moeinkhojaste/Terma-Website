# Research & Architecture Decisions: Customer Order SMS Notifications

**Feature**: `001-customer-sms-tracking`  
**Date**: 2026-09-22  
**Status**: Approved  

---

## 1. SMS Dispatch Architecture: Transactional Outbox vs Direct Async

### Decision
Use the **Transactional Outbox Pattern** with an EF Core entity `OrderSmsNotification` stored in the same database transaction as the order event (payment confirmation or status change), processed by a background worker (`IHostedService`).

### Rationale
- **Reliability & Consistency**: When a customer finishes payment via ZarinPal callback, database updates (`order.ConfirmPayment`) must never fail or timeout because the external SMS gateway (SMS.ir) is slow or unreachable.
- **Retry Mechanism**: In case of temporary network glitch or upstream gateway timeout, the Outbox worker can automatically retry (3 attempts with exponential backoff: 1m, 3m, 10m) without dropping notifications.
- **Auditability**: Store administrators and developers can inspect the status (`Pending`, `Sent`, `Failed`), delivery timestamps, and error messages directly in the database.
- **Alignment with Constitution**: Constitution Principle V requires deterministic runtime lifecycle management and idempotent data handling.

---

## 2. Customer Order Access & No Need for Duplicate Tracking Portal

### Decision
Do **not** create a redundant public `/track` portal.
- The storefront already contains a comprehensive, passwordless OTP account portal (`/account/orders`).
- When customers log in with their mobile number, all their orders, payment states, and 24-digit postal tracking codes are already clearly displayed.
- The SMS messages sent to customers provide direct reassurance with the order number and invite them to view details in their account portal.

---

## 3. SMS.ir Gateway Integration & Template Strategy

### Decision
Extend existing `SmsIrOptions` and `IPhoneOtpSender` infrastructure in `Terma.Infrastructure/Sms` to support structured transactional template sends (`send/verify` API) for order events.

### Configuration
```json
"SmsIr": {
  "ApiKey": "...",
  "TemplateId": 12345, // Existing auth OTP template
  "OrderConfirmedTemplateId": 67890,
  "OrderShippedTemplateId": 67891,
  "Enabled": true
}
```

### Template Parameters
1. **Order Confirmed Template**:
   - `OrderNumber`: e.g., `ORD-20260922-001`
2. **Order Shipped Template**:
   - `OrderNumber`: e.g., `ORD-20260922-001`
   - `TrackingCode`: 24-digit postal tracking code

### Development / Staging Fallback
Reuses the existing pattern in `SmsIrPhoneOtpSender`: when `ApiKey` is unset or in Development environment, messages are logged with `[SMS.IR DEV FALLBACK]` without throwing errors or requiring external network calls.

---

## 4. Admin Postal Tracking Code & Notification Resend

### Decision
Extend `OrderStatusRequest` with an optional `bool ResendNotification = false` flag.
- When an order transitions to `OrderStatus.Shipped` for the first time with a non-empty `PostalTrackingCode`, the `OrderShipped` SMS outbox record is enqueued automatically.
- When an administrator updates or corrects the `PostalTrackingCode` on an already shipped order:
  - If `ResendNotification == true`: A new `OrderShipped` outbox record is enqueued with the corrected code.
  - If `ResendNotification == false`: The `PostalTrackingCode` is saved in the database silently without re-sending SMS.

### Rationale
Prevents duplicate notifications and customer confusion caused by administrative typos, while giving staff explicit control when a correction genuinely needs to reach the customer.
