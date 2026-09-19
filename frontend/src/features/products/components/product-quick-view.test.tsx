import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductQuickView } from "./product-quick-view";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/products",
}));

const mockProductWithVariants: Product = {
  id: "prod-1",
  slug: "termeh-nila",
  name: "ترمه نیلا آبی",
  price: "۱٬۲۰۰٬۰۰۰ تومان",
  priceValue: 1_200_000,
  hasDiscount: false,
  stockQuantity: 10,
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
  categoryId: "cat-1",
  categoryName: "رومیزی",
  isActive: true,
  media: [
    { id: "m1", src: "/images/nila-folded.webp", alt: "تصویر نیلا", kind: "folded", sortOrder: 0, isPrimary: true },
  ],
  capacities: [
    {
      id: "var-4p",
      tableCapacity: 4,
      capacityLabel: "۴ نفره",
      length: 100,
      width: 100,
      dimensions: "۱۰۰ × ۱۰۰ سانتی‌متر",
      price: "۱٬۲۰۰٬۰۰۰ تومان",
      priceValue: 1_200_000,
      stockQuantity: 5,
      isAvailable: true,
      sku: "TER-NIL-4P",
    },
    {
      id: "var-6p",
      tableCapacity: 6,
      capacityLabel: "۶ نفره",
      length: 160,
      width: 110,
      dimensions: "۱۶۰ × ۱۱۰ سانتی‌متر",
      price: "۱٬۸۰۰٬۰۰۰ تومان",
      priceValue: 1_800_000,
      stockQuantity: 3,
      isAvailable: true,
      sku: "TER-NIL-6P",
    },
    {
      tableCapacity: 8,
      capacityLabel: "۸ نفره",
      length: 240,
      width: 110,
      dimensions: "۲۴۰ × ۱۱۰ سانتی‌متر",
      price: "۱٬۲۰۰٬۰۰۰ تومان",
      priceValue: 1_200_000,
      stockQuantity: 0,
      isAvailable: false,
      sku: "TER-NIL-8P",
    },
  ],
};

describe("ProductQuickView", () => {
  it("renders capacity options and allows changing variant before adding to cart", () => {
    const handleClose = vi.fn();

    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductQuickView
              product={mockProductWithVariants}
              open={true}
              onClose={handleClose}
            />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("ترمه نیلا آبی")).toBeInTheDocument();

    // Check 6-person capacity button and click it
    const sixPersonBtn = screen.getByText("۶ نفره").closest("button")!;
    expect(sixPersonBtn).toBeInTheDocument();
    fireEvent.click(sixPersonBtn);

    // 8-person is unavailable and disabled
    const eightPersonBtn = screen.getByText("۸ نفره").closest("button")!;
    expect(eightPersonBtn).toBeDisabled();

    // Add to cart button is clickable
    const addToCartBtn = screen.getByRole("button", { name: "افزودن به سبد خرید" });
    fireEvent.click(addToCartBtn);
  });
});
