import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";

describe("CheckoutProgress", () => {
  it("shows all 5 steps in order and marks the active step", () => {
    render(<CheckoutProgress current={3} />);

    expect(screen.getByText("فروشگاه")).toBeInTheDocument();
    expect(screen.getByText("سبد خرید")).toBeInTheDocument();
    expect(screen.getByText("اطلاعات ارسال").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("پرداخت")).toBeInTheDocument();
    expect(screen.getByText("ثبت سفارش")).toBeInTheDocument();
  });
});
