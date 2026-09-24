# Implementation Plan: Customer Order SMS Notifications

**Branch**: `001-customer-sms-tracking` | **Date**: 2026-09-22 | **Spec**: [specs/001-customer-sms-tracking/spec.md](file:///D:/Personal/Shop/Website/specs/001-customer-sms-tracking/spec.md)

**Input**: Feature specification from `/specs/001-customer-sms-tracking/spec.md`

---

## Summary

Implement automated, non-blocking transactional SMS notifications for customer orders using the **Transactional Outbox Pattern**:
1. **Payment Confirmation SMS**: Automatically queued when payment succeeds via ZarinPal callback and processed asynchronously by a background `IHostedService` worker.
2. **Order Shipped SMS (Postal Tracking Code)**: Automatically queued when an admin updates the order status to `Shipped` with a postal tracking code in the admin dashboard.
3. **Admin Resend Control**: An optional checkbox in the admin orders page allowing the admin to choose whether to re-send an updated SMS when correcting a tracking code.
4. **Zero Redundancy**: Leverages the existing passwordless OTP customer portal (`/account/orders`) without adding unnecessary duplicate tracking routes.

---

## Technical Context

**Language/Version**: C# 12 / .NET 8 (Backend), TypeScript 5.4+ / Next.js 14+ App Router (Frontend)  
**Primary Dependencies**: ASP.NET Core Web API, Entity Framework Core 8, HttpClient (`api.sms.ir`), Tailwind CSS, React  
**Storage**: Microsoft SQL Server (Production) / SQLite (Unit & Integration Tests) via EF Core  
**Testing**: xUnit, Moq, `Microsoft.AspNetCore.Mvc.Testing` (Backend), Vitest/Playwright (Frontend)  
**Target Platform**: Linux Docker / Windows Server / Node.js  
**Project Type**: Decoupled Web Application (Next.js Storefront + ASP.NET Core Clean Architecture API)  
**Performance Goals**: SMS Outbox enqueue < 10ms; Background polling cycle: 10s  
**Constraints**: Zero cross-application coupling between `frontend/` and `backend/`; Non-blocking Outbox delivery (never throw or delay during payment callback); Strict Clean Architecture dependency flow.  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
|---|---|---|
| **I. Strict Top-Level Decoupling** | `frontend/` and `backend/` maintain complete separation. | **PASSED** |
| **II. Clean Architecture & Dependency Inversion** | `Terma.Domain` holds `OrderSmsNotification` with zero external dependencies. `Terma.Application` defines `ISmsOutboxService`. `Terma.Infrastructure` implements EF Core mappings, migration, background worker, and SMS.ir client. `Terma.Api` controllers remain thin. | **PASSED** |
| **III. Feature-Driven Slices & Thin Routes** | Admin UI enhancements stay strictly within `frontend/src/features/admin/`. | **PASSED** |
| **IV. Automated Quality Gates** | Unit tests cover domain entities and worker logic; integration tests verify payment and status change outbox triggers. | **PASSED** |
| **V. Security & Operational Integrity** | Transactional outbox prevents payment blocking; SMS.ir credentials managed via configuration; local development fallback logs safely. | **PASSED** |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-customer-sms-tracking/
├── spec.md              # Feature specification & clarifications
├── plan.md              # Implementation plan (this file)
├── research.md          # Architecture decisions & trade-offs
├── data-model.md        # Entities, cache models, and DTOs
├── quickstart.md        # Runnable verification guide
└── contracts/
    └── admin-order-api.md # Admin order update contract
```

### Source Code

```text
backend/
├── src/
│   ├── Terma.Domain/
│   │   └── Entities/
│   │       └── OrderSmsNotification.cs          # Outbox entity & enums
│   ├── Terma.Application/
│   │   ├── Store/
│   │   │   ├── ISmsOutboxService.cs             # Enqueue service interface
│   │   │   └── StoreModels.cs                   # Add ResendNotification to OrderStatusRequest
│   ├── Terma.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── Configurations/
│   │   │   │   └── OrderSmsNotificationConfiguration.cs
│   │   │   └── Migrations/                      # EF Core migration for outbox
│   │   ├── Sms/
│   │   │   ├── SmsIrNotificationSender.cs       # Transactional template sender
│   │   │   ├── SmsOutboxProcessorHostedService.cs # Background polling worker
│   │   │   └── SmsOutboxService.cs              # Outbox persistence implementation
│   │   └── Store/
│   │       └── StoreOperationsService.cs        # Handle status change SMS trigger
│   └── Terma.Api/
│       └── Controllers/
│           ├── PaymentController.cs             # Trigger payment confirmed SMS
│           └── AdminStoreController.cs          # Updated status & tracking endpoints
└── tests/
    ├── Terma.UnitTests/
    │   ├── Domain/OrderSmsNotificationTests.cs
    │   └── Infrastructure/SmsOutboxProcessorTests.cs
    └── Terma.IntegrationTests/
        └── OrderSmsNotificationApiTests.cs

frontend/
├── src/
│   └── features/
│       └── admin/
│           ├── store-api.ts                     # Add resendNotification parameter
│           └── admin-operations-pages.tsx       # Add "ارسال پیامک به خریدار" checkbox
```
