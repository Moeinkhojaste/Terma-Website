import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AccountOrdersClient } from "./account-orders-client";
import * as accountApi from "./account-api";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/account/orders",
}));

const mockOrders: accountApi.CustomerOrderSummary[] = [
  {
    id: "ord-1",
    number: "TRM-1001",
    status: "Shipped",
    total: 3_500_000,
    createdAt: new Date().toISOString(),
    itemCount: 2,
    postalTrackingCode: "109876543210987654321098",
  },
  {
    id: "ord-2",
    number: "TRM-1002",
    status: "Confirmed",
    total: 1_200_000,
    createdAt: new Date().toISOString(),
    itemCount: 1,
  },
];

describe("AccountOrdersClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(accountApi, "getCustomerProfile").mockResolvedValue({
      userId: "u1",
      fullName: "مشتری",
      phone: "09121112233",
      email: null,
      orderCount: 2,
      wishlistCount: 0,
      addressCount: 1,
      createdAt: new Date().toISOString(),
    });
    vi.spyOn(accountApi, "getCustomerOrders").mockResolvedValue({
      items: mockOrders,
      totalCount: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it("renders order list with tracking numbers and tabs", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountOrdersClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("TRM-1001")).toBeInTheDocument();
      expect(screen.getByText("TRM-1002")).toBeInTheDocument();
    });

    expect(screen.getByText("109876543210987654321098")).toBeInTheDocument();

    // Filter to shipped
    const shippedTab = screen.getByRole("button", { name: /ارسال شده/ });
    fireEvent.click(shippedTab);

    expect(screen.getByText("TRM-1001")).toBeInTheDocument();
    expect(screen.queryByText("TRM-1002")).not.toBeInTheDocument();
  });
});
