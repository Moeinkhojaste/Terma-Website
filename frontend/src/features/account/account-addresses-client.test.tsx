import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AccountAddressesClient } from "./account-addresses-client";
import * as accountApi from "./account-api";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/account/addresses",
}));

const mockAddresses: accountApi.CustomerAddress[] = [
  {
    id: "addr-1",
    title: "منزل اصلی",
    receiverName: "رضا رضایی",
    receiverPhone: "09121112233",
    province: "تهران",
    city: "تهران",
    address: "خیابان ولیعصر، کوچه لاله، پلاک ۲",
    postalCode: "1994612345",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

describe("AccountAddressesClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(accountApi, "getCustomerProfile").mockResolvedValue({
      userId: "u1",
      fullName: "رضا رضایی",
      phone: "09121112233",
      email: "reza@example.com",
      orderCount: 1,
      wishlistCount: 0,
      addressCount: 1,
      createdAt: new Date().toISOString(),
    });
    vi.spyOn(accountApi, "getCustomerAddresses").mockResolvedValue(mockAddresses);
  });

  it("renders address cards with receiver info and default pill", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountAddressesClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("منزل اصلی")).toBeInTheDocument();
    });

    expect(screen.getAllByText("رضا رضایی")[0]).toBeInTheDocument();
    expect(screen.getByText("پیش‌فرض")).toBeInTheDocument();
  });

  it("opens add address modal when clicking add button", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountAddressesClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("منزل اصلی")).toBeInTheDocument();
    });

    const addBtns = screen.getAllByRole("button", { name: /افزودن آدرس جدید/ });
    fireEvent.click(addBtns[0]);

    expect(screen.getByPlaceholderText("مثلاً: منزل، محل کار")).toBeInTheDocument();
  });
});
