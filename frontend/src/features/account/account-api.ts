import { apiRequest, resetAntiforgeryToken } from "@/lib/api-client";

export type CustomerSession = { userId: string; phone: string; expiresAtUtc: string; claimedOrderCount: number };
export type OtpChallenge = { challengeId: string; expiresAtUtc: string; retryAfterSeconds: number; developmentCode?: string };
export type OrderStatus = "PendingConfirmation" | "Confirmed" | "Preparing" | "Shipped" | "Delivered" | "Cancelled" | "Expired";
export type CustomerOrderSummary = { id: string; number: string; status: OrderStatus; total: number; createdAt: string; itemCount: number };
export type PagedOrders = { items: CustomerOrderSummary[]; page: number; pageSize: number; totalCount: number; totalPages: number };
export type CustomerOrderDetails = Omit<CustomerOrderSummary, "itemCount"> & {
  fullName: string; phone: string; province: string; city: string; address: string; postalCode: string;
  subtotal: number; discountTotal: number; shippingTotal: number;
  items: { productId: string; variantId?: string; productName: string; sku: string; unitPrice: number; quantity: number; lineTotal: number }[];
  history: { status: OrderStatus; createdAt: string }[];
};

export const requestOtp = (phone: string) => apiRequest<OtpChallenge>("/api/customer-auth/otp/request", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }), cache: "no-store",
});
export async function verifyOtp(challengeId: string, code: string) {
  const session = await apiRequest<CustomerSession>("/api/customer-auth/otp/verify", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId, code }), cache: "no-store",
  });
  // Antiforgery tokens are bound to the current identity. OTP verification
  // changes the request from anonymous to customer-authenticated, so the
  // next mutation must obtain a token for the new customer principal.
  resetAntiforgeryToken();
  return session;
}
export const getCustomerSession = () => apiRequest<CustomerSession>("/api/customer-auth/me", { cache: "no-store" });
export const logoutCustomer = () => apiRequest<void>("/api/customer-auth/logout", { method: "POST", cache: "no-store" });
export const getCustomerOrders = (page = 1) => apiRequest<PagedOrders>(`/api/customer/orders?page=${page}&pageSize=20`, { cache: "no-store" });
export const getCustomerOrder = (id: string) => apiRequest<CustomerOrderDetails>(`/api/customer/orders/${encodeURIComponent(id)}`, { cache: "no-store" });

export const orderStatusLabels: Record<OrderStatus, string> = {
  PendingConfirmation: "در انتظار تأیید", Confirmed: "تأیید شده", Preparing: "در حال آماده‌سازی", Shipped: "ارسال شده",
  Delivered: "تحویل شده", Cancelled: "لغو شده", Expired: "منقضی شده",
};
