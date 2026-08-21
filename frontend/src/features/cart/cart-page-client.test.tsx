import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartPageClient } from "./cart-page-client";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import { createProduct } from "@/test/product-fixture";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/cart",
}));

describe("CartPageClient", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty cart state when no items exist", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <CartPageClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { name: "سبد خرید شما خالی است" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "مشاهده محصولات" })).toBeInTheDocument();
  });

  it("renders item details, price and quantity stepper when cart has items", async () => {
    const product = createProduct({
      id: "prod-1",
      name: "سفره ترمه آبی",
      price: "۲٬۰۰۰٬۰۰۰ تومان",
      priceValue: 2_000_000,
      stockQuantity: 5,
    });

    localStorage.setItem(
      "terma-cart",
      JSON.stringify({
        version: 3,
        items: [
          {
            lineId: "prod-1:variant-6",
            productId: "prod-1",
            variantId: "variant-6",
            product,
            quantity: 1,
          },
        ],
      })
    );

    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <CartPageClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { level: 2, name: "سفره ترمه آبی" })).toBeInTheDocument();
    expect(screen.getAllByText("۲٬۰۰۰٬۰۰۰ تومان")[0]).toBeInTheDocument();

    // Increase quantity
    const increaseBtn = screen.getByRole("button", { name: "افزایش تعداد" });
    fireEvent.click(increaseBtn);

    expect(screen.getAllByText("۲")[0]).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ادامه و تکمیل سفارش" })).toBeInTheDocument();
  });
});
