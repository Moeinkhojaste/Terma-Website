import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createProduct } from "@/test/product-fixture";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  getQuote: vi.fn(),
  getCustomerSession: vi.fn(),
  useCart: vi.fn(),
  clearCart: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));
vi.mock("@/features/cart/cart-provider", () => ({ useCart: mocks.useCart }));
vi.mock("@/features/checkout/checkout-api", () => ({ createOrder: mocks.createOrder, getQuote: mocks.getQuote }));
vi.mock("@/features/account/account-api", () => ({ getCustomerSession: mocks.getCustomerSession }));
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

function fillValidCheckout() {
  fireEvent.change(screen.getByLabelText(/^نام و نام خانوادگی \*/), { target: { value: "مریم احمدی" } });
  fireEvent.change(screen.getByLabelText(/^شماره موبایل \*/), { target: { value: "۰۹۱۲۱۲۳۴۵۶۷" } });
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

  it("shows the exact review snapshot and keeps the form when editing", async () => {
    render(<CheckoutPageClient />);
    fillValidCheckout();

    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));
    const dialog = await screen.findByRole("dialog", { name: "بازبینی و تأیید سفارش" });

    expect(within(dialog).getByText("مریم احمدی")).toBeInTheDocument();
    expect(within(dialog).getByText("09121234567")).toBeInTheDocument();
    expect(within(dialog).getByText("ثبت نشده")).toBeInTheDocument();
    expect(within(dialog).getByText("سفره ترمه آبی")).toBeInTheDocument();
    expect(within(dialog).getByText(/تعداد ۲/)).toBeInTheDocument();
    expect(mocks.createOrder).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "بازگشت و ویرایش" }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(screen.getByLabelText(/^نام و نام خانوادگی \*/)).toHaveValue("مریم احمدی");
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("creates one order only after confirmation and clears the cart on success", async () => {
    let resolveOrder!: (value: { number: string; trackingToken: string }) => void;
    mocks.createOrder.mockImplementation(() => new Promise((resolve) => { resolveOrder = resolve; }));
    render(<CheckoutPageClient />);
    fillValidCheckout();
    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    const dialog = await screen.findByRole("dialog", { name: "بازبینی و تأیید سفارش" });
    const confirm = within(dialog).getByRole("button", { name: "تأیید و ثبت سفارش" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "مریم احمدی",
      phone: "09121234567",
      postalCode: "1234567890",
      customerNotes: undefined,
    }));
    expect(within(dialog).getByRole("button", { name: "در حال ثبت سفارش…" })).toBeDisabled();

    resolveOrder({ number: "TRM-12345678", trackingToken: "tracking-token" });
    await waitFor(() => expect(mocks.clearCart).toHaveBeenCalledTimes(1));
    expect(mocks.replace).toHaveBeenCalledWith("/order/success?order=TRM-12345678&tracking=tracking-token");
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
