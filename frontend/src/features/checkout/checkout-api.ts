import { apiRequest } from "@/lib/api-client";

export type CheckoutItemRequest = { productId: string; variantId?: string | null; quantity: number };
export type CheckoutRequest = { items: CheckoutItemRequest[]; fullName: string; phone: string; province: string; city: string; address: string; postalCode: string; customerNotes?: string; couponCode?: string };
export type CreatedOrder = { id: string; number: string; trackingToken: string; total: number; reservationExpiresAtUtc: string };
export type CheckoutQuote = { subtotal: number; discountTotal: number; shippingTotal: number; total: number };
export function createOrder(request: CheckoutRequest) { return apiRequest<CreatedOrder>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(request), cache: "no-store" }); }
export function getQuote(request: Partial<CheckoutRequest>) { return apiRequest<CheckoutQuote>("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), cache: "no-store" }); }
