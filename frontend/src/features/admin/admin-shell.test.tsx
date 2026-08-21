import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminShell } from "./admin-shell";
import * as authApi from "./auth-api";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => "/admin/products",
}));

describe("AdminShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@terma.ir",
      role: "SuperAdmin",
      expiresAtUtc: new Date().toISOString(),
    });
  });

  it("renders admin navigation links, current title and session email", async () => {
    render(
      <AdminShell title="مدیریت کاتالوگ">
        <div>محتوای تست پنل</div>
      </AdminShell>
    );

    await waitFor(() => {
      expect(screen.getByText("مدیریت کاتالوگ")).toBeInTheDocument();
    });

    expect(screen.getByText("admin@terma.ir")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "محصولات" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "سفارش‌ها" })).toBeInTheDocument();
    expect(screen.getByText("محتوای تست پنل")).toBeInTheDocument();
  });

  it("handles admin logout action", async () => {
    const logoutSpy = vi.spyOn(authApi, "logoutAdmin").mockResolvedValue();

    render(
      <AdminShell title="داشبورد">
        <div>محتوا</div>
      </AdminShell>
    );

    await waitFor(() => {
      expect(screen.getByText("admin@terma.ir")).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole("button", { name: "خروج" });
    fireEvent.click(logoutBtn);

    expect(logoutSpy).toHaveBeenCalled();
  });
});
