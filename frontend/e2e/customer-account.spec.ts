import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("customer can sign in with the development OTP and open the account", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name.startsWith("mobile") ? "8" : "7"}${String(Date.now()).slice(-6)}`;
  await page.goto("/account/login");
  await page.getByRole("textbox", { name: "شماره موبایل" }).fill(`0912${suffix}`);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  const developmentCode = await page.locator(".development-otp strong").textContent();
  expect(developmentCode).toMatch(/^\d{6}$/);
  await page.getByLabel("کد تأیید").fill(developmentCode!);
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "سفارش‌های من" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "هنوز سفارشی ندارید" })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page).toHaveURL(/\/account\/login$/);
  await expect(page.getByRole("heading", { name: "ورود با شماره موبایل" })).toBeVisible();
});
