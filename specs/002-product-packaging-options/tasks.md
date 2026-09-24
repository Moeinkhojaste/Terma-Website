# Tasks: Product Packaging Options (گزینه‌های بسته‌بندی معمولی و کادویی محصولات)

**Feature**: `002-product-packaging-options`  
**Date**: 2026-09-24  
**Spec**: [specs/002-product-packaging-options/spec.md](file:///D:/Personal/Shop/Website/specs/002-product-packaging-options/spec.md)  
**Plan**: [specs/002-product-packaging-options/plan.md](file:///D:/Personal/Shop/Website/specs/002-product-packaging-options/plan.md)  
**Data Model**: [specs/002-product-packaging-options/data-model.md](file:///D:/Personal/Shop/Website/specs/002-product-packaging-options/data-model.md)  
**Contracts**: [specs/002-product-packaging-options/contracts/packaging-api.md](file:///D:/Personal/Shop/Website/specs/002-product-packaging-options/contracts/packaging-api.md)  

---

## Phase 1: Setup (Shared Infrastructure & Domain Core)

**Purpose**: Core domain entities, enums, and mathematical financial invariant methods for packaging.

- [X] T001 [P] Create `PackagingType` enum with values `Standard = 0` and `GiftBox = 1` in `backend/src/Terma.Domain/Entities/PackagingType.cs`.
- [X] T002 [P] Create `StoreSetting` entity in `backend/src/Terma.Domain/Entities/StoreSetting.cs` with `Key` (nvarchar(100)), `Value` (nvarchar(1000)), `Description` (nvarchar(300)), and `UpdateValue(string)` method.
- [X] T003 Update `OrderItem` in `backend/src/Terma.Domain/Entities/Order.cs` to add `PackagingType` (default `Standard`), `PackagingFee` (decimal, default 0), update `LineTotal => (UnitPrice + PackagingFee) * Quantity`, and add `PackagingTotal => _items.Sum(i => i.PackagingFee * i.Quantity)` to `Order`.
- [X] T004 [P] Unit tests for `OrderItem` and `Order` packaging calculations with single and multiple quantities in `backend/tests/Terma.UnitTests/Domain/OrderItemPackagingTests.cs`.

---

## Phase 2: Foundational (Database Persistence, DTOs & Services)

**Purpose**: Core database schema, seed data, application DTOs, and base operations service methods that MUST be complete before user story flows can execute.

**⚠️ CRITICAL**: No user story implementation can begin until this foundational phase is complete.

- [X] T005 [P] Create `StoreSettingConfiguration` in `backend/src/Terma.Infrastructure/Persistence/Configurations/StoreSettingConfiguration.cs` with unique index on `Key` and initial seed data for `Packaging:GiftBoxPrice` ("200000") and `Packaging:GiftBoxEnabled` ("true").
- [X] T006 [P] Update `OrderConfiguration` in `backend/src/Terma.Infrastructure/Persistence/Configurations/OrderConfiguration.cs` mapping `PackagingType` (string conversion, max length 30) and `PackagingFee` (decimal(18,2)).
- [X] T007 Register `StoreSettings` DbSet in `backend/src/Terma.Infrastructure/Persistence/TermaDbContext.cs` and create EF Core migration in `backend/src/Terma.Infrastructure/Persistence/Migrations/`.
- [X] T008 [P] Add packaging DTOs in `backend/src/Terma.Application/Store/StoreModels.cs`: `PublicPackagingSettingsDto`, `StoreSettingsDto`, `UpdatePackagingSettingsRequest`, and extend `CheckoutItemRequest` with `PackagingType`, `CheckoutQuoteItemDto` with `PackagingType` and `PackagingFee`, `CheckoutQuoteDto` with `PackagingTotal`, and `AdminOrderItemDto` with `PackagingType` and `PackagingFee`.
- [X] T009 Implement `GetPublicPackagingSettingsAsync`, `GetStoreSettingsAsync`, and `UpdatePackagingSettingsAsync` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs`.
- [X] T010 Expose public endpoint `GET /api/store/packaging` in `backend/src/Terma.Api/Controllers/StoreController.cs`.

**Checkpoint**: Foundational entities, migrations, and DTO contracts are operational and ready for feature implementation.

---

## Phase 3: User Story 1 - انتخاب نوع بسته‌بندی در صفحه محصول و افزودن به سبد خرید (Priority: P1) 🎯 MVP

**Goal**: خریدار در صفحه محصول بتواند بین «بسته‌بندی معمولی» (رایگان) و «بسته‌بندی کادویی داخل جعبه» (+۲۰۰٬۰۰۰ تومان) انتخاب کند، قیمت لحظه‌ای را ببیند و محصول را با نوع بسته‌بندی دلخواه به سبد خرید اضافه کند.

**Independent Test**: باز کردن صفحه یک محصول فعال، تغییر بسته‌بندی به کادویی، بررسی به‌روزرسانی قیمت نمایشی، و فشردن دکمه «افزودن به سبد خرید» جهت بررسی ورود قلم با مشخصه کادویی به سبد.

- [X] T011 [P] [US1] Define `PackagingType = "Standard" | "GiftBox"` and extend `CartItem` with `packagingType` and `packagingFee`, update `getCartLineId(product, packagingType)` in `frontend/src/features/cart/cart-provider.tsx`.
- [X] T012 [P] [US1] Implement `getStorePackagingSettings()` in `frontend/src/features/products/product-api.ts` to fetch `GET /api/store/packaging`.
- [X] T013 [P] [US1] Create component `ProductPackagingSelector` in `frontend/src/features/products/components/product-packaging-selector.tsx` displaying Standard and GiftBox options with price badge, selection state, and disabled indicator if unavailable.
- [X] T014 [US1] Integrate `ProductPackagingSelector` into `ProductCapacityDetails` in `frontend/src/features/products/components/product-capacity-details.tsx` and propagate selected packaging state to `AddToCartButton`.
- [X] T015 [US1] Update `AddToCartButton` in `frontend/src/features/cart/add-to-cart-button.tsx` to accept `packagingType` prop and pass it to `addItem` in `CartProvider`.
- [X] T016 [P] [US1] Unit tests for cart provider packaging line separation and lineId generation in `frontend/src/features/cart/cart-provider.test.ts`.

**Checkpoint**: User Story 1 delivers a fully functional and testable MVP storefront packaging selection experience!

---

## Phase 4: User Story 2 - تفکیک، ویرایش مستقیم و نمایش نوع بسته‌بندی در سبد خرید و تسویه‌حساب (Priority: P1)

**Goal**: نمایش شفاف نوع بسته‌بندی در کشوی سبد خرید، صفحه کامل سبد خرید و تسویه‌حساب، همراه با امکان جابجایی مستقیم بین بسته‌بندی معمولی و کادویی در سبد، و محاسبه امن مبالغ در سرور.

**Independent Test**: افزودن یک کالا با بسته‌بندی معمولی و یک کالا با کادویی به سبد، سوئیچ مستقیم نوع بسته‌بندی در کشو، بررسی تغییر مبالغ، و ورود به مرحله تسویه‌حساب جهت تایید درستی سرفصل `packagingTotal` در پیش‌فاکتور.

- [X] T017 [P] [US2] Implement `toggleItemPackaging(lineId: string)` in `frontend/src/features/cart/cart-provider.tsx` allowing switching between Standard and GiftBox and merging with existing lines if applicable.
- [X] T018 [US2] Update `CartDrawer` in `frontend/src/features/cart/cart-drawer.tsx` to display packaging badge, unit fee, and interactive packaging toggle button.
- [X] T019 [US2] Update `CartPageClient` in `frontend/src/features/cart/cart-page-client.tsx` to display packaging badge, fee breakdown, and interactive packaging toggle button.
- [X] T020 [P] [US2] Update `QuoteAsync` and `ResolveLines` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs` to resolve `PackagingType`, fetch current active gift fee from `StoreSettings`, compute `PackagingFee` and `PackagingTotal`, and include in `CheckoutQuoteDto`.
- [X] T021 [P] [US2] Update `CheckoutItemRequest` and `CheckoutQuote` types in `frontend/src/features/checkout/checkout-api.ts` to include packaging fields.
- [X] T022 [US2] Update `CheckoutPageClient` in `frontend/src/features/checkout/checkout-page-client.tsx` to display item packaging badges and packaging total row in order summary.
- [X] T023 [P] [US2] Integration tests for `POST /api/checkout/quote` with mixed packaging items and quantity multiplier in `backend/tests/Terma.IntegrationTests/StorePackagingApiTests.cs`.

**Checkpoint**: User Story 2 completes the entire in-cart and checkout quotation journey with real-time server verification.

---

## Phase 5: User Story 3 - نمایش نوع بسته‌بندی در فاکتور نهایی و پنل مدیریت سفارش‌ها (Priority: P2)

**Goal**: ثبت قطعی و انجماد تاریخی نوع و نرخ بسته‌بندی در متد `CreateOrderAsync`، و نمایش متمایز نشانگر بسته‌بندی کادویی در جزئیات سفارش‌های پنل ادمین جهت اطلاع عوامل انبار و بسته‌بندی.

**Independent Test**: ثبت نهایی یک سفارش دارای قلم کادویی، باز کردن سفارش در پنل مدیریت سفارش‌ها در ادمین، و مشاهده برچسب ویژه «بسته‌بندی کادویی» در کنار قلم کالا.

- [X] T024 [US3] Update `CreateOrderAsync` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs` to snapshot `PackagingType` and `PackagingFee` on created `OrderItem` instances and incorporate packaging into `CalculateRequestFingerprint`.
- [X] T025 [P] [US3] Update `MapOrdersAsync` in `backend/src/Terma.Infrastructure/Store/StoreOperationsService.cs` to populate `PackagingType` and `PackagingFee` in `AdminOrderItemDto`.
- [X] T026 [US3] Update `frontend/src/features/admin/admin-operations-pages.tsx` (Admin Orders view) to render a distinctive badge `🎁 بسته‌بندی کادویی (جعبه)` on order line items.
- [X] T027 [P] [US3] Update customer orders display in `frontend/src/features/account/` or `frontend/src/features/orders/` to render packaging badge on order items.
- [X] T028 [P] [US3] Integration test for order creation with packaging snapshot and verification of historical price immutability in `backend/tests/Terma.IntegrationTests/StorePackagingApiTests.cs`.

**Checkpoint**: User Story 3 ensures operational integrity for warehouse fulfillment and customer order transparency.

---

## Phase 6: User Story 4 - مدیریت نرخ و وضعیت فعال‌سازی بسته‌بندی کادویی در پنل مدیریت (Priority: P2)

**Goal**: مدیر فروشگاه بتواند در بخش تنظیمات پنل مدیریت (`/admin/settings`)، هزینه بسته‌بندی کادویی را تغییر داده و در صورت نیاز کلید فعال/غیرفعال‌سازی سراسری آن را تغییر دهد.

**Independent Test**: ورود مدیر به صفحه تنظیمات، ویرایش قیمت به ۲۵۰٬۰۰۰ تومان و ذخیره، بررسی نتیجه در فراخوانی `GET /api/store/packaging`. تغییر کلید به غیرفعال و بررسی غیرفعال شدن انتخاب در صفحه محصول.

- [X] T029 [P] [US4] Add `PUT /api/admin/settings/packaging` in `backend/src/Terma.Api/Controllers/AdminStoreController.cs` protected by `[ValidateApiAntiforgeryToken]` and admin authorization.
- [X] T030 [US4] Update `AdminSettingsPage` in `frontend/src/features/admin/admin-settings-page.tsx` adding an editable "بسته‌بندی کادویی" panel for `giftPackagingPrice` and `isGiftPackagingEnabled` toggle with save feedback.
- [X] T031 [P] [US4] Integration tests for admin settings `GET` and `PUT` endpoints including CSRF and role authorization checks in `backend/tests/Terma.IntegrationTests/StorePackagingApiTests.cs`.

**Checkpoint**: User Story 4 gives full business control to the store administrator over packaging costs and availability.

---

## Phase 7: Polish & Quality Verification

**Purpose**: اجرای کامل دروازه‌های ارزیابی کیفیت، تست‌های واحد، تست‌های یکپارچگی، لینت و بیلد در کل پروژه.

- [X] T032 [P] Run backend verification: `dotnet build backend/Terma.sln` and `dotnet test backend/Terma.sln` ensuring 100% pass with zero warnings-as-errors.
- [X] T033 [P] Run frontend verification: `npm run lint`, `npm run typecheck`, and `npm test` in `frontend/`.
- [X] T034 Execute end-to-end verification walkthrough per `specs/002-product-packaging-options/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 2 and Phase 3 completion.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and Phase 4 completion.
- **User Story 4 (Phase 6)**: Depends on Phase 2 completion (can run in parallel with US1-US3).
- **Polish (Phase 7)**: Depends on completion of all user stories.

### User Story Dependencies
```text
[Phase 1: Setup]
       │
       ▼
[Phase 2: Foundational]
       │
       ├────────────────────────┐
       ▼                        ▼
[Phase 3: User Story 1]  [Phase 6: User Story 4 (Admin)]
       │
       ▼
[Phase 4: User Story 2]
       │
       ▼
[Phase 5: User Story 3]
       │
       ▼
[Phase 7: Polish & Verification]
```

### Parallel Opportunities
- In Phase 1: `T001` and `T002` can be implemented concurrently.
- In Phase 2: `T005`, `T006`, and `T008` can be written concurrently.
- In Phase 3: `T011`, `T012`, `T013`, and `T016` can be authored concurrently.
- In Phase 4: Backend service `T020` and Frontend API client `T021` can run in parallel.
- In Phase 6: Admin endpoint `T029` and Admin UI form `T030` can be developed in parallel.

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Complete Phase 1 (Domain setup).
2. Complete Phase 2 (Foundational database migration & DTOs).
3. Complete Phase 3 (Product page packaging selection & AddToCart).
4. **VALIDATE MVP**: Verify product page displays packaging options and items enter the cart with the correct packaging type.

### Incremental Delivery
1. Foundation & MVP (Phases 1-3) -> Product page selection works.
2. In-Cart & Checkout (Phase 4) -> Cart toggle and quote pricing work.
3. Order Fulfillment (Phase 5) -> Admin orders view and historical data frozen.
4. Admin Controls (Phase 6) -> Admin can edit pricing and toggle packaging.
5. Polish (Phase 7) -> Automated gates and end-to-end tests green.
