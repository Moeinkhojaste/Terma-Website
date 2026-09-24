# Tasks: Customer Order SMS Notifications

**Feature**: `001-customer-sms-tracking`  
**Date**: 2026-09-22  
**Spec**: [specs/001-customer-sms-tracking/spec.md](file:///D:/Personal/Shop/Website/specs/001-customer-sms-tracking/spec.md)  
**Plan**: [specs/001-customer-sms-tracking/plan.md](file:///D:/Personal/Shop/Website/specs/001-customer-sms-tracking/plan.md)  

---

## Phase 1: Setup (Shared Configuration & Options)

**Purpose**: Configuration settings and template properties initialization for SMS.ir.

- [ ] T001 [P] Extend `SmsIrOptions` in `backend/src/Terma.Infrastructure/Sms/SmsIrOptions.cs` with `OrderConfirmedTemplateId` and `OrderShippedTemplateId` properties.
- [ ] T002 [P] Update configuration files `backend/src/Terma.Api/appsettings.json`, `backend/src/Terma.Api/appsettings.Development.json`, and `backend/src/Terma.Api/appsettings.Production.json` to include template ID settings for order SMS templates.

---

## Phase 2: Foundational (Outbox Core Entity & Database Persistence)

**Purpose**: Core outbox data model and background processing worker that MUST be complete before user story notification flows can run.

**⚠️ CRITICAL**: No user story notifications can be dispatched until this phase is complete.

- [ ] T003 [P] Create domain entity `OrderSmsNotification` and enums `SmsNotificationType` and `SmsNotificationStatus` in `backend/src/Terma.Domain/Entities/OrderSmsNotification.cs` with fields: `OrderId` (UUID), `RecipientPhone` (nvarchar(20), required), `ParametersJson` (nvarchar(max), required), `Status` (enum: Pending, Sent, Failed), `RetryCount` (int, default 0), `NextAttemptAtUtc` (DateTime?), `SentAtUtc` (DateTime?), `LastErrorMessage` (nvarchar(1000), nullable).
- [ ] T004 [P] Implement EF Core entity configuration `OrderSmsNotificationConfiguration` in `backend/src/Terma.Infrastructure/Persistence/Configurations/OrderSmsNotificationConfiguration.cs` with foreign key to `Order` and filtered index on `Status = Pending`.
- [ ] T005 Register `OrderSmsNotifications` DbSet in `backend/src/Terma.Infrastructure/Persistence/TermaDbContext.cs` and generate EF Core migration in `backend/src/Terma.Infrastructure/Persistence/Migrations/`.
- [ ] T006 [P] Unit tests for `OrderSmsNotification` domain entity methods `MarkSent()` and `MarkFailed()` with exponential retry backoff in `backend/tests/Terma.UnitTests/Domain/OrderSmsNotificationTests.cs`.
- [ ] T007 Define `ISmsOutboxService` in `backend/src/Terma.Application/Store/ISmsOutboxService.cs` with methods `EnqueueOrderConfirmedAsync(Guid orderId, string phone, string orderNumber, CancellationToken ct)` and `EnqueueOrderShippedAsync(Guid orderId, string phone, string orderNumber, string trackingCode, CancellationToken ct)`.
- [ ] T008 Implement `SmsOutboxService` in `backend/src/Terma.Infrastructure/Sms/SmsOutboxService.cs` persisting notification records to `TermaDbContext`.
- [ ] T009 Define `ISmsNotificationSender` and implement `SmsIrNotificationSender` in `backend/src/Terma.Infrastructure/Sms/SmsIrNotificationSender.cs` sending transactional template payloads to `https://api.sms.ir/v1/send/verify` with development console logging fallback.
- [ ] T010 Implement `SmsOutboxProcessorHostedService` (`BackgroundService`) in `backend/src/Terma.Infrastructure/Sms/SmsOutboxProcessorHostedService.cs` polling pending SMS records every 10 seconds, dispatching via `ISmsNotificationSender`, and updating status with 3-attempt exponential backoff.
- [ ] T011 Register `ISmsOutboxService`, `ISmsNotificationSender`, and `SmsOutboxProcessorHostedService` in `backend/src/Terma.Infrastructure/DependencyInjection.cs`.
- [ ] T012 [P] Unit tests for `SmsOutboxProcessorHostedService` in `backend/tests/Terma.UnitTests/Infrastructure/SmsOutboxProcessorTests.cs`.

**Checkpoint**: Outbox table, background processor, and SMS gateway infrastructure are operational and independently testable.

---

## Phase 3: User Story 1 - دریافت پیامک وضعیت سفارش پس از پرداخت موفق (Priority: P1) 🎯 MVP

**Goal**: Automatically queue and send transactional SMS notifications to buyers when their payment succeeds via ZarinPal callback.

**Independent Test**: Complete a simulated checkout payment callback; verify that an `OrderConfirmed` outbox record is queued in the database and processed by the background worker without blocking the user response.

- [ ] T013 [P] [US1] Integration test for payment confirmation outbox enqueue in `backend/tests/Terma.IntegrationTests/PaymentConfirmationSmsTests.cs`.
- [ ] T014 [US1] Update `PaymentController.cs` in `backend/src/Terma.Api/Controllers/PaymentController.cs` upon successful ZarinPal payment verification to enqueue `OrderConfirmed` notification via `ISmsOutboxService`.

**Checkpoint**: At this point, User Story 1 is fully functional and delivers an end-to-end viable MVP!

---

## Phase 4: User Story 2 - دریافت پیامک کد مرسوله پستی هنگام تحویل به پست (Priority: P2)

**Goal**: Automatically queue and send transactional SMS notifications with the 24-digit postal tracking code to the buyer when an admin transitions the order to `Shipped`.

**Independent Test**: In Admin Orders, change an order status to `Shipped` and enter a postal tracking code; verify that an `OrderShipped` outbox record is queued and dispatched with the tracking code.

- [ ] T015 [P] [US2] Update `ChangeOrderStatusAsync` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs` and `backend/src/Terma.Api/Controllers/AdminStoreController.cs` to enqueue `OrderShipped` outbox notification when transitioning to `Shipped` with non-empty `PostalTrackingCode`.
- [ ] T016 [P] [US2] Integration test for admin status change with postal tracking code and outbox SMS enqueue in `backend/tests/Terma.IntegrationTests/AdminOrderPostalTrackingTests.cs`.

---

## Phase 5: User Story 3 - کنترل ارسال پیامک در ویرایش مجدد بارنامه توسط مدیر (Priority: P3)

**Goal**: Allow store administrators to control whether an updated SMS is sent to the customer when editing an already shipped order's tracking code, preventing duplicate spam.

**Independent Test**: Edit a shipped order's tracking code in Admin without checking the resend option (verify no duplicate SMS); edit again with the resend option checked (verify new SMS queued).

- [ ] T017 [P] [US3] Update `OrderStatusRequest` in `backend/src/Terma.Application/Store/StoreModels.cs` to add `bool ResendNotification = false`.
- [ ] T018 [US3] Update `ChangeOrderStatusAsync` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs` to honor `ResendNotification` when updating the postal tracking code on an already shipped order.
- [ ] T019 [P] [US3] Update `changeOrderStatus` function in `frontend/src/features/admin/store-api.ts` to accept optional `resendNotification?: boolean` parameter.
- [ ] T020 [US3] Add "ارسال مجدد پیامک با کد جدید به مشتری" checkbox to the order tracking code input in `frontend/src/features/admin/admin-operations-pages.tsx`.

---

## Phase 6: Polish & Quality Verification

**Purpose**: Verify all quality gates, linting, build, and automated tests across backend and frontend.

- [ ] T021 [P] Run backend verification: `dotnet build backend/Terma.sln` and `dotnet test backend/Terma.sln` ensuring zero warnings-as-errors.
- [ ] T022 [P] Run frontend verification: `npm run lint` and `npm run typecheck` in `frontend/`.
- [ ] T023 Execute end-to-end quickstart validation scenarios defined in `specs/001-customer-sms-tracking/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion.
- **User Story 3 (Phase 5)**: Depends on Phase 4 completion.
- **Polish (Phase 6)**: Depends on all user stories being implemented.

### Parallel Opportunities
- In Phase 1: `T001` and `T002` can execute in parallel.
- In Phase 2: `T003`, `T004`, `T006`, and `T012` can be authored in parallel.
- In Phase 5: Backend DTO update (`T017`) and frontend API client update (`T019`) can run concurrently.
- In Phase 6: `T021` and `T022` can execute in parallel across backend and frontend.

---

## Implementation Strategy (MVP First)

1. **Phase 1 + 2 + 3**: Setup, Outbox Infrastructure, and Payment Confirmation SMS.
   - **Validate MVP**: Customers reliably receive payment confirmation SMS without blocking checkout.
2. **Phase 4 + 5**: Postal tracking SMS on status change + Admin resend checkbox.
   - **Validate Full Cycle**: Admin assigns tracking code, customer receives postal SMS.
3. **Phase 6**: Quality gates and automated build verification.
