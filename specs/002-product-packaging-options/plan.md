# Implementation Plan: Product Packaging Options (گزینه‌های بسته‌بندی معمولی و کادویی محصولات)

**Branch**: `002-product-packaging-options` | **Date**: 2026-09-24 | **Spec**: [specs/002-product-packaging-options/spec.md](file:///D:/Personal/Shop/Website/specs/002-product-packaging-options/spec.md)

**Input**: Feature specification from `/specs/002-product-packaging-options/spec.md`

---

## Summary

Enable customers to choose between standard packaging (free) and gift packaging in a box (+200,000 Tomans default) on the product page and within the cart, with real-time price updates and dynamic price/toggle management in the Admin Settings panel:
1. **Product Page Selection**: Interactive packaging selector on product detail page with dynamic price updates.
2. **In-Cart Flexibility**: Cart drawer and cart page display packaging badges and allow direct switching between standard and gift packaging without navigating back to the product page.
3. **Admin Settings Management**: Dynamic `StoreSetting` persistence allowing the store administrator to edit the gift box fee and toggle gift packaging availability globally.
4. **Order Immutability & Transparency**: Order items snapshot the packaging type and applied packaging fee at checkout time; admin orders dashboard and customer invoices display packaging indicators clearly.

---

## Technical Context

**Language/Version**: C# 12 / .NET 8 (Backend), TypeScript 5.4+ / Next.js 14+ App Router (Frontend)  
**Primary Dependencies**: ASP.NET Core Web API, Entity Framework Core 8, React 18+, Tailwind CSS  
**Storage**: Microsoft SQL Server (Production) / SQLite (Unit & Integration Tests) via EF Core  
**Testing**: xUnit, Moq, `Microsoft.AspNetCore.Mvc.Testing` (Backend), Vitest, Playwright (Frontend)  
**Target Platform**: Linux Docker / Windows Server / Node.js  
**Project Type**: Decoupled Web Application (Next.js Storefront + ASP.NET Core Clean Architecture API)  
**Performance Goals**: Public packaging settings lookup < 5ms; Quote and checkout latency < 100ms  
**Constraints**: Zero cross-application coupling between `frontend/` and `backend/`; Server-side price calculation and validation (zero client-side trust); Historical order immutability.  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
|---|---|---|
| **I. Strict Top-Level Decoupling** | `frontend/` and `backend/` maintain complete separation with independent builds, dependencies, and execution contexts. | **PASSED** |
| **II. Clean Architecture & Dependency Inversion** | `Terma.Domain` holds `PackagingType`, `StoreSetting`, and updated `OrderItem` with zero external dependencies. `Terma.Application` declares DTOs and service interfaces. `Terma.Infrastructure` handles EF Core migrations and persistence. `Terma.Api` controllers remain thin. | **PASSED** |
| **III. Feature-Driven Slices & Thin Routes** | Frontend changes are isolated within `features/products`, `features/cart`, `features/checkout`, and `features/admin`. Route files remain thin wrappers. | **PASSED** |
| **IV. Automated Quality Gates** | Unit tests cover domain entities, pricing calculations, and cart provider; integration tests verify API endpoints and order persistence. | **PASSED** |
| **V. Security & Operational Integrity** | Packaging prices are evaluated strictly on the server during quote and order placement; Admin settings update requires `Admin` role and `X-CSRF-TOKEN`; historical order data is immutable. | **PASSED** |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-product-packaging-options/
├── spec.md              # Feature specification & clarifications
├── plan.md              # Implementation plan (this file)
├── research.md          # Architecture decisions & trade-offs (Phase 0 output)
├── data-model.md        # Entities, cache models, and DTOs (Phase 1 output)
├── quickstart.md        # Runnable verification guide (Phase 1 output)
├── contracts/
│   └── packaging-api.md # Storefront, checkout, and admin contracts (Phase 1 output)
└── tasks.md             # Implementation tasks (Phase 2 output via /speckit-tasks)
```

### Source Code

```text
backend/
├── src/
│   ├── Terma.Domain/
│   │   └── Entities/
│   │       ├── PackagingType.cs                 # Packaging enum (Standard, GiftBox)
│   │       ├── StoreSetting.cs                  # Dynamic store settings entity
│   │       └── Order.cs                         # OrderItem.PackagingType & PackagingFee
│   ├── Terma.Application/
│   │   └── Store/
│   │       └── StoreModels.cs                   # Packaging DTOs, Checkout & Quote updates
│   ├── Terma.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── Configurations/
│   │   │   │   ├── StoreSettingConfiguration.cs # Table mapping and initial seed data
│   │   │   │   └── OrderConfiguration.cs        # OrderItem packaging columns
│   │   │   ├── Migrations/                      # EF Core migration
│   │   │   └── TermaDbContext.cs                # DbSet<StoreSetting>
│   │   └── Store/
│   │       └── StoreOperationsService.cs        # Settings management, Quote & Order logic
│   └── Terma.Api/
│       └── Controllers/
│           ├── StoreController.cs               # GET /api/store/packaging
│           ├── AdminStoreController.cs          # PUT /api/admin/settings/packaging
│           └── OrdersController.cs              # Updated Quote and Order creation
└── tests/
    ├── Terma.UnitTests/
    │   └── Domain/OrderItemTests.cs             # Packaging line total calculations
    └── Terma.IntegrationTests/
        └── StorePackagingApiTests.cs            # End-to-end API tests for packaging

frontend/
├── src/
│   └── features/
│       ├── products/
│       │   ├── components/
│       │   │   ├── product-capacity-details.tsx # Packaging selector UI
│       │   │   └── product-packaging-selector.tsx # Reusable packaging picker
│       │   └── product-api.ts                   # Fetch store packaging configuration
│       ├── cart/
│       │   ├── cart-provider.tsx                # PackagingType in CartItem & lineId logic
│       │   ├── add-to-cart-button.tsx           # Packaging selection propagation
│       │   ├── cart-drawer.tsx                  # Packaging badge & in-cart toggle
│       │   └── cart-page-client.tsx             # Packaging badge & in-cart toggle
│       ├── checkout/
│       │   ├── checkout-api.ts                  # PackagingType in CheckoutItemRequest
│       │   └── checkout-page-client.tsx         # Packaging summary in checkout invoice
│       └── admin/
│           ├── admin-settings-page.tsx          # Packaging price & active toggle form
│           └── admin-operations-pages.tsx       # Display packaging badge on order items
└── tests/
    └── cart/cart-provider.test.ts               # Packaging segregation and toggle tests
```

**Structure Decision**: Strictly adheres to the established repository architecture: Decoupled ASP.NET Core Clean Architecture backend and Next.js App Router feature-driven frontend slices.

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | Clean Architecture and Constitution boundaries fully satisfied without exceptions. |
