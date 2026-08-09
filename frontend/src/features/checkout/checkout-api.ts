import { apiRequest } from "@/lib/api-client";

export type CheckoutItemRequest = { productId: string; variantId?: string | null; quantity: number };
export type CheckoutRequest = { items: CheckoutItemRequest[]; fullName: string; phone: string; email?: string; province: string; city: string; address: string; postalCode: string; couponCode?: string };
export type CreatedOrder = { id: string; number: string; trackingToken: string; total: number; reservationExpiresAtUtc: string };
export function createOrder(request: CheckoutRequest) { return apiRequest<CreatedOrder>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(request), cache: "no-store" }); }
