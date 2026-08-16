import { apiRequest, resetAntiforgeryToken } from "@/lib/api-client";

export type CustomerSession = {
  userId: string;
  phone: string;
  expiresAtUtc: string;
  claimedOrderCount: number;
};

export type OtpChallenge = {
  challengeId: string;
  expiresAtUtc: string;
  retryAfterSeconds: number;
  developmentCode?: string;
};

export type CustomerProfile = {
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  orderCount: number;
  wishlistCount: number;
  addressCount: number;
  createdAt: string;
};

export type UpdateProfileRequest = {
  fullName: string;
  email?: string | null;
};

export type CustomerAddress = {
  id: string;
  title: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
};

export type AddressWriteRequest = {
  title?: string;
  receiverName: string;
  receiverPhone?: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault?: boolean;
};

export type WishlistItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  inStock: boolean;
  categoryName?: string | null;
  createdAt: string;
};

export type OrderStatus =
  | "PendingConfirmation"
  | "Confirmed"
  | "Preparing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Expired";

export type CustomerOrderSummary = {
  id: string;
  number: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
  postalTrackingCode?: string | null;
};

export type PagedOrders = {
  items: CustomerOrderSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type CustomerOrderDetails = Omit<CustomerOrderSummary, "itemCount"> & {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  items: {
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  history: { status: OrderStatus; createdAt: string }[];
};

export type CustomerDashboard = {
  profile: CustomerProfile;
  recentOrders: CustomerOrderSummary[];
  defaultAddress?: CustomerAddress | null;
  totalOrders: number;
  pendingOrders: number;
  wishlistCount: number;
  addressCount: number;
};

// Authentication
export const requestOtp = (phone: string) =>
  apiRequest<OtpChallenge>("/api/customer-auth/otp/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
    cache: "no-store",
  });

export async function verifyOtp(challengeId: string, code: string) {
  const session = await apiRequest<CustomerSession>("/api/customer-auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
    cache: "no-store",
  });
  resetAntiforgeryToken();
  return session;
}

export const getCustomerSession = () =>
  apiRequest<CustomerSession>("/api/customer-auth/me", { cache: "no-store" });

export const logoutCustomer = async () => {
  try {
    await apiRequest<void>("/api/customer-auth/logout", { method: "POST", cache: "no-store" });
  } finally {
    resetAntiforgeryToken();
  }
};

// Profile & Dashboard
export const getCustomerDashboard = () =>
  apiRequest<CustomerDashboard>("/api/customer/dashboard", { cache: "no-store" });

export const getCustomerProfile = () =>
  apiRequest<CustomerProfile>("/api/customer/profile", { cache: "no-store" });

export const updateCustomerProfile = (request: UpdateProfileRequest) =>
  apiRequest<CustomerProfile>("/api/customer/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

// Orders
export const getCustomerOrders = (page = 1) =>
  apiRequest<PagedOrders>(`/api/customer/orders?page=${page}&pageSize=20`, { cache: "no-store" });

export const getCustomerOrder = (id: string) =>
  apiRequest<CustomerOrderDetails>(`/api/customer/orders/${encodeURIComponent(id)}`, { cache: "no-store" });

// Addresses
export const getCustomerAddresses = () =>
  apiRequest<CustomerAddress[]>("/api/customer/addresses", { cache: "no-store" });

export const createCustomerAddress = (request: AddressWriteRequest) =>
  apiRequest<CustomerAddress>("/api/customer/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

export const updateCustomerAddress = (id: string, request: AddressWriteRequest) =>
  apiRequest<CustomerAddress>(`/api/customer/addresses/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

export const deleteCustomerAddress = (id: string) =>
  apiRequest<void>(`/api/customer/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });

export const setDefaultCustomerAddress = (id: string) =>
  apiRequest<CustomerAddress>(`/api/customer/addresses/${encodeURIComponent(id)}/default`, {
    method: "PUT",
    cache: "no-store",
  });

// Wishlist
export const getWishlist = () =>
  apiRequest<WishlistItem[]>("/api/customer/wishlist", { cache: "no-store" });

export const getWishlistIds = () =>
  apiRequest<string[]>("/api/customer/wishlist/ids", { cache: "no-store" });

export const toggleWishlistProduct = (productId: string) =>
  apiRequest<{ added: boolean }>(`/api/customer/wishlist/${encodeURIComponent(productId)}`, {
    method: "POST",
    cache: "no-store",
  });

export const removeFromWishlist = (productId: string) =>
  apiRequest<void>(`/api/customer/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    cache: "no-store",
  });

export const orderStatusLabels: Record<OrderStatus, string> = {
  PendingConfirmation: "در انتظار تأیید",
  Confirmed: "تأیید شده",
  Preparing: "در حال آماده‌سازی",
  Shipped: "ارسال شده",
  Delivered: "تحویل شده",
  Cancelled: "لغو شده",
  Expired: "منقضی شده",
};
