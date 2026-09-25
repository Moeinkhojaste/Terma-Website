import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "./cart-provider";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { createProduct } from "@/test/product-fixture";
import * as cartApi from "./cart-api";

vi.mock("./cart-api", () => ({
  validateCart: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <CartProvider>{children}</CartProvider>
    </FeedbackProvider>
  );
}

describe("Cart Revalidation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("removes out-of-stock items and updates cart when revalidation detects changes", async () => {
    const product1 = createProduct({ id: "prod-1", name: "ترمه آبی", stockQuantity: 1 });
    const product2 = createProduct({ id: "prod-2", name: "ترمه قرمز", stockQuantity: 2 });

    localStorage.setItem(
      "terma-cart",
      JSON.stringify({
        version: 3,
        items: [
          { lineId: "prod-1:variant-6:Standard", productId: "prod-1", variantId: "variant-6", product: product1, quantity: 1, packagingType: "Standard", packagingFee: 0 },
          { lineId: "prod-2:variant-6:Standard", productId: "prod-2", variantId: "variant-6", product: product2, quantity: 2, packagingType: "Standard", packagingFee: 0 },
        ],
      })
    );

    vi.mocked(cartApi.validateCart).mockResolvedValue({
      hasChanges: true,
      items: [
        { productId: "prod-1", variantId: "variant-6", status: "OutOfStock", availableQuantity: 0, currentPrice: 2000000, message: "ناموجود" },
        { productId: "prod-2", variantId: "variant-6", status: "Available", availableQuantity: 2, currentPrice: 2000000 },
      ],
      notifications: ["محصول «ترمه آبی» به دلیل اتمام موجودی از سبد خرید شما حذف گردید."],
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.items).toHaveLength(2);

    let changed = false;
    await act(async () => {
      changed = await result.current.revalidateCart(true);
    });

    expect(changed).toBe(true);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("prod-2");
  });

  it("adjusts quantity when available stock is less than cart quantity", async () => {
    const product = createProduct({ id: "prod-1", name: "ترمه سبز", stockQuantity: 5 });

    localStorage.setItem(
      "terma-cart",
      JSON.stringify({
        version: 3,
        items: [
          { lineId: "prod-1:variant-6:Standard", productId: "prod-1", variantId: "variant-6", product, quantity: 4, packagingType: "Standard", packagingFee: 0 },
        ],
      })
    );

    vi.mocked(cartApi.validateCart).mockResolvedValue({
      hasChanges: true,
      items: [
        { productId: "prod-1", variantId: "variant-6", status: "QuantityAdjusted", availableQuantity: 2, currentPrice: 2000000, message: "محدودیت موجودی" },
      ],
      notifications: ["تعداد محصول «ترمه سبز» به دلیل محدودیت موجودی به ۲ عدد تغییر یافت."],
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.revalidateCart(true);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });
});
