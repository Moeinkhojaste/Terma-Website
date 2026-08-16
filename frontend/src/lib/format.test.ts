import { describe, it, expect } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats price with Persian digits and appends تومان", () => {
    const formatted = formatPrice(1500000);
    expect(formatted).toContain("۱٬۵۰۰٬۰۰۰");
    expect(formatted).toContain("تومان");
  });

  it("handles zero and small numbers", () => {
    expect(formatPrice(0)).toContain("۰");
    expect(formatPrice(50000)).toContain("۵۰٬۰۰۰");
  });
});
