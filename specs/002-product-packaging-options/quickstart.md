# Quickstart & Verification Guide: Product Packaging Options

**Feature**: `002-product-packaging-options`  
**Date**: 2026-09-24  
**Status**: Ready for Verification

---

## 1. Prerequisites

- **Backend**: .NET 8 SDK installed (`dotnet --version` >= 8.0)
- **Frontend**: Node.js 20+ and npm installed (`npm --version`)
- **Repository Root**: `d:\Personal\Shop\Website`

---

## 2. Automated Test Verification

### 2.1 Backend Tests
Run domain, unit, and integration tests to verify packaging pricing calculations, immutability, and endpoint contracts:

```powershell
# In backend/
dotnet test backend/tests/Terma.UnitTests/Terma.UnitTests.csproj
dotnet test backend/tests/Terma.IntegrationTests/Terma.IntegrationTests.csproj
```

**Key tests exercised**:
- `OrderItemTests`: Verifies `LineTotal` calculation with and without `PackagingFee`.
- `StorePackagingApiTests`:
  - `GET /api/store/packaging`: Returns active price and status.
  - `PUT /api/admin/settings/packaging`: Updates price and toggle; requires authentication and CSRF.
  - `POST /api/checkout/quote`: Correctly computes `packagingTotal` for multiple lines.
  - `POST /api/orders`: Saves `PackagingType` and `PackagingFee` snapshot in `OrderItem`.
  - Historical order immutability after updating packaging settings.

### 2.2 Frontend Tests
Run component and state unit tests:

```powershell
# In frontend/
cd frontend
npm run typecheck
npm test -- src/features/cart src/features/products src/features/admin
npm run build
```

---

## 3. End-to-End Walkthrough Scenarios

### Scenario A: Admin Modifies Packaging Price & Toggle
1. Log in to the Admin Dashboard at `http://localhost:3000/admin/login`.
2. Navigate to **تنظیمات** (`/admin/settings`).
3. Locate the new **بسته‌بندی کادویی** panel.
4. Verify current settings:
   - وضعیت: **فعال**
   - هزینه بسته‌بندی کادویی: **۲۰۰٬۰۰۰ تومان**
5. Change price to **۲۵۰٬۰۰۰ تومان** and click **ذخیره تنظیمات**.
6. Verify toast notification confirms update.
7. Send request to `GET /api/store/packaging` and verify `giftPackagingPrice` reflects `250000`.

### Scenario B: Customer Purchases with Gift Packaging
1. Open any product page (e.g., `http://localhost:3000/products/tahmtan-tablecloth`).
2. Observe the packaging selector under capacity options:
   - **بسته‌بندی معمولی (رایگان)** (Selected by default)
   - **بسته‌بندی کادویی (جعبه)** (+۲۵۰٬۰۰۰ تومان)
3. Select **بسته‌بندی کادویی (جعبه)**.
4. Click **افزودن به سبد خرید**.
5. In the cart drawer:
   - The item is shown with a **بسته‌بندی کادویی** badge.
   - Price reflects product unit price + packaging fee.
6. Test in-cart toggle: Click the toggle button to switch to **بسته‌بندی معمولی** and verify the total immediately drops by ۲۵۰٬۰۰۰ تومان. Switch back to **بسته‌بندی کادویی**.
7. Proceed to checkout (`/checkout`).
8. Verify the order breakdown lists the packaging fee clearly in the invoice.
9. Complete the test order and view the order confirmation page.

### Scenario C: Warehouse & Admin Order Fulfillment
1. Open Admin Orders page at `http://localhost:3000/admin/orders`.
2. Find the newly placed order.
3. Verify that each item in the order list clearly displays:
   - Product name and variant.
   - Distinctive badge: **🎁 بسته‌بندی کادویی (جعبه)**.
   - Unit price and applied packaging fee snapshot.
