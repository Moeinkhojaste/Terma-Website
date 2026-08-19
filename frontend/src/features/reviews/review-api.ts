import { apiRequest } from "@/lib/api-client";
import type {
  ProductReviewsSummary,
  CustomerReview,
  AdminProductReview,
  CreateReviewInput,
  PagedAdminReviews,
  ReviewStatus,
} from "./models";

export async function getProductReviews(
  identifier: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ProductReviewsSummary> {
  return apiRequest<ProductReviewsSummary>(
    `/api/products/${encodeURIComponent(identifier)}/reviews?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" }
  );
}

export async function submitProductReview(input: CreateReviewInput): Promise<CustomerReview> {
  return apiRequest<CustomerReview>("/api/customer/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
}

export async function getMyReviews(): Promise<CustomerReview[]> {
  return apiRequest<CustomerReview[]>("/api/customer/reviews", { cache: "no-store" });
}

export async function getMyProductReview(productId: string): Promise<CustomerReview | null> {
  try {
    return await apiRequest<CustomerReview>(
      `/api/customer/reviews/products/${encodeURIComponent(productId)}/my-review`,
      { cache: "no-store" }
    );
  } catch {
    return null;
  }
}

export async function getAdminReviews(params: {
  status?: ReviewStatus;
  productId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PagedAdminReviews> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.productId) query.set("productId", params.productId);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());

  const qs = query.toString();
  return apiRequest<PagedAdminReviews>(`/api/admin/reviews${qs ? `?${qs}` : ""}`, { cache: "no-store" });
}

export async function approveAdminReview(reviewId: string): Promise<AdminProductReview> {
  return apiRequest<AdminProductReview>(`/api/admin/reviews/${encodeURIComponent(reviewId)}/approve`, {
    method: "PUT",
    cache: "no-store",
  });
}

export async function rejectAdminReview(reviewId: string, reason?: string): Promise<AdminProductReview> {
  return apiRequest<AdminProductReview>(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    cache: "no-store",
  });
}

export async function replyAdminReview(reviewId: string, response: string): Promise<AdminProductReview> {
  return apiRequest<AdminProductReview>(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response }),
    cache: "no-store",
  });
}

export async function deleteAdminReview(reviewId: string): Promise<void> {
  return apiRequest<void>(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
