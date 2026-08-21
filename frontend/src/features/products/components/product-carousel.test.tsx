import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCarousel } from "./product-carousel";
import { WishlistProvider } from "@/features/account/wishlist-context";
import { CartProvider } from "@/features/cart/cart-provider";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { createProduct } from "@/test/product-fixture";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

const mockProducts: Product[] = [
  createProduct({
    id: "p-1",
    name: "سفره ترمه نیلا",
    slug: "termeh-nila",
    description: "نیلا ترکیبی از زمینه آبی فیروزه‌ای و نقوش سنتی بته‌جقه است.",
    price: "۱,۵۰۰,۰۰۰ تومان",
    capacities: [
      {
        tableCapacity: 6,
        capacityLabel: "۶ نفره",
        length: 100,
        width: 100,
        dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
        price: "۱,۵۰۰,۰۰۰ تومان",
        priceValue: 1500000,
        stockQuantity: 10,
        isAvailable: true,
        sku: "TER-NIL-001",
      },
    ],
  }),
  createProduct({
    id: "p-2",
    name: "سفره ترمه لاجورد",
    slug: "termeh-lajvard",
    description: "لاجورد با زمینه آبی متمایل به سرمه‌ای و نقوش بته‌جقه در طیف سفید.",
    price: "۲,۰۰۰,۰۰۰ تومان",
    capacities: [
      {
        tableCapacity: 8,
        capacityLabel: "۸ نفره",
        length: 120,
        width: 120,
        dimensions: "۱۲۰ × ۱۲۰ سانتی‌متر",
        price: "۲,۰۰۰,۰۰۰ تومان",
        priceValue: 2000000,
        stockQuantity: 5,
        isAvailable: true,
        sku: "TER-LAJ-001",
      },
    ],
  }),
  createProduct({
    id: "p-3",
    name: "سفره ترمه فیروزه",
    slug: "termeh-firoozeh",
    description: "فیروزه با زمینه آبی و نقوش متراکم بته‌جقه در طیف کرم.",
    price: "۱,۶۵۰,۰۰۰ تومان",
    hasDiscount: true,
    discountPercent: 13,
    compareAtPrice: "۱,۹۰۰,۰۰۰ تومان",
    capacities: [
      {
        tableCapacity: 4,
        capacityLabel: "۴ نفره",
        length: 80,
        width: 80,
        dimensions: "۸۰ × ۸۰ سانتی‌متر",
        price: "۱,۶۵۰,۰۰۰ تومان",
        priceValue: 1650000,
        stockQuantity: 8,
        isAvailable: true,
        sku: "TER-FIR-001",
      },
    ],
  }),
  createProduct({
    id: "p-4",
    name: "سفره ترمه یاقوت",
    slug: "termeh-yaghoot",
    description: "یاقوت با زمینه قرمز لاکی و ترنج اصیل یزدی.",
    price: "۲,۴۰۰,۰۰۰ تومان",
    capacities: [
      {
        tableCapacity: 8,
        capacityLabel: "۸ نفره",
        length: 140,
        width: 140,
        dimensions: "۱۴۰ × ۱۴۰ سانتی‌متر",
        price: "۲,۴۰۰,۰۰۰ تومان",
        priceValue: 2400000,
        stockQuantity: 4,
        isAvailable: true,
        sku: "TER-YAG-001",
      },
    ],
  }),
];

function renderCarousel(products: Product[] = mockProducts) {
  return render(
    <FeedbackProvider>
      <CartProvider>
        <WishlistProvider>
          <ProductCarousel products={products} />
        </WishlistProvider>
      </CartProvider>
    </FeedbackProvider>
  );
}

describe("ProductCarousel", () => {
  it("renders nothing when product list is empty", () => {
    renderCarousel([]);
    expect(screen.queryByRole("region", { name: "محصولات منتخب" })).toBeNull();
  });

  it("renders all products and carousel controls", () => {
    renderCarousel();

    expect(screen.getByRole("heading", { level: 3, name: "سفره ترمه نیلا" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "سفره ترمه لاجورد" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "سفره ترمه فیروزه" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "سفره ترمه یاقوت" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "محصول بعدی" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "محصول قبلی" })).toBeInTheDocument();
  });

  it("navigates forward when clicking the next button", () => {
    renderCarousel();

    const nextButton = screen.getByRole("button", { name: "محصول بعدی" });
    const dots = screen.getAllByRole("tab");
    expect(dots[0]).toHaveClass("carousel-dot--active");

    fireEvent.click(nextButton);
    expect(dots[1]).toHaveClass("carousel-dot--active");
  });

  it("navigates backward when clicking the previous button", () => {
    renderCarousel();

    const prevButton = screen.getByRole("button", { name: "محصول قبلی" });
    const dots = screen.getAllByRole("tab");

    // From index 0, clicking previous wraps to last step
    fireEvent.click(prevButton);
    expect(dots[dots.length - 1]).toHaveClass("carousel-dot--active");
  });

  it("switches slides when clicking dot indicators", () => {
    renderCarousel();

    const dots = screen.getAllByRole("tab");
    fireEvent.click(dots[1]);
    expect(dots[1]).toHaveClass("carousel-dot--active");
  });

  it("supports keyboard arrow navigation in RTL", () => {
    renderCarousel();

    const region = screen.getByRole("region", { name: "محصولات منتخب" });
    const dots = screen.getAllByRole("tab");

    // ArrowLeft moves next in RTL
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(dots[1]).toHaveClass("carousel-dot--active");

    // ArrowRight moves previous
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(dots[0]).toHaveClass("carousel-dot--active");
  });
});
