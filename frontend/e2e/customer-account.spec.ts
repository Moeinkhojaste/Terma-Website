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

test("customer can sign in with the development OTP and open the account", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name.startsWith("mobile") ? "8" : "7"}${String(Date.now()).slice(-6)}`;
  await page.goto("/account/login");
  await page.getByRole("textbox", { name: "شماره موبایل" }).fill(`0912${suffix}`);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  const devOtpLocator = page.locator(".development-otp strong");
  if (!await devOtpLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
    test.skip(true, "Development OTP helper is disabled for production storefront");
    return;
  }
  const developmentCode = await devOtpLocator.textContent();
  expect(developmentCode).toMatch(/^\d{6}$/);
  await page.getByLabel("کد تأیید").fill(developmentCode!);
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "سفارش‌های من" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "هنوز سفارشی ندارید" })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  const confirmBtn = page.getByRole("button", { name: "بله، خروج از حساب" });
  if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await expect(page).toHaveURL(/\/account\/login$/);
  await expect(page.getByRole("heading", { name: "ورود به حساب کاربری" })).toBeVisible();
});
