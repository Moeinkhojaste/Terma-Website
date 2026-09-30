import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminSettingsPage } from "./admin-settings-page";
import * as authApi from "./auth-api";
import * as apiClient from "@/lib/api-client";

const mockRouter = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/admin/settings",
}));

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@terma.ir",
      role: "Admin",
      expiresAtUtc: new Date().toISOString(),
    });
  });

  it("renders shipping settings and allows updating Pishtaz fee and Tipax status", async () => {
    const apiRequestSpy = vi.spyOn(apiClient, "apiRequest").mockImplementation(async (path, init) => {
      if (path === "/api/admin/settings" && (!init || init.method === undefined)) {
        return {
          reservationHours: 24,
          lowStockDefaultThreshold: 5,
          currency: "IRR",
          giftPackagingPrice: 200000,
          isGiftPackagingEnabled: true,
          pishtazShippingPrice: 140000,
          isPishtazShippingEnabled: true,
          isTipaxShippingEnabled: true,
        };
      }
      if (path === "/api/admin/settings/shipping" && init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        return {
          reservationHours: 24,
          lowStockDefaultThreshold: 5,
          currency: "IRR",
          giftPackagingPrice: 200000,
          isGiftPackagingEnabled: true,
          pishtazShippingPrice: body.pishtazPrice,
          isPishtazShippingEnabled: body.isPishtazEnabled,
          isTipaxShippingEnabled: body.isTipaxEnabled,
        };
      }
      throw new Error(`Unexpected path ${path}`);
    });

    render(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/۱۴۰٬۰۰۰ تومان/)).toBeInTheDocument();
    });

    const priceInput = screen.getByLabelText("هزینه ارسال با پست پیشتاز (تومان)");
    const pishtazCheck = screen.getByLabelText("فعال‌بودن ارسال با پست پیشتاز");
    const tipaxCheck = screen.getByLabelText("فعال‌بودن ارسال با تیپاکس (پس‌کرایه)");

    expect(priceInput).toHaveValue(140000);
    expect(pishtazCheck).toBeChecked();
    expect(tipaxCheck).toBeChecked();

    // Update price to 160000
    fireEvent.change(priceInput, { target: { value: "160000" } });
    expect(priceInput).toHaveValue(160000);

    // Click submit
    const submitBtn = screen.getByRole("button", { name: "ذخیره تنظیمات ارسال" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("تنظیمات روش‌های ارسال با موفقیت ذخیره شد.")).toBeInTheDocument();
    });

    expect(apiRequestSpy).toHaveBeenCalledWith("/api/admin/settings/shipping", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({
        pishtazPrice: 160000,
        isPishtazEnabled: true,
        isTipaxEnabled: true,
      }),
    }));

    // Check operational details
    await waitFor(() => {
      expect(screen.getByText(/۱۶۰٬۰۰۰/)).toBeInTheDocument();
    });
  });
});
