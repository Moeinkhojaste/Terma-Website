import { apiRequest } from "@/lib/api-client";

export type CartValidationItemRequest = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type CartValidationItemResult = {
  productId: string;
  variantId?: string | null;
  status: "Available" | "OutOfStock" | "Inactive" | "QuantityAdjusted";
  availableQuantity: number;
  currentPrice: number;
  productName?: string;
  message?: string;
};

export type ValidateCartResponse = {
  hasChanges: boolean;
  items: CartValidationItemResult[];
  notifications: string[];
};

export async function validateCart(items: CartValidationItemRequest[]): Promise<ValidateCartResponse> {
  return apiRequest<ValidateCartResponse>("/api/store/cart/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
}
