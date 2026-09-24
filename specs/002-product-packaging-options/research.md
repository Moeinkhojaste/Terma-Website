# Architecture Research & Decisions: Product Packaging Options

**Feature**: `002-product-packaging-options`  
**Date**: 2026-09-24  
**Status**: Approved

---

## 1. Store Packaging Settings Persistence

### Decision
Persist editable store settings using a general-purpose, lightweight `StoreSetting` entity in `Terma.Domain` mapped to a `StoreSettings` table in EF Core, pre-seeded with:
- `Packaging:GiftBoxPrice` = `200000` (stored in Tomans as decimal/string)
- `Packaging:GiftBoxEnabled` = `true` (boolean string)

### Rationale
- The user explicitly requested that the packaging price and availability be editable via the Admin Panel.
- Reading from static `appsettings.json` would require container/app restarts and server configuration access.
- A generic `StoreSetting` entity (`Key`, `Value`, `UpdatedAtUtc`) allows the platform to manage future dynamic operational settings (e.g., free gift thresholds, holiday announcements) without adding new tables or running migrations for every single operational variable.
- Simple caching in memory or EF Core direct lookup ensures zero performance penalty (<1ms retrieval).

### Alternatives Considered
- **Configuration-only (`appsettings.json`)**: Rejected because it cannot be modified by the store administrator through the web dashboard without backend deployment access.
- **Dedicated single-row `PackagingSetting` table**: Evaluated, but creates schema bloat for just two operational flags. `StoreSetting` is more idiomatic and scalable.

---

## 2. Cart Item Identity & Line Segregation

### Decision
Extend the frontend cart line identity schema from `${productId}:${variantId}` to:
```text
${productId}:${variantId ?? "default"}:${packagingType}
```
Where `packagingType` is either `"Standard"` or `"GiftBox"`.

### Rationale
- A customer may want to order two of the same tablecloth: one for personal everyday use (Standard packaging, +0 Toman) and one as a gift for a friend (Gift packaging in a box, +200,000 Toman).
- Incorporating `packagingType` into the `lineId` allows Next.js `CartProvider` to treat them as independent line items in the cart drawer and checkout table without complicating state management.
- Switching packaging directly inside the cart drawer/page will either update the line's packaging type (and recompute `lineId`) or merge into an existing matching line if the same product with the target packaging already exists in the cart.

### Alternatives Considered
- **Order-level packaging selection**: Rejected because the user requirement explicitly states that packaging is chosen on the product page per item.
- **Single cart line with a packaging counter**: High UI complexity and confusing for the user when adjusting quantities. Separate lines are standard across major e-commerce platforms (Amazon, Digikala).

---

## 3. Financial Invariants & Security Boundaries

### Decision
- The client NEVER supplies packaging fee amounts to the server. The client only sends `PackagingType` (`"Standard"` or `"GiftBox"`) in `CheckoutItemRequest`.
- During `QuoteAsync` and `CreateOrderAsync`, the server retrieves the current active `GiftPackagingPrice` from `StoreSettings` (verifying `IsGiftPackagingEnabled == true`).
- For `"Standard"`, `PackagingFee = 0`. For `"GiftBox"`, `PackagingFee = currentGiftPackagingPrice`.
- `OrderItem` stores `PackagingType` and snapshots `PackagingFee` at the moment of order placement.
- `OrderItem.LineTotal = (UnitPrice + PackagingFee) * Quantity`.
- `Order` captures `Subtotal` as the sum of all item line totals, and calculates `PackagingTotal = Items.Sum(i => i.PackagingFee * i.Quantity)`.

### Rationale
- Complies strictly with Constitution Principle V (Security & Operational Integrity). Client-side price manipulation is completely prevented.
- Ensures historical order immutability: changing the gift packaging price or disabling gift boxes in the admin panel tomorrow will NEVER alter the financial totals or line details of past orders.

### Alternatives Considered
- **Injecting Gift Box as a standalone `OrderItem`**: Rejected because a gift box is not a standalone catalog product (it has no variant, dimensions, or fabric inventory) and would corrupt sales reporting for actual tablecloths.

---

## 4. Admin API & Storefront Contracts

### Decision
1. **Public Store API**:
   - `GET /api/store/packaging`: Returns `{ giftPackagingPrice: decimal, isGiftPackagingEnabled: boolean }`.
   - Used by the product detail page and cart drawer to fetch current active packaging price and status.
2. **Admin Store API**:
   - `GET /api/admin/settings`: Returns operational settings including `{ reservationHours, lowStockDefaultThreshold, currency, giftPackagingPrice, isGiftPackagingEnabled }`.
   - `PUT /api/admin/settings/packaging`: Accepts `{ giftPackagingPrice: decimal, isGiftPackagingEnabled: boolean }`, protected by `Admin` authorization and `X-CSRF-TOKEN`.
3. **Checkout API**:
   - `POST /api/checkout/quote` & `POST /api/orders`: Request items payload contains `{ productId, variantId, quantity, packagingType }`.
   - Quote response includes `packagingTotal` breakdown.
   - Admin orders endpoint `GET /api/admin/orders` returns `packagingType` and `packagingFee` for each line item in `AdminOrderItemDto`.

---

## 5. UI/UX Interaction Design

### Decision
- **Product Page**:
  - Below capacity selection and above the Add to Cart button, provide a visual selector with two pill/radio cards:
    1. «بسته‌بندی معمولی» (Standard) - پیش‌فرض، بدون هزینه
    2. «بسته‌بندی کادویی (جعبه)» (GiftBox) - دارای برچسب قیمت پویا (+۲۰۰٬۰۰۰ تومان)
  - If `isGiftPackagingEnabled == false`, the GiftBox option is disabled with a badge «ناموجود».
- **Cart Drawer & Cart Page**:
  - Each item displays its active packaging badge.
  - A subtle interactive toggle/button allows changing packaging directly in the cart (`تغییر به کادویی` / `تغییر به معمولی`).
  - Item price reflects unit price + packaging fee.
- **Admin Orders**:
  - In the order details item table, gift packaging items feature a prominent badge (e.g., `🎁 کادویی (جعبه)`).
