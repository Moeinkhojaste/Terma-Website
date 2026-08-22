import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import * as cmsApi from "@/features/content/cms-api";
import type { CmsPublishedPage } from "@/features/content/cms-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

function renderHeader(props?: Parameters<typeof Header>[0]) {
  return render(
    <FeedbackProvider>
      <CartProvider>
        <Header {...props} />
      </CartProvider>
    </FeedbackProvider>
  );
}

describe("Header", () => {
  it("does not render announcement bar initially when no initial text is provided", () => {
    vi.spyOn(cmsApi, "getPublishedSite").mockReturnValue(new Promise(() => {}));
    const { container } = renderHeader();

    expect(container.querySelector(".announcement")).toBeNull();
  });

  it("renders custom announcement text passed via prop", () => {
    renderHeader({ announcementText: "تخفیف ویژه بهار ترمه" });

    expect(screen.getByText("تخفیف ویژه بهار ترمه")).toBeInTheDocument();
  });

  it("does not render announcement bar when announcementText is null or empty", () => {
    const { container } = renderHeader({ announcementText: null });

    expect(container.querySelector(".announcement")).toBeNull();
  });

  it("updates announcement text dynamically from CMS site settings", async () => {
    const mockSite: CmsPublishedPage = {
      slug: "site-settings",
      name: "تنظیمات عمومی سایت",
      publishedAt: new Date().toISOString(),
      document: {
        schemaVersion: 1,
        seo: { title: "ترما", description: "", canonicalPath: null, ogImageUrl: null, noIndex: false },
        blocks: [
          {
            id: "b1",
            type: "announcement",
            data: { text: "ارسال رایگان برای تمام سفارش‌های بالای یک میلیون تومان" },
          },
        ],
      },
    };

    vi.spyOn(cmsApi, "getPublishedSite").mockResolvedValue(mockSite);
    renderHeader();

    await waitFor(() => {
      expect(
        screen.getByText("ارسال رایگان برای تمام سفارش‌های بالای یک میلیون تومان")
      ).toBeInTheDocument();
    });
  });

  it("renders brand logo, navigation links, and account button", () => {
    renderHeader();

    expect(screen.getByText("ترما")).toBeInTheDocument();
    expect(screen.getByText("ترمه فاخر ایرانی")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "محصولات" })[0]).toHaveAttribute("href", "/products");
    expect(screen.getAllByRole("link", { name: "درباره ما" })[0]).toHaveAttribute("href", "/about");
    expect(screen.getAllByRole("link", { name: "ارتباط با ما" })[0]).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "حساب کاربری" })).toHaveAttribute("href", "/account");
  });
});
