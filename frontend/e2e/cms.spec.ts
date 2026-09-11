import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route(/(trustseal\.enamad\.ir|enamad\.ir)/, (route) => {
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" fill="#eee"/></svg>',
    });
  });
});

test("published CMS homepage renders in RTL without automatic accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
});

test("admin CMS supports login, draft editing and full preview", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "E2E admin credentials are required.");
  await page.goto("/admin/login");
  await page.getByLabel("ایمیل").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("رمز عبور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /ورود/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/content");
  await expect(page.getByRole("heading", { name: "صفحات و محتوای عمومی" })).toBeVisible();
  await page.getByRole("link", { name: /صفحه اصلی/ }).click();
  await expect(page.getByText("ساختار صفحه")).toBeVisible();
  await expect(page.getByRole("button", { name: "انتشار" })).toBeVisible();
  await expect(page.getByRole("link", { name: "پیش‌نمایش کامل" })).toBeVisible();
});
