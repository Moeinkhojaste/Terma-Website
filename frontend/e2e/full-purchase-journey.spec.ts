import { expect, test } from "@playwright/test";

test.describe("Full End-to-End Purchase Flow & Mobile Audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/(trustseal\.enamad\.ir|enamad\.ir)/, (route) => {
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" fill="#eee"/></svg>',
      });
    });
  });

  const viewports = [
    { name: "Mobile Extra Small (320px)", width: 320, height: 640 },
    { name: "Mobile iPhone (375px)", width: 375, height: 812 },
    { name: "Mobile Android (390px)", width: 390, height: 844 },
    { name: "Tablet (768px)", width: 768, height: 1024 },
    { name: "Desktop (1440px)", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`viewport ${vp.name} renders without horizontal scroll overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/products");

      await expect(page.getByRole("heading", { name: /محصولات/ }).first()).toBeVisible();

      const noHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      );
      expect(noHorizontalOverflow).toBe(true);
    });
  }

  test("completes end-to-end checkout flow from discovery to order status", async ({ page }) => {
    let createdOrderNumber = "";
    await page.route("**/api/orders", async (route) => {
      const response = await route.fetch();
      try {
        const json = await response.json();
        if (json?.number) {
          createdOrderNumber = json.number;
        }
        await route.fulfill({ response, json });
      } catch {
        await route.fulfill({ response });
      }
    });

    await page.route("**/api/payment/initiate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          paymentUrl: `/order/success?order=${encodeURIComponent(createdOrderNumber || "TRM-14030101-001")}&refId=100200300`,
          authority: "S00000000000000000000000000000000000",
        }),
      });
    });

    await page.route(/sandbox\.zarinpal\.com/, async (route) => {
      await route.fulfill({
        status: 302,
        headers: {
          Location: `/order/success?order=${encodeURIComponent(createdOrderNumber || "TRM-14030101-001")}&refId=100200300`,
        },
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/products");

    // Discover product
    const firstProduct = page.locator(".product-card").first();
    await expect(firstProduct).toBeVisible({ timeout: 15_000 });

    // Click quick view or open product details
    const quickViewButton = firstProduct.locator(".product-card__quick-view");
    if (await quickViewButton.isVisible()) {
      await quickViewButton.click();
      const quickView = page.getByRole("dialog");
      await expect(quickView).toBeVisible();
      await quickView.getByRole("button", { name: "افزودن به سبد خرید" }).click();
    } else {
      await firstProduct.getByRole("link").first().click();
      const addToCart = page.getByRole("button", { name: "افزودن به سبد خرید" });
      await addToCart.click();
    }

    // Cart drawer or navigate to cart
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "سبد خرید" })).toBeVisible();

    // Proceed to checkout
    const checkoutBtn = page.getByRole("link", { name: "ادامه و تکمیل سفارش" });
    await checkoutBtn.click();
    await expect(page).toHaveURL(/\/checkout/);

    // Fill checkout form with Iranian details
    await page.locator('input[name="fullName"]').fill("مبین خجسته");
    await page.locator('input[name="mobile"]').fill("09121112233");
    await page.locator('select[name="province"]').selectOption("تهران");
    await page.locator('select[name="city"]').selectOption("تهران");
    await page.locator('textarea[name="address"]').fill("خیابان ولیعصر، بالاتر از ظفر، پلاک ۱۰۰");
    await page.locator('input[name="postalCode"]').fill("1994612345");

    // Submit form to review step
    const submitBtn = page.getByRole("button", { name: "ثبت سفارش" });
    await submitBtn.click();

    // Verify Review Modal
    const reviewDialog = page.getByRole("dialog", { name: /بازبینی و تأیید سفارش/ });
    await expect(reviewDialog).toBeVisible();
    await expect(reviewDialog.getByText("مبین خجسته")).toBeVisible();
    await expect(reviewDialog.getByText("1994612345")).toBeVisible();

    // Confirm and place order
    const confirmBtn = reviewDialog.getByRole("button", { name: "تأیید و ثبت سفارش" });
    await confirmBtn.click();

    // Verify Order Success Page
    await expect(page).toHaveURL(/\/order\/success/);
    await expect(page.getByRole("heading", { name: /سفارش شما با موفقیت ثبت شد/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /کپی شماره سفارش/ })).toBeVisible();
  });
});
