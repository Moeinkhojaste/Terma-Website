import { apiRequest } from "@/lib/api-client";

export type Dashboard = { productCount: number; categoryCount: number; lowStockCount: number; pendingOrderCount: number; unreadMessageCount: number; customerCount: number; orderValue: number };
export type AdminOrder = { id: string; number: string; customerName: string; phone: string; status: string; total: number; createdAt: string; reservationExpiresAtUtc: string; province: string; city: string; address: string; postalCode: string; customerNotes: string | null; postalTrackingCode?: string | null; items: { productId: string; variantId: string | null; productName: string; variantTitle?: string | null; tableCapacity?: number | null; sku: string; unitPrice: number; packagingFee?: number; packagingType?: string; quantity: number }[] };
export type AdminCustomer = { id: string; fullName: string; phone: string; email: string | null; orderCount: number; totalOrderValue: number; createdAt: string };
export type Promotion = { id: string; name: string; code: string | null; type: string; discountType: string; value: number; minimumSubtotal: number | null; maximumDiscount: number | null; usageLimit: number | null; usageCount: number; startsAtUtc: string; endsAtUtc: string | null; isActive: boolean };
export type ShippingRule = { id: string; name: string; province: string | null; city: string | null; cost: number; freeAboveSubtotal: number | null; priority: number; isActive: boolean };
export type StoreContent = { id: string; pageKey: string; sectionKey: string; title: string; body: string; linkUrl: string | null; imageUrl: string | null; seoTitle: string | null; seoDescription: string | null; isPublished: boolean };
export type ContactMessage = { id: string; name: string; phone: string; email: string | null; topic: string; body: string; status: string; createdAt: string };
export type ProductVariant = { id:string; productId:string; title:string; sku:string; color:string; tableCapacity:number; length:number; width:number; price:number; compareAtPrice:number|null; stockQuantity:number; reservedQuantity:number; availableQuantity:number; lowStockThreshold:number; isActive:boolean };
export type ProductMediaKind = "Full" | "Table" | "Folded" | "Texture" | "Stitching" | "Lining" | "Other";
export type ProductMedia = { id:string; productId:string; publicUrl:string; altText:string; kind:ProductMediaKind; sortOrder:number; isPrimary:boolean };
export type ProductMediaInput = { publicUrl:string; altText:string; kind:ProductMediaKind; sortOrder:number; isPrimary:boolean };

export const getDashboard = () => apiRequest<Dashboard>("/api/admin/dashboard", { cache: "no-store" });
export const getOrders = () => apiRequest<AdminOrder[]>("/api/admin/orders", { cache: "no-store" });
export const changeOrderStatus = (id: string, status: string, postalTrackingCode?: string | null) => apiRequest<AdminOrder>(`/api/admin/orders/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, postalTrackingCode }) });
export const getCustomers = () => apiRequest<AdminCustomer[]>("/api/admin/customers", { cache: "no-store" });
export const getPromotions = () => apiRequest<Promotion[]>("/api/admin/promotions", { cache: "no-store" });
export const getShippingRules = () => apiRequest<ShippingRule[]>("/api/admin/shipping-rules", { cache: "no-store" });
export const getContent = (page?: string) => apiRequest<StoreContent[]>(`/api/admin/content${page ? `?page=${encodeURIComponent(page)}` : ""}`, { cache: "no-store" });
export const upsertContent = (content: Partial<StoreContent>) => apiRequest<StoreContent>("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
export const deleteContent = (id: string) => apiRequest(`/api/admin/content/${id}`, { method: "DELETE" });
export const getMessages = () => apiRequest<ContactMessage[]>("/api/admin/messages", { cache: "no-store" });
export const changeMessageStatus = (id: string, status: string) => apiRequest<ContactMessage>(`/api/admin/messages/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
export const getVariants = (productId:string) => apiRequest<ProductVariant[]>(`/api/admin/products/${productId}/variants`, {cache:"no-store"});
export const createVariant = (productId:string, body:Partial<ProductVariant>) => apiRequest<ProductVariant>(`/api/admin/products/${productId}/variants`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const updateVariant = (id:string, body:Partial<ProductVariant>) => apiRequest<ProductVariant>(`/api/admin/variants/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const deleteVariant = (id:string) => apiRequest(`/api/admin/variants/${id}`, {method:"DELETE"});
export const getProductMedia = (productId:string) => apiRequest<ProductMedia[]>(`/api/admin/products/${productId}/media`, {cache:"no-store"});
export const createProductMedia = (productId:string, body:ProductMediaInput) => apiRequest<ProductMedia>(`/api/admin/products/${productId}/media`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const updateProductMedia = (id:string, body:ProductMediaInput) => apiRequest<ProductMedia>(`/api/admin/media/${id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const deleteProductMedia = (id:string) => apiRequest<void>(`/api/admin/media/${id}`, {method:"DELETE"});

export type SalesMetrics = {
  sales30Days: number;
  sales1Year: number;
  allTimeValidSales: number;
  orders30Days: number;
  orders1Year: number;
  ordersTotal: number;
  itemsSold30Days: number;
  itemsSold1Year: number;
  itemsSoldTotal: number;
  averageItemsPerOrder30Days: number;
  averageItemsPerOrder1Year: number;
  averageOrderValue30Days: number;
  averageOrderValue1Year: number;
};

export type RegistrationMetrics = {
  totalRegisteredCustomers: number;
  newRegistrations30Days: number;
  newRegistrations1Year: number;
  guestCustomers: number;
};

export type AbandonedCartsMetrics = {
  abandonedCount30Days: number;
  abandonedCount1Year: number;
  abandonedValue30Days: number;
  abandonedValue1Year: number;
  abandonmentRate30Days: number;
  expiredCheckouts30Days: number;
  expiredCheckoutsValue30Days: number;
};

export type DailyMetricPoint = {
  date: string;
  persianDate: string;
  sales: number;
  orderCount: number;
  itemsSold: number;
};

export type MonthlyMetricPoint = {
  month: string;
  persianMonth: string;
  sales: number;
  orderCount: number;
  itemsSold: number;
};

export type OrderStatusStat = {
  status: string;
  persianStatus: string;
  count: number;
  totalValue: number;
};

export type TopSellingProduct = {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  categoryName: string;
  imageUrl: string | null;
  unitsSold: number;
  totalRevenue: number;
  averagePrice: number;
};

export type TopViewedProduct = {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  categoryName: string;
  imageUrl: string | null;
  viewCount: number;
  orderCount: number;
  unitsSold: number;
  conversionRate: number;
};

export type LoyalCustomer = {
  customerId: string;
  userId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  orderCount: number;
  totalOrderValue: number;
  averageOrderValue: number;
  lastOrderAtUtc: string | null;
  loyaltyTier: string;
};

export type AbandonedCartItem = {
  productName: string;
  variantName: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
};

export type AbandonedCartDetails = {
  id: string;
  sessionKeyOrOrderNumber: string;
  customerName: string | null;
  phone: string | null;
  email: string | null;
  itemCount: number;
  totalValue: number;
  lastActivityAtUtc: string;
  isExpiredCheckout: boolean;
  items: AbandonedCartItem[];
};

export type AbandonedCartsReport = {
  totalAbandonedCount: number;
  totalAbandonedValue: number;
  abandonmentRate: number;
  items: AbandonedCartDetails[];
};

export type AdminAnalytics = {
  sales: SalesMetrics;
  registrations: RegistrationMetrics;
  abandonedCarts: AbandonedCartsMetrics;
  dailyTrend30Days: DailyMetricPoint[];
  monthlyTrend1Year: MonthlyMetricPoint[];
  orderStatusBreakdown: OrderStatusStat[];
  topSellingProducts30Days: TopSellingProduct[];
  topViewedProducts30Days: TopViewedProduct[];
  loyalCustomers: LoyalCustomer[];
};

export const getAdminAnalytics = () => apiRequest<AdminAnalytics>("/api/admin/analytics", { cache: "no-store" });
export const getAbandonedCarts = (page: number = 1, pageSize: number = 20) => apiRequest<AbandonedCartsReport>(`/api/admin/abandoned-carts?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
export const getLoyalCustomers = (limit: number = 20) => apiRequest<LoyalCustomer[]>(`/api/admin/loyal-customers?limit=${limit}`, { cache: "no-store" });
export const getTopSellingProducts = (days: number = 30, limit: number = 10) => apiRequest<TopSellingProduct[]>(`/api/admin/products/top-selling?days=${days}&limit=${limit}`, { cache: "no-store" });
export const getTopViewedProducts = (days: number = 30, limit: number = 10) => apiRequest<TopViewedProduct[]>(`/api/admin/products/top-viewed?days=${days}&limit=${limit}`, { cache: "no-store" });

