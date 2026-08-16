import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/components/layout/header", () => ({ Header: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));

import { OrderStatus } from "./order-status";

describe("OrderStatus", () => {
  it("renders success state with animated celebration, order number, and copy button", () => {
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

    const copyBtn = screen.getByRole("button", { name: "کپی شماره سفارش" });
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith("TRM-20260816-307207");
    expect(screen.getByText("کپی شد")).toBeInTheDocument();
  });

  it("renders failed state with retry button", () => {
    render(<OrderStatus type="failed" />);

    expect(screen.getByText("پرداخت ناموفق")).toBeInTheDocument();
    expect(screen.getByText("سفارش شما ثبت نشد")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تلاش دوباره" })).toHaveAttribute("href", "/checkout");
  });

  it("renders cancelled state", () => {
    render(<OrderStatus type="cancelled" />);

    expect(screen.getByText("سفارش لغوشده")).toBeInTheDocument();
    expect(screen.getByText("پرداخت را لغو کردید")).toBeInTheDocument();
  });
});
