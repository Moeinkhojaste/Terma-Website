import { apiRequest } from "@/lib/api-client";
import type { PackagingType } from "@/features/cart/cart-provider";

export type CheckoutItemRequest = { productId: string; variantId?: string | null; quantity: number; packagingType?: PackagingType };
export type CheckoutRequest = { items: CheckoutItemRequest[]; fullName: string; phone: string; email?: string; province: string; city: string; address: string; postalCode: string; customerNotes?: string; couponCode?: string };
export type CreatedOrder = { id: string; number: string; total: number; reservationExpiresAtUtc: string };
export type CheckoutQuoteItem = { productId: string; variantId?: string | null; productName: string; sku: string; unitPrice: number; packagingFee: number; packagingType: PackagingType; quantity: number; availableQuantity: number };
export type CheckoutQuote = { subtotal: number; packagingTotal: number; discountTotal: number; shippingTotal: number; total: number; items?: CheckoutQuoteItem[]; reservedUntilUtc?: string };

export function createOrder(request: CheckoutRequest) {
  const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return apiRequest<CreatedOrder>("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });
}

export function getQuote(request: Partial<CheckoutRequest>) {
  return apiRequest<CheckoutQuote>("/api/checkout/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });
}

export type PaymentInitiateResponse = {
  success: boolean;
  paymentUrl: string;
  authority: string;
};

export function initiatePayment(orderId: string) {
  return apiRequest<PaymentInitiateResponse>("/api/payment/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
    cache: "no-store",
  });
}

