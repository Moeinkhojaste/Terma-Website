# API Contracts: Customer Order SMS Notifications

**Feature**: `001-customer-sms-tracking`  

---

## 1. Customer Order Viewing
Customer orders, statuses, and postal tracking codes are served by the existing passwordless OTP customer portal:
- Endpoint: `GET /api/account/orders` and `GET /api/account/orders/{id}`
- Authenticated via secure host cookie (`__Host-TermaAuth`)

---

## 2. Admin Order Status & Postal Tracking
Allows the administrator to update order status, record the 24-digit postal tracking code, and optionally trigger a resend of the customer SMS.

### Endpoint
`PUT /api/admin/orders/{id}/status`

### Request Body
```json
{
  "status": "Shipped",
  "postalTrackingCode": "123456789012345678901234",
  "resendNotification": true
}
```

### Response: `200 OK`
```json
{
  "id": "e8d64119-9c59-4b1c-9ec3-9799d10e5d4a",
  "number": "ORD-20260922-001",
  "customerName": "معین خجسته",
  "phone": "09121234567",
  "status": "Shipped",
  "total": 2365000,
  "createdAt": "2026-09-22T10:15:30Z",
  "postalTrackingCode": "123456789012345678901234",
  "items": [...]
}
```
