import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AccountDashboardClient } from "./account-dashboard-client";
import * as accountApi from "./account-api";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/account",
}));

const mockDashboardData: accountApi.CustomerDashboard = {
  profile: {
    userId: "user-1",
    fullName: "سارا محمدی",
    phone: "09121234567",
    email: "sara@example.com",
    orderCount: 3,
    wishlistCount: 2,
    addressCount: 1,
    createdAt: new Date().toISOString(),
  },
  recentOrders: [
    {
      id: "ord-1",
      number: "TRM-2026-001",
      status: "Confirmed",
      total: 1_200_000,
      createdAt: new Date().toISOString(),
      itemCount: 2,
      postalTrackingCode: "1234567890",
    },
  ],
  defaultAddress: {
    id: "addr-1",
    title: "منزل",
    receiverName: "سارا محمدی",
    receiverPhone: "09121234567",
    province: "تهران",
    city: "تهران",
    address: "خیابان آزادی، کوچه مریم، پلاک ۱۰",
    postalCode: "1458812345",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  totalOrders: 3,
  pendingOrders: 1,
  wishlistCount: 2,
  addressCount: 1,
};

describe("AccountDashboardClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(accountApi, "getCustomerProfile").mockResolvedValue(mockDashboardData.profile);
    vi.spyOn(accountApi, "getCustomerDashboard").mockResolvedValue(mockDashboardData);
  });

  it("renders user greeting, statistics, and recent orders", async () => {
    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountDashboardClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/سلام، سارا محمدی عزیز/)).toBeInTheDocument();
    });

    expect(screen.getByText("TRM-2026-001")).toBeInTheDocument();
    expect(screen.getByText(/خیابان آزادی، کوچه مریم، پلاک ۱۰/)).toBeInTheDocument();
  });
});
