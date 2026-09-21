import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clearCartMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/components/layout/header", () => ({ Header: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("@/features/cart/cart-provider", () => ({
  useCart: () => ({
    clearCart: clearCartMock,
  }),
}));

import { OrderStatus } from "./order-status";

describe("OrderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders success state with animated celebration, order number, and copy button, and clears cart", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<OrderStatus type="success" orderNumber="TRM-20260816-307207" />);

    expect(screen.getByText("پرداخت و ثبت موفق")).toBeInTheDocument();
    expect(screen.getByText("سفارش شما با موفقیت ثبت شد")).toBeInTheDocument();
    expect(screen.getByText("TRM-20260816-307207")).toBeInTheDocument();
    expect(screen.getAllByText("ثبت سفارش").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("آماده‌سازی")).toBeInTheDocument();
    expect(screen.getByText("ارسال")).toBeInTheDocument();

    expect(clearCartMock).toHaveBeenCalledTimes(1);

    const copyBtn = screen.getByRole("button", { name: "کپی شماره سفارش" });
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith("TRM-20260816-307207");
    expect(screen.getByText("کپی شد")).toBeInTheDocument();
  });

  it("renders failed state with retry button and does not clear cart", () => {
    render(<OrderStatus type="failed" />);

    expect(screen.getByText("پرداخت ناموفق")).toBeInTheDocument();
    expect(screen.getByText("سفارش شما ثبت نشد")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تلاش دوباره" })).toHaveAttribute("href", "/checkout");
    expect(clearCartMock).not.toHaveBeenCalled();
  });

  it("renders cancelled state and does not clear cart", () => {
    render(<OrderStatus type="cancelled" />);

    expect(screen.getByText("سفارش لغوشده")).toBeInTheDocument();
    expect(screen.getByText("پرداخت را لغو کردید")).toBeInTheDocument();
    expect(clearCartMock).not.toHaveBeenCalled();
  });
});
