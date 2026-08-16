import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AccountWishlistClient } from "./account-wishlist-client";
import * as accountApi from "./account-api";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/account/wishlist",
}));

const mockWishlist: accountApi.WishlistItem[] = [
  {
    id: "wish-1",
    productId: "prod-1",
    productName: "ترمه شاه عباسی آبی",
    productSlug: "termeh-shah-abbasi",
    price: 1_800_000,
    compareAtPrice: 2_100_000,
    imageUrl: "/images/nila-folded.webp",
    inStock: true,
    categoryName: "رومیزی",
    createdAt: new Date().toISOString(),
  },
];

describe("AccountWishlistClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(accountApi, "getCustomerProfile").mockResolvedValue({
      userId: "u1",
      fullName: "مشتری",
      phone: "09121112233",
      email: null,
      orderCount: 0,
      wishlistCount: 1,
      addressCount: 0,
      createdAt: new Date().toISOString(),
    });
    vi.spyOn(accountApi, "getWishlist").mockResolvedValue(mockWishlist);
  });

  it("renders wishlist cards with price and stock status", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountWishlistClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ترمه شاه عباسی آبی")).toBeInTheDocument();
    });

    expect(screen.getByText("۱٬۸۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.getByText("موجود")).toBeInTheDocument();
  });
});
