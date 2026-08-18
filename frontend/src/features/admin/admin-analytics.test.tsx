import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminDashboardPage } from "./admin-dashboard-page";
import { AdminReportsPage } from "./admin-reports-page";
import * as storeApi from "./store-api";
import * as authApi from "./auth-api";
import type { AdminAnalytics, Dashboard, AbandonedCartsReport } from "./store-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin",
}));

const mockDashboard: Dashboard = {
  productCount: 15,
  categoryCount: 4,
  lowStockCount: 2,
  pendingOrderCount: 3,
  unreadMessageCount: 1,
  customerCount: 45,
  orderValue: 12_500_000,
};

const mockAnalytics: AdminAnalytics = {
  sales: {
    sales30Days: 4_500_000,
    sales1Year: 45_000_000,
    allTimeValidSales: 52_000_000,
    orders30Days: 12,
    orders1Year: 140,
    ordersTotal: 160,
    itemsSold30Days: 28,
    itemsSold1Year: 320,
    itemsSoldTotal: 380,
    averageItemsPerOrder30Days: 2.33,
    averageItemsPerOrder1Year: 2.29,
    averageOrderValue30Days: 375_000,
    averageOrderValue1Year: 321_428,
  },
  registrations: {
    totalRegisteredCustomers: 85,
    newRegistrations30Days: 18,
    newRegistrations1Year: 75,
    guestCustomers: 30,
  },
  abandonedCarts: {
    abandonedCount30Days: 6,
    abandonedCount1Year: 42,
    abandonedValue30Days: 2_100_000,
    abandonedValue1Year: 15_800_000,
    abandonmentRate30Days: 33.3,
    expiredCheckouts30Days: 2,
    expiredCheckoutsValue30Days: 850_000,
  },
  dailyTrend30Days: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    persianDate: `1405/05/${String(i + 1).padStart(2, "0")}`,
    sales: 150_000 * (i % 5 + 1),
    orderCount: (i % 3) + 1,
    itemsSold: (i % 4) + 2,
  })),
  monthlyTrend1Year: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, "0")}`,
    persianMonth: `ماه ${i + 1} 1405`,
    sales: 3_500_000,
    orderCount: 12,
    itemsSold: 26,
  })),
  orderStatusBreakdown: [
    { status: "Completed", persianStatus: "تکمیل شده", count: 8, totalValue: 3_200_000 },
    { status: "Processing", persianStatus: "در حال پردازش", count: 2, totalValue: 800_000 },
    { status: "PendingPayment", persianStatus: "در انتظار پرداخت", count: 2, totalValue: 500_000 },
  ],
  topSellingProducts30Days: [
    {
      productId: "p-1",
      productName: "ترمه ابریشم سالاری",
      productSlug: "termeh-salari",
      sku: "TRM-SAL-01",
      categoryName: "رومیزی",
      imageUrl: null,
      unitsSold: 14,
      totalRevenue: 2_800_000,
      averagePrice: 200_000,
    },
  ],
  topViewedProducts30Days: [
    {
      productId: "p-1",
      productName: "ترمه ابریشم سالاری",
      productSlug: "termeh-salari",
      sku: "TRM-SAL-01",
      categoryName: "رومیزی",
      imageUrl: null,
      viewCount: 120,
      orderCount: 5,
      unitsSold: 14,
      conversionRate: 11.7,
    },
  ],
  loyalCustomers: [
    {
      customerId: "c-1",
      userId: "u-1",
      fullName: "رضا محمدی",
      phone: "09123456789",
      email: "reza@example.com",
      orderCount: 6,
      totalOrderValue: 22_000_000,
      averageOrderValue: 3_666_666,
      lastOrderAtUtc: new Date().toISOString(),
      loyaltyTier: "VIP",
    },
  ],
};

const mockAbandonedReport: AbandonedCartsReport = {
  totalAbandonedCount: 6,
  totalAbandonedValue: 2_100_000,
  abandonmentRate: 33.3,
  items: [
    {
      id: "cart-1",
      sessionKeyOrOrderNumber: "cs_abcdef_123",
      customerName: "سارا احمدی",
      phone: "09128887766",
      email: null,
      itemCount: 2,
      totalValue: 650_000,
      lastActivityAtUtc: new Date().toISOString(),
      isExpiredCheckout: false,
      items: [
        {
          productName: "رومیزی ترمه حسینی",
          variantName: null,
          sku: "TRM-HOS-01",
          unitPrice: 325_000,
          quantity: 2,
        },
      ],
    },
  ],
};

describe("Admin Analytics & Reports", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@terma.ir",
      role: "SuperAdmin",
      expiresAtUtc: new Date().toISOString(),
    });
  });

  it("AdminDashboardPage renders KPI cards, trend chart, top products, and loyal customers", async () => {
    vi.spyOn(storeApi, "getDashboard").mockResolvedValue(mockDashboard);
    vi.spyOn(storeApi, "getAdminAnalytics").mockResolvedValue(mockAnalytics);

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("داشبورد و مرکز آمار فروشگاه")).toBeInTheDocument();
    });

    // Check KPI titles
    expect(screen.getByText("میزان فروش ریالی")).toBeInTheDocument();
    expect(screen.getByText("تعداد کل سفارش‌ها")).toBeInTheDocument();
    expect(screen.getByText("تعداد محصول فروخته شده")).toBeInTheDocument();
    expect(screen.getByText("میانگین کالا در هر سفارش")).toBeInTheDocument();
    expect(screen.getByText("تعداد ثبت‌نام کاربران")).toBeInTheDocument();
    expect(screen.getByText("سبدهای خرید رها شده")).toBeInTheDocument();

    // Check top product & loyal customer
    expect(screen.getByText("ترمه ابریشم سالاری")).toBeInTheDocument();
    expect(screen.getByText("رضا محمدی")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("AdminReportsPage allows navigating across tabs and displays reports", async () => {
    vi.spyOn(storeApi, "getAdminAnalytics").mockResolvedValue(mockAnalytics);
    vi.spyOn(storeApi, "getAbandonedCarts").mockResolvedValue(mockAbandonedReport);

    render(<AdminReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("مرکز تحلیل و گزارش‌های فروشگاه")).toBeInTheDocument();
    });

    // Default Overview Tab
    expect(screen.getByText("فروش ۳۰ روز گذشته")).toBeInTheDocument();

    // Switch to Abandoned Carts tab
    const abandonedTab = screen.getByRole("tab", { name: /سبدهای رها شده/ });
    fireEvent.click(abandonedTab);

    expect(screen.getByText("تحلیل سبدهای رها شده و انقضای پرداخت")).toBeInTheDocument();
    expect(screen.getByText("سارا احمدی")).toBeInTheDocument();
    expect(screen.getByText("cs_abcdef_123")).toBeInTheDocument();

    // Switch to Loyal Customers tab
    const loyalTab = screen.getByRole("tab", { name: /مشتریان وفادار/ });
    fireEvent.click(loyalTab);

    expect(screen.getByText("مشتریان وفادار و برتر")).toBeInTheDocument();
    expect(screen.getByText("رضا محمدی")).toBeInTheDocument();
  });
});
