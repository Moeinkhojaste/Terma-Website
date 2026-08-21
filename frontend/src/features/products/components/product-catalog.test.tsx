import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCatalog } from "./product-catalog";
import * as productApi from "@/features/products/product-api";
import { mapProduct } from "@/features/products/product-mapper";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import type { ProductDto } from "@/features/products/models";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams(""),
}));

const mockProductsDto: ProductDto[] = [
  {
    id: "p1",
    slug: "nila-blue",
    name: "ترمه نیلا آبی",
    sku: "TER-NIL",
    description: "توضیحات ترمه",
    price: 1_200_000,
    stockQuantity: 5,
    tableCapacity: 4,
    length: 100,
    width: 100,
    fabricType: "ترمه",
    liningType: "ساتن",
    color: "آبی",
    pattern: "شاه عباسی",
    categoryId: "c1",
    categoryName: "رومیزی",
    isActive: true,
  },
];

describe("ProductCatalog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(productApi, "listCategories").mockResolvedValue([
      { id: "c1", name: "رومیزی", slug: "tablecloth", description: null, isActive: true, createdAt: "", updatedAt: "" },
    ]);
    vi.spyOn(productApi, "getProductFacets").mockResolvedValue({
      colors: ["آبی", "قرمز"],
      tableCapacities: [4, 6, 8],
      minimumPrice: 500_000,
      maximumPrice: 3_000_000,
    });
    vi.spyOn(productApi, "listProducts").mockResolvedValue({
      items: [mapProduct(mockProductsDto[0])],
      totalCount: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });
  });

  it("renders product cards and filter form on desktop", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCatalog />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { level: 3, name: "ترمه نیلا آبی" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "فیلتر محصولات" })).toBeInTheDocument();
  });

  it("applies filters and submits search query", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCatalog />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { level: 3, name: "ترمه نیلا آبی" })).toBeInTheDocument();

    const searchInputs = screen.getAllByPlaceholderText("مثلاً ترمه آبی");
    fireEvent.change(searchInputs[0], { target: { value: "نیلا" } });

    const submitButtons = screen.getAllByRole("button", { name: "اعمال فیلترها" });
    fireEvent.click(submitButtons[0]);

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("search="), expect.anything());
  });

  it("updates sort option and triggers navigation", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCatalog />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    expect(await screen.findByRole("heading", { level: 3, name: "ترمه نیلا آبی" })).toBeInTheDocument();

    const sortSelect = screen.getByRole("combobox", { name: "مرتب‌سازی محصولات" });
    fireEvent.change(sortSelect, { target: { value: "price-asc" } });

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("sort=price-asc"), expect.anything());
  });
});
