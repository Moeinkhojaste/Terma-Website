# Quickstart & Verification Guide: Customer Order SMS Notifications

**Feature**: `001-customer-sms-tracking`  
**Date**: 2026-09-22  
**Status**: Ready for Verification  

---

## 1. Prerequisites

1. .NET 8 SDK installed.
2. Local development environment setup:
   - Backend database migrated (`dotnet ef database update`).
   - Frontend running or built (`npm run build` in `frontend/`).

---

## 2. Automated Test Verification

```powershell
# Run domain and infrastructure unit tests for Outbox and retry logic
dotnet test backend/tests/Terma.UnitTests/Terma.UnitTests.csproj --filter "FullyQualifiedName~Sms|FullyQualifiedName~Order"

# Run integration tests (includes payment confirmation and admin order status tests)
dotnet test backend/tests/Terma.IntegrationTests/Terma.IntegrationTests.csproj
```

---

## 3. Manual End-to-End Validation Scenarios

### Scenario 1: Payment Confirmation SMS (Transactional Outbox)
1. Launch backend (`dotnet run --project backend/src/Terma.Api`).
2. Complete a test payment verification or call the payment callback in development.
3. **Expected Outcome**:
   - `OrderSmsNotifications` table contains a record with `Status = 1 (Pending)` and `Type = 1 (OrderConfirmed)`.
   - Within 10 seconds, `SmsOutboxProcessorHostedService` processes the record.
   - Console logs output:
     `>>> [SMS.IR NOT CONFIGURED / DEV FALLBACK] Verification code / notification for 0912***4567: Order ORD-... Confirmed <<<`
   - Database record status changes to `Status = 2 (Sent)` and `SentAtUtc` is populated.

---

### Scenario 2: Admin Postal Tracking Dispatch & Resend Checkbox
1. Log in to the Admin Dashboard (`/admin/orders`).
2. Change an order status to `Shipped` and enter a 24-digit postal tracking code (`123456789012345678901234`).
3. Save the order.
4. **Expected Outcome**:
   - An `OrderShipped` outbox record is queued with the postal tracking code.
   - Edit the order again to change the tracking code without checking "ارسال مجدد پیامک به خریدار".
   - Verify that the database updates the tracking code silently without queueing a duplicate SMS.
   - Edit again with the checkbox checked: verify a new outbox record is enqueued.
