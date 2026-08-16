import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createProduct } from "@/test/product-fixture";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  getQuote: vi.fn(),
  getCustomerSession: vi.fn(),
  getCustomerAddresses: vi.fn(),
  useCart: vi.fn(),
  clearCart: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));
vi.mock("@/features/cart/cart-provider", () => ({ useCart: mocks.useCart }));
vi.mock("@/features/checkout/checkout-api", () => ({ createOrder: mocks.createOrder, getQuote: mocks.getQuote }));
vi.mock("@/features/account/account-api", () => ({
  getCustomerSession: mocks.getCustomerSession,
  getCustomerProfile: vi.fn().mockResolvedValue({ email: "" }),
  getCustomerAddresses: mocks.getCustomerAddresses,
}));
vi.mock("@/components/layout/header", () => ({ Header: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("@/components/layout/container", () => ({ Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/features/products/components/recently-viewed-products", () => ({ RecentlyViewedProducts: () => null }));

import { CheckoutPageClient } from "@/features/checkout/checkout-page-client";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

function fillValidCheckout(email?: string) {
  fireEvent.change(screen.getByLabelText(/^نام و نام خانوادگی \*/), { target: { value: "مریم احمدی" } });
  fireEvent.change(screen.getByLabelText(/^شماره موبایل \*/), { target: { value: "۰۹۱۲۱۲۳۴۵۶۷" } });
  if (email !== undefined) {
    fireEvent.change(screen.getByLabelText(/^آدرس ایمیل/), { target: { value: email } });
  }
  fireEvent.change(screen.getByLabelText(/^استان \*/), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText(/^شهر \*/), { target: { value: "تهران" } });
  fireEvent.change(screen.getByLabelText(/^آدرس کامل \*/), { target: { value: "خیابان ولیعصر، کوچه یازدهم، پلاک ۲۴" } });
  fireEvent.change(screen.getByLabelText(/^کد پستی \*/), { target: { value: "۱۲۳۴۵۶۷۸۹۰" } });
}

afterEach(cleanup);

describe("checkout order review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mocks.getCustomerSession.mockRejectedValue(new Error("guest"));
    const product = createProduct();
    mocks.useCart.mockReturnValue({
      hydrated: true,
      clearCart: mocks.clearCart,
      items: [{ lineId: "product-1:variant-6", productId: product.id, variantId: product.variantId, product, quantity: 2 }],
    });
  });

  it("does not open the review or create an order when the form is invalid", () => {
    render(<CheckoutPageClient />);
    const fullName = screen.getByLabelText(/^نام و نام خانوادگی \*/);

    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    expect(screen.queryByRole("dialog", { name: "بازبینی و تأیید سفارش" })).not.toBeInTheDocument();
    expect(fullName).toHaveFocus();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("shows validation error when invalid email format is entered", () => {
    render(<CheckoutPageClient />);
    fillValidCheckout("not-an-email");

    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    expect(screen.queryByRole("dialog", { name: "بازبینی و تأیید سفارش" })).not.toBeInTheDocument();
    expect(screen.getByText("فرمت آدرس ایمیل معتبر نیست.")).toBeInTheDocument();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("shows the exact review snapshot and keeps the form when editing", async () => {
    render(<CheckoutPageClient />);
    fillValidCheckout("maryam@example.com");

    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));
    const dialog = await screen.findByRole("dialog", { name: "بازبینی و تأیید سفارش" });

    expect(within(dialog).getByText("مریم احمدی")).toBeInTheDocument();
    expect(within(dialog).getByText("09121234567")).toBeInTheDocument();
    expect(within(dialog).getByText("maryam@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("سفره ترمه آبی")).toBeInTheDocument();
    expect(within(dialog).getByText(/تعداد ۲/)).toBeInTheDocument();
    expect(mocks.createOrder).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "بازگشت و ویرایش" }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(screen.getByLabelText(/^نام و نام خانوادگی \*/)).toHaveValue("مریم احمدی");
    expect(screen.getByLabelText(/^آدرس ایمیل/)).toHaveValue("maryam@example.com");
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("creates one order only after confirmation and clears the cart on success", async () => {
    let resolveOrder!: (value: { number: string; total?: number }) => void;
    mocks.createOrder.mockImplementation(() => new Promise((resolve) => { resolveOrder = resolve; }));
    render(<CheckoutPageClient />);
    fillValidCheckout("maryam@example.com");
    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    const dialog = await screen.findByRole("dialog", { name: "بازبینی و تأیید سفارش" });
    const confirm = within(dialog).getByRole("button", { name: "تأیید و ثبت سفارش" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "مریم احمدی",
      phone: "09121234567",
      email: "maryam@example.com",
      postalCode: "1234567890",
      customerNotes: undefined,
    }));
    expect(within(dialog).getByRole("button", { name: "در حال ثبت سفارش…" })).toBeDisabled();

    resolveOrder({ number: "TRM-12345678-123456" });
    await waitFor(() => expect(mocks.clearCart).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith("/order/success?order=TRM-12345678-123456");
  });

  it("clears shipping address fields when user clicks 'وارد کردن آدرس دیگر'", async () => {
    mocks.getCustomerSession.mockResolvedValue({ phone: "09121234567" });
    mocks.getCustomerAddresses.mockResolvedValue([
      {
        id: "addr-1",
        title: "منزل",
        receiverName: "علی رضایی",
        receiverPhone: "09121234567",
        province: "تهران",
        city: "تهران",
        address: "خیابان آزادی پلاک ۱۰",
        postalCode: "1111111111",
        isDefault: true,
      },
    ]);

    render(<CheckoutPageClient />);

    // Wait for saved address to populate fields
    await waitFor(() => {
      expect(screen.getByLabelText(/^نام و نام خانوادگی \*/)).toHaveValue("علی رضایی");
    });
    expect(screen.getByLabelText(/^استان \*/)).toHaveValue("تهران");
    expect(screen.getByLabelText(/^شهر \*/)).toHaveValue("تهران");
    expect(screen.getByLabelText(/^آدرس کامل \*/)).toHaveValue("خیابان آزادی پلاک ۱۰");
    expect(screen.getByLabelText(/^کد پستی \*/)).toHaveValue("1111111111");

    // Click on "وارد کردن آدرس دیگر"
    const manualRadio = screen.getByLabelText(/\+ وارد کردن آدرس دیگر/);
    fireEvent.click(manualRadio);

    // Verify fields are empty and not prefilled
    expect(screen.getByLabelText(/^نام و نام خانوادگی \*/)).toHaveValue("");
    expect(screen.getByLabelText(/^استان \*/)).toHaveValue("");
    expect(screen.getByLabelText(/^شهر \*/)).toHaveValue("");
    expect(screen.getByLabelText(/^آدرس کامل \*/)).toHaveValue("");
    expect(screen.getByLabelText(/^کد پستی \*/)).toHaveValue("");
  });

  it("updates city options when province changes and resets invalid city", () => {
    render(<CheckoutPageClient />);
    const provinceSelect = screen.getByLabelText(/^استان \*/);
    const citySelect = screen.getByLabelText(/^شهر \*/);

    expect(citySelect).toBeDisabled();

    // Select Fars province
    fireEvent.change(provinceSelect, { target: { value: "فارس" } });
    expect(citySelect).not.toBeDisabled();
    expect(within(citySelect).getByText("شیراز")).toBeInTheDocument();

    // Select Shiraz city
    fireEvent.change(citySelect, { target: { value: "شیراز" } });
    expect(citySelect).toHaveValue("شیراز");

    // Change province to Isfahan -> city should reset
    fireEvent.change(provinceSelect, { target: { value: "اصفهان" } });
    expect(citySelect).toHaveValue("");
    expect(within(citySelect).getByText("کاشان")).toBeInTheDocument();
  });

  it("keeps the review and cart available when order creation fails", async () => {
    mocks.createOrder.mockRejectedValue(new Error("failure"));
    render(<CheckoutPageClient />);
    fillValidCheckout();
    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    const dialog = await screen.findByRole("dialog", { name: "بازبینی و تأیید سفارش" });
    fireEvent.click(within(dialog).getByRole("button", { name: "تأیید و ثبت سفارش" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.");
    expect(within(dialog).getByRole("button", { name: "تأیید و ثبت سفارش" })).toBeEnabled();
    expect(mocks.clearCart).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

