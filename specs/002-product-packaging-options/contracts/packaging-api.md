# API Contracts: Product Packaging Options

**Feature**: `002-product-packaging-options`  
**Date**: 2026-09-24  
**Status**: Approved

---

## 1. Public Store Packaging Endpoint

### `GET /api/store/packaging`
Retrieves public storefront packaging configuration (price and availability).

- **Authentication**: None (Public)
- **Response 200 OK**:
```json
{
  "giftPackagingPrice": 200000,
  "isGiftPackagingEnabled": true
}
```

---

## 2. Admin Store Settings Endpoints

### `GET /api/admin/settings`
Retrieves operational store settings including packaging configuration.

- **Authentication**: Admin cookie required (`__Host-` / identity cookie)
- **Response 200 OK**:
```json
{
  "reservationHours": 24,
  "lowStockDefaultThreshold": 2,
  "currency": "تومان",
  "giftPackagingPrice": 200000,
  "isGiftPackagingEnabled": true
}
```

---

### `PUT /api/admin/settings/packaging`
Updates store packaging price and active status.

- **Authentication**: Admin cookie required
- **Headers**: `X-CSRF-TOKEN: <valid-token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "giftPackagingPrice": 250000,
  "isGiftPackagingEnabled": true
}
```
- **Validation**:
  - `giftPackagingPrice`: >= 0
  - `isGiftPackagingEnabled`: boolean
- **Response 200 OK**:
```json
{
  "reservationHours": 24,
  "lowStockDefaultThreshold": 2,
  "currency": "تومان",
  "giftPackagingPrice": 250000,
  "isGiftPackagingEnabled": true
}
```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (negative price)
  - `401 Unauthorized`: Not logged in as admin
  - `403 Forbidden`: Anti-forgery validation failed

---

## 3. Storefront Checkout Endpoints

### `POST /api/checkout/quote`
Calculates quote and line breakdowns including packaging fees.

- **Authentication**: Public / Optional Customer
- **Request Body**:
```json
{
  "items": [
    {
      "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
      "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
      "quantity": 2,
      "packagingType": "GiftBox"
    },
    {
      "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
      "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
      "quantity": 1,
      "packagingType": "Standard"
    }
  ],
  "province": "تهران",
  "city": "تهران"
}
```
- **Response 200 OK**:
```json
{
  "subtotal": 1900000,
  "packagingTotal": 400000,
  "discountTotal": 0,
  "shippingTotal": 45000,
  "total": 1945000,
  "items": [
    {
      "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
      "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
      "productName": "رومیزی سنتی یزد طرح ترما",
      "sku": "TRM-YZD-01-M",
      "unitPrice": 750000,
      "packagingFee": 200000,
      "packagingType": "GiftBox",
      "quantity": 2,
      "availableQuantity": 15
    },
    {
      "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
      "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
      "productName": "رومیزی سنتی یزد طرح ترما",
      "sku": "TRM-YZD-01-M",
      "unitPrice": 750000,
      "packagingFee": 0,
      "packagingType": "Standard",
      "quantity": 1,
      "availableQuantity": 15
    }
  ],
  "reservedUntilUtc": "2026-09-25T13:50:00Z"
}
```

---

### `POST /api/orders`
Creates and reserves order items with selected packaging.

- **Headers**: `Idempotency-Key: <UUID>`
- **Request Body**:
```json
{
  "items": [
    {
      "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
      "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
      "quantity": 1,
      "packagingType": "GiftBox"
    }
  ],
  "fullName": "سهراب سپهری",
  "phone": "09123456789",
  "province": "کاشان",
  "city": "کاشان",
  "address": "خیابان ملاصدرا، کوچه بهار، پلاک ۴",
  "postalCode": "1234567890"
}
```
- **Response 200 OK**:
```json
{
  "id": "e2c34a1b-1234-5678-9abc-def012345678",
  "number": "TRM-20260924-492104",
  "total": 995000,
  "reservationExpiresAtUtc": "2026-09-25T13:50:00Z"
}
```

---

## 4. Admin Orders Endpoint

### `GET /api/admin/orders`
Order item response contains packaging indicators:

```json
[
  {
    "id": "e2c34a1b-1234-5678-9abc-def012345678",
    "number": "TRM-20260924-492104",
    "customerName": "سهراب سپهری",
    "phone": "09123456789",
    "status": "Confirmed",
    "total": 995000,
    "createdAt": "2026-09-24T13:50:00Z",
    "items": [
      {
        "productId": "4f9d2d0a-9d6e-4c8d-8a5f-7c1e5a2b3c4d",
        "variantId": "8a7c2d0a-1111-4c8d-8a5f-7c1e5a2b3c4d",
        "productName": "رومیزی سنتی یزد طرح ترما",
        "sku": "TRM-YZD-01-M",
        "unitPrice": 750000,
        "packagingFee": 200000,
        "packagingType": "GiftBox",
        "quantity": 1
      }
    ]
  }
]
```
