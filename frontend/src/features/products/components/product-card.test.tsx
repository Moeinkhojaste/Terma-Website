import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "./product-card";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/products",
}));

const mockProduct: Product = {
  id: "prod-1",
  slug: "termeh-nila",
  name: "ترمه نیلا آبی ۴ نفره",
  price: "۱٬۲۰۰٬۰۰۰ تومان",
  priceValue: 1_200_000,
  compareAtPrice: "۱٬۵۰۰٬۰۰۰ تومان",
  compareAtPriceValue: 1_500_000,
  discountPercent: 20,
  hasDiscount: true,
  stockQuantity: 5,
  stock: "موجود",
  size: 4,
  capacity: "۴ نفره",
  dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
  sku: "TER-NIL-001",
  fabricType: "ترمه",
  lining: "ساتن",
  colors: "آبی",
  pattern: "شاه عباسی",
  image: "/images/nila-folded.webp",
  tableImage: "/images/nila-table.webp",
  imageAlt: "تصویر نیلا",
  tableImageAlt: "تصویر نیلا روی میز",
  description: "ترمه اصیل یزد با الیاف طبیعی",
  longDescription: "توضیحات کامل ترمه نیلا",
  detailedDescription: "توضیحات تفصیلی ترمه نیلا",
  categoryId: "cat-1",
  categoryName: "رومیزی",
  isActive: true,
  media: [
    { id: "m1", src: "/images/nila-folded.webp", alt: "تصویر نیلا", kind: "folded", sortOrder: 0, isPrimary: true },
  ],
  capacities: [
    {
      tableCapacity: 4,
      capacityLabel: "۴ نفره",
      length: 100,
      width: 100,
      dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
      price: "۱٬۲۰۰٬۰۰۰ تومان",
      priceValue: 1_200_000,
      stockQuantity: 5,
      isAvailable: true,
      sku: "TER-NIL-001",
    },
  ],
};

function renderProductCard(product: Product = mockProduct) {
  return render(
    <FeedbackProvider>
      <CartProvider>
        <WishlistProvider>
          <ProductCard product={product} />
        </WishlistProvider>
      </CartProvider>
    </FeedbackProvider>
  );
}

describe("ProductCard", () => {
  it("renders product name, price, discount badge and stock status", () => {
    renderProductCard();

    expect(screen.getByRole("heading", { level: 3, name: "ترمه نیلا آبی ۴ نفره" })).toBeInTheDocument();
    expect(screen.getAllByText("۱٬۲۰۰٬۰۰۰ تومان")[0]).toBeInTheDocument();
    expect(screen.getByText("۱٬۵۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.getByText("۲۰٪ تخفیف")).toBeInTheDocument();
    expect(screen.getAllByText("موجود")[0]).toBeInTheDocument();
  });

  it("opens quick view dialog when quick view button is clicked", () => {
    const { container } = renderProductCard();

    const quickViewBtn = container.querySelector(".product-card__quick-view")!;
    fireEvent.click(quickViewBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
