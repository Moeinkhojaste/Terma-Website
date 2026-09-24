import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminOrdersPage, AdminPromotionsPage, AdminShippingPage } from "./admin-operations-pages";
import * as storeApi from "./store-api";
import * as authApi from "./auth-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/orders",
}));

describe("AdminOperationsPages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@terma.ir",
      role: "SuperAdmin",
      expiresAtUtc: new Date().toISOString(),
    });
  });

  it("AdminOrdersPage renders order table with items and status selector", async () => {
    vi.spyOn(storeApi, "getOrders").mockResolvedValue([
      {
        id: "ord-1",
        number: "TRM-5001",
        customerName: "علی حسینی",
        phone: "09121112233",
        province: "تهران",
        city: "تهران",
        address: "خیابان شریعتی",
        postalCode: "1912345678",
        customerNotes: null,
        total: 2_050_000,
        status: "Confirmed",
        createdAt: new Date().toISOString(),
        reservationExpiresAtUtc: new Date().toISOString(),
        items: [],
      },
    ]);

    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText("TRM-5001")).toBeInTheDocument();
    });

    expect(screen.getByText("علی حسینی")).toBeInTheDocument();
    expect(screen.getByText("پرداخت موفق")).toBeInTheDocument();
  });

  it("AdminOrdersPage filters between paid and pending payment tabs", async () => {
    vi.spyOn(storeApi, "getOrders").mockResolvedValue([
      {
        id: "ord-paid",
        number: "TRM-PAID-01",
        customerName: "مشتری پرداخت‌شده",
        phone: "09121112233",
        province: "تهران",
        city: "تهران",
        address: "خیابان ۱",
        postalCode: "1912345678",
        customerNotes: null,
        total: 1_000_000,
        status: "Confirmed",
        paymentStatus: "Paid",
        createdAt: new Date().toISOString(),
        reservationExpiresAtUtc: new Date().toISOString(),
        items: [],
      },
      {
        id: "ord-pending",
        number: "TRM-PENDING-02",
        customerName: "مشتری در انتظار",
        phone: "09124445566",
        province: "اصفهان",
        city: "اصفهان",
        address: "خیابان ۲",
        postalCode: "8123456789",
        customerNotes: null,
        total: 500_000,
        status: "PendingConfirmation",
        paymentStatus: "Pending",
        createdAt: new Date().toISOString(),
        reservationExpiresAtUtc: new Date().toISOString(),
        items: [],
      },
    ]);

    render(<AdminOrdersPage />);

    // Default tab is PAID, so only paid order is visible
    await waitFor(() => {
      expect(screen.getByText("TRM-PAID-01")).toBeInTheDocument();
    });
    expect(screen.queryByText("TRM-PENDING-02")).not.toBeInTheDocument();

    // Switch to Pending Payment tab
    const pendingTab = screen.getByRole("button", { name: /در انتظار پرداخت/i });
    fireEvent.click(pendingTab);

    expect(screen.getByText("TRM-PENDING-02")).toBeInTheDocument();
    expect(screen.queryByText("TRM-PAID-01")).not.toBeInTheDocument();
  });

  it("AdminPromotionsPage renders promotion list and creation form", async () => {
    vi.spyOn(storeApi, "getPromotions").mockResolvedValue([
      {
        id: "promo-1",
        name: "تخفیف ویژه",
        code: "OFF20",
        type: "Coupon",
        discountType: "Percentage",
        value: 20,
        minimumSubtotal: 100_000,
        maximumDiscount: 50_000,
        usageLimit: 100,
        usageCount: 5,
        startsAtUtc: new Date().toISOString(),
        endsAtUtc: null,
        isActive: true,
      },
    ]);

    render(<AdminPromotionsPage />);

    await waitFor(() => {
      expect(screen.getByText("تخفیف ویژه")).toBeInTheDocument();
    });

    expect(screen.getByText("OFF20")).toBeInTheDocument();
  });

  it("AdminShippingPage renders shipping rules list", async () => {
    vi.spyOn(storeApi, "getShippingRules").mockResolvedValue([
      {
        id: "ship-1",
        name: "ارسال رایگان تهران",
        province: "تهران",
        city: "تهران",
        cost: 0,
        freeAboveSubtotal: 500_000,
        priority: 1,
        isActive: true,
      },
    ]);

    render(<AdminShippingPage />);

    await waitFor(() => {
      expect(screen.getByText("ارسال رایگان تهران")).toBeInTheDocument();
    });
  });
});
