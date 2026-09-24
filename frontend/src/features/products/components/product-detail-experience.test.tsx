import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductDetailExperience } from "./product-detail-experience";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/products/termeh-nila",
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock recommendations and reviews to keep test light
vi.mock("@/features/products/components/product-recommendations", () => ({
  ProductRecommendations: () => <div data-testid="product-recommendations" />,
}));
vi.mock("@/features/reviews/components/product-reviews-section", () => ({
  ProductReviewsSection: () => <div data-testid="product-reviews" />,
}));

const mockAvailableProduct: Product = {
  id: "prod-1",
  slug: "termeh-nila",
  name: "سفره سنتی آبی 002",
  price: "۱٬۴۸۰٬۰۰۰ تومان",
  priceValue: 1_480_000,
  compareAtPrice: "۱٬۸۰۰٬۰۰۰ تومان",
  compareAtPriceValue: 1_800_000,
  discountPercent: 18,
  hasDiscount: true,
  stockQuantity: 5,
  stock: "موجود",
  size: 4,
  capacity: "۴ نفره",
  dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
  sku: "TER-BLU-002",
  fabricType: "ترمه",
  lining: "ساتن",
  colors: "آبی",
  pattern: "سنتی",
  image: "/images/nila-folded.webp",
  tableImage: "/images/nila-table.webp",
  imageAlt: "تصویر سفره",
  tableImageAlt: "تصویر سفره روی میز",
  description: "سفره سنتی با طرح ترمه و رنگ آبی",
  longDescription: "سفره سنتی با طرح ترمه و رنگ آبی",
  categoryId: "cat-1",
  categoryName: "سفره ترمه",
  isActive: true,
  media: [
    { id: "m1", src: "/images/nila-folded.webp", alt: "تصویر سفره", kind: "folded", sortOrder: 0, isPrimary: true },
  ],
  capacities: [
    {
      tableCapacity: 4,
      capacityLabel: "۴ نفره",
      length: 100,
      width: 100,
      dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
      price: "۱٬۴۸۰٬۰۰۰ تومان",
      priceValue: 1_480_000,
      compareAtPrice: "۱٬۸۰۰٬۰۰۰ تومان",
      compareAtPriceValue: 1_800_000,
      discountPercent: 18,
      hasDiscount: true,
      stockQuantity: 5,
      isAvailable: true,
      sku: "TER-BLU-002-4P",
    },
  ],
};

const mockOutOfStockProduct: Product = {
  ...mockAvailableProduct,
  stockQuantity: 0,
  stock: "ناموجود",
  hasDiscount: true,
  discountPercent: 18,
  capacities: [
    {
      tableCapacity: 4,
      capacityLabel: "۴ نفره",
      length: 100,
      width: 100,
      dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
      price: "۱٬۴۸۰٬۰۰۰ تومان",
      priceValue: 1_480_000,
      stockQuantity: 0,
      isAvailable: false,
      sku: "TER-BLU-002-4P",
    },
    {
      tableCapacity: 6,
      capacityLabel: "۶ نفره",
      length: 160,
      width: 110,
      dimensions: "۱۶۰ × ۱۱۰ سانتی‌متر",
      price: "۱٬۹۸۰٬۰۰۰ تومان",
      priceValue: 1_980_000,
      stockQuantity: 0,
      isAvailable: false,
      sku: "TER-BLU-002-6P",
    },
  ],
};

function renderExperience(product: Product) {
  return render(
    <FeedbackProvider>
      <CartProvider>
        <WishlistProvider>
          <ProductDetailExperience product={product} />
        </WishlistProvider>
      </CartProvider>
    </FeedbackProvider>
  );
}

describe("ProductDetailExperience out of stock handling", () => {
  it("renders active price, packaging selector and discount badge when product is available", () => {
    renderExperience(mockAvailableProduct);

    expect(screen.getByText("سفره سنتی آبی 002")).toBeInTheDocument();
    expect(screen.getAllByText("۱٬۴۸۰٬۰۰۰ تومان")[0]).toBeInTheDocument();
    expect(screen.getAllByText("۱۸٪ تخفیف")[0]).toBeInTheDocument();
    expect(screen.getByText("نوع بسته‌بندی")).toBeInTheDocument();
  });

  it("hides price, discount badge and packaging selector, and displays out of stock notice when product is unavailable", () => {
    renderExperience(mockOutOfStockProduct);

    expect(screen.getByText("سفره سنتی آبی 002")).toBeInTheDocument();

    // The misleading price should NOT be rendered
    expect(screen.queryByText("۱٬۴۸۰٬۰۰۰ تومان")).not.toBeInTheDocument();
    // Discount badge should NOT be rendered
    expect(screen.queryByText("۱۸٪ تخفیف")).not.toBeInTheDocument();
    // Packaging selector should NOT be rendered
    expect(screen.queryByText("نوع بسته‌بندی")).not.toBeInTheDocument();

    // Out of stock alert should be clearly visible
    expect(screen.getByText("این کالا در حال حاضر موجود نیست")).toBeInTheDocument();
    expect(
      screen.getByText(/در حال حاضر امکان خرید این محصول وجود ندارد/i)
    ).toBeInTheDocument();
  });
});
