import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";

describe("CheckoutProgress", () => {
  it("shows truthful order steps and the current shipping step", () => {
    render(<CheckoutProgress current={2} />);

    expect(screen.getByText("سبد خرید")).toBeInTheDocument();
    expect(screen.getByText("اطلاعات ارسال").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("ثبت سفارش")).toBeInTheDocument();
    expect(screen.queryByText("پرداخت")).not.toBeInTheDocument();
  });
});
