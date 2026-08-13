import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const widths = [375, 768, 1024, 1440] as const;

for (const width of widths) {
  test(`catalog stays usable without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "محصولات", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    if (width < 768) {
      await expect(page.getByRole("button", { name: /فیلتر محصولات/ })).toBeVisible();
    } else {
      await expect(page.getByRole("form", { name: "فیلتر محصولات" })).toBeVisible();
    }
  });
}

test("mobile product discovery, gallery, sticky purchase, cart, and checkout journey", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/products");

  const firstCard = page.locator(".product-card").first();
  const productName = (await firstCard.getByRole("heading", { level: 3 }).textContent())!;
  await firstCard.getByRole("button", { name: new RegExp(`مشاهده سریع ${productName}`) }).click();
  const quickView = page.getByRole("dialog", { name: new RegExp(`مشاهده سریع ${productName}`) });
  await expect(quickView).toBeVisible();
  const sixPerson = quickView.getByRole("button", { name: /۶ نفره موجود/ });
  if (await sixPerson.isVisible()) await sixPerson.click();
  await quickView.getByRole("button", { name: "افزودن به سبد خرید" }).click();

  const cartDrawer = page.getByRole("dialog", { name: "سبد خرید سریع" });
  await expect(cartDrawer).toBeVisible();
  await expect(cartDrawer.getByText(productName, { exact: true })).toBeVisible();
  await expect(cartDrawer.getByText(/نفره ·/)).toBeVisible();
  await cartDrawer.getByRole("button", { name: "ادامه خرید" }).click();

  await firstCard.getByRole("link").click();
  const gallery = page.locator(".product-gallery");
  await expect(gallery).toBeVisible();
  await expect(gallery.getByText("۱ / ۲")).toBeVisible();

  await gallery.locator(".product-gallery__stage").evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 310, clientY: 300 });
    const end = new Touch({ identifier: 1, target: element, clientX: 70, clientY: 300 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(gallery.getByText("۲ / ۲")).toBeVisible();

  await gallery.getByRole("button", { name: /نمایش تمام‌صفحه/ }).click();
  const viewer = page.getByRole("dialog", { name: /نمایش تمام‌صفحه تصاویر/ });
  await viewer.getByRole("button", { name: "افزایش بزرگ‌نمایی" }).click();
  await expect(viewer.getByText("۲×")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).not.toBeVisible();

  await page.locator(".product-purchase-anchor").evaluate((element) => {
    window.scrollTo({ top: element.getBoundingClientRect().bottom + window.scrollY + 700, behavior: "instant" });
  });
  await expect(page.locator(".sticky-purchase--visible")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/cart");
  await expect(page.getByRole("navigation", { name: "مراحل سفارش" })).toContainText("سبد خرید");
  await expect(page.getByRole("navigation", { name: "مراحل سفارش" })).toContainText("اطلاعات ارسال");
  await expect(page.getByRole("navigation", { name: "مراحل سفارش" })).toContainText("ثبت سفارش");
  await page.getByRole("link", { name: "ادامه و تکمیل سفارش" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('.checkout-progress li[aria-current="step"]')).toContainText("اطلاعات ارسال");
});

test("natural search, URL filters, reduced motion, and accessibility work", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/products");

  await page.getByRole("button", { name: "جست‌وجوی محصولات" }).click();
  const search = page.getByRole("dialog", { name: "جست‌وجوی محصولات" });
  await search.getByRole("textbox", { name: "عبارت جست‌وجو" }).fill("سفره زیر دو میلیون");
  await expect(search.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /فیلتر محصولات/ }).click();
  const filters = page.getByRole("dialog", { name: "فیلتر محصولات" });
  await filters.getByRole("combobox", { name: /ظرفیت میز/ }).selectOption("6");
  await filters.getByRole("combobox", { name: /موجودی/ }).selectOption("true");
  await filters.getByRole("button", { name: "اعمال فیلترها" }).click();
  await expect(page).toHaveURL(/tableCapacity=6/);
  await expect(page).toHaveURL(/inStock=true/);

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("mobile landscape keeps controls visible and avoids overflow", async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto("/products");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
