import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminProductsPage } from "./admin-products-page";
import * as apiClient from "@/lib/api-client";
import * as authApi from "./auth-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/products",
}));

describe("AdminProductsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@terma.ir",
      role: "SuperAdmin",
      expiresAtUtc: new Date().toISOString(),
    });
  });

  it("renders product list and product create form", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation(async (path: string) => {
      if (path.includes("/api/admin/products")) {
        return {
          items: [
            {
              id: "prod-adm-1",
              name: "سفره ترمه ابریشم فیروزه",
              sku: "TER-FIR-01",
              price: 2_500_000,
              stockQuantity: 10,
              tableCapacity: 6,
              length: 160,
              width: 110,
              color: "فیروزه‌ای",
              pattern: "بته جقه",
              isActive: true,
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        };
      }
      if (path.includes("/api/admin/categories")) {
        return [{ id: "cat-1", name: "رومیزی", slug: "tablecloth", description: null, isActive: true }];
      }
      return null;
    });

    render(<AdminProductsPage />);

    await waitFor(() => {
      expect(screen.getByText("سفره ترمه ابریشم فیروزه")).toBeInTheDocument();
    });

    expect(screen.getByText("TER-FIR-01")).toBeInTheDocument();
    expect(screen.getByText("خلاصه کوتاه محصول (نمایش زیر عنوان بالای صفحه)")).toBeInTheDocument();
    expect(screen.getByText("توضیحات تفصیلی (نمایش در بخش جزئیات محصول)")).toBeInTheDocument();
    expect(screen.getByText("ایجاد گروه محصول")).toBeInTheDocument();
  });

  it("applies full-width class to catalog table when editing a product", async () => {
    window.scrollTo = vi.fn();
    vi.spyOn(apiClient, "apiRequest").mockImplementation(async (path: string) => {
      if (path.includes("/variants")) {
        return [];
      }
      if (path.includes("/api/admin/products")) {
        return {
          items: [
            {
              id: "prod-adm-1",
              name: "سفره سنتی سبز 006",
              sku: "TER-006-6P",
              price: 1_615_000,
              compareAtPrice: 1_900_000,
              discountPercent: 15,
              stockQuantity: 1,
              tableCapacity: 6,
              length: 160,
              width: 110,
              color: "سبز",
              pattern: "بته جقه",
              categoryId: "cat-1",
              isActive: true,
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        };
      }
      if (path.includes("/api/admin/categories")) {
        return [{ id: "cat-1", name: "رومیزی", slug: "tablecloth", description: null, isActive: true }];
      }
      return [];
    });

    render(<AdminProductsPage />);

    await waitFor(() => {
      expect(screen.getByText("سفره سنتی سبز 006")).toBeInTheDocument();
    });

    // Before editing, catalog table does not have full-width class
    const catalogTableWrap = screen.getByText("گروه‌های محصول فعال").closest(".admin-table-wrap");
    expect(catalogTableWrap).not.toHaveClass("admin-table-wrap--full");

    // Click edit
    const editButton = screen.getByText("ویرایش گروه و ظرفیت‌ها");
    editButton.click();

    await waitFor(() => {
      expect(screen.getByText("مشخصات عمومی و مشترک گروه محصول")).toBeInTheDocument();
    });

    // In edit mode, catalog table must span full width across grid columns
    expect(catalogTableWrap).toHaveClass("admin-table-wrap--full");
  });
});
