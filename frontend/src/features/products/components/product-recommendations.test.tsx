import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductRecommendations } from "./product-recommendations";
import { RecentlyViewedProducts } from "./recently-viewed-products";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import * as productApi from "@/features/products/product-api";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/products/p-1",
}));

function createMockProduct(id: string, name: string): Product {
  return {
    id,
    slug: id,
    name,
    price: "۱٬۰۰۰٬۰۰۰ تومان",
    priceValue: 1_000_000,
    discountPercent: 0,
    hasDiscount: false,
    stockQuantity: 5,
    stock: "موجود",
    size: 4,
    capacity: "۴ نفره",
    dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
    sku: `SKU-${id}`,
    fabricType: "ترمه",
    lining: "ساتن",
    colors: "آبی",
    pattern: "سنتی",
    image: "/images/sample.webp",
    tableImage: "/images/sample.webp",
    imageAlt: name,
    tableImageAlt: name,
    description: `توضیح کوتاه ${name}`,
    longDescription: `توضیح کامل ${name}`,
    categoryId: "cat-1",
    categoryName: "سفره",
    isActive: true,
    media: [{ id: `m-${id}`, src: "/images/sample.webp", alt: name, kind: "folded", sortOrder: 0, isPrimary: true }],
    capacities: [],
  };
}

describe("ProductRecommendations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders at most 4 products even if API returns more", async () => {
    const mockProducts = [
      createMockProduct("rec-1", "محصول ۱"),
      createMockProduct("rec-2", "محصول ۲"),
      createMockProduct("rec-3", "محصول ۳"),
      createMockProduct("rec-4", "محصول ۴"),
      createMockProduct("rec-5", "محصول ۵"),
    ];

    vi.spyOn(productApi, "getRecommendations").mockResolvedValue(mockProducts);

    const { container } = render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductRecommendations productId="prod-main" />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { name: "محصولات مشابه" })).toBeInTheDocument();

    const cards = container.querySelectorAll(".product-card");
    expect(cards).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 3, name: "محصول ۱" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "محصول ۴" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "محصول ۵" })).not.toBeInTheDocument();
  });
});

describe("RecentlyViewedProducts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders at most 4 products in 1 row", async () => {
    const mockProducts = [
      createMockProduct("view-1", "محصول دیده‌شده ۱"),
      createMockProduct("view-2", "محصول دیده‌شده ۲"),
      createMockProduct("view-3", "محصول دیده‌شده ۳"),
      createMockProduct("view-4", "محصول دیده‌شده ۴"),
      createMockProduct("view-5", "محصول دیده‌شده ۵"),
    ];

    vi.spyOn(productApi, "listProducts").mockResolvedValue({
      items: mockProducts,
      page: 1,
      pageSize: 8,
      totalCount: 5,
      totalPages: 1,
    });

    const { container } = render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProducts currentProductId="other-id" />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { name: "پیشنهاد برای ادامه خرید" })).toBeInTheDocument();

    const cards = container.querySelectorAll(".product-card");
    expect(cards).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 3, name: "محصول دیده‌شده ۱" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "محصول دیده‌شده ۴" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "محصول دیده‌شده ۵" })).not.toBeInTheDocument();
  });
});
