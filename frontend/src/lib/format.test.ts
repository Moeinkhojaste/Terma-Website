import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber, toPersianDigits } from "./format";

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

  it("formats regular numbers without تومان", () => {
    expect(formatNumber(1250)).toContain("۱٬۲۵۰");
    expect(formatNumber(0)).toContain("۰");
  });

  it("handles NaN, null, and undefined gracefully without 'ناعدد'", () => {
    expect(formatPrice(NaN)).toContain("۰");
    expect(formatPrice(null)).toContain("۰");
    expect(formatPrice(undefined)).toContain("۰");
    expect(formatNumber(NaN)).toContain("۰");
    expect(formatNumber(null)).toContain("۰");
    expect(formatNumber(undefined)).toContain("۰");
    expect(formatPrice(NaN)).not.toContain("ناعدد");
    expect(formatNumber(NaN)).not.toContain("ناعدد");
  });

  it("converts english digits to persian digits", () => {
    expect(toPersianDigits("1405/05/27")).toBe("۱۴۰۵/۰۵/۲۷");
    expect(toPersianDigits(1234567890)).toBe("۱۲۳۴۵۶۷۸۹۰");
  });
});
