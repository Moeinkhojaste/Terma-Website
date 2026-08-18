import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatNumber,
  toPersianDigits,
  formatPersianDate,
  formatPersianDateTime,
} from "./format";

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

describe("formatPersianDate", () => {
  it("formats full date with weekday, day, month, and year correctly in Persian order", () => {
    // 2026-08-18 UTC
    const date = new Date("2026-08-18T12:00:00Z");
    const formatted = formatPersianDate(date);
    // Should start with weekday and contain Persian comma
    expect(formatted).toContain("، ");
    expect(formatted).toMatch(/^(شنبه|یک‌شنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه)/);
    expect(formatted).toContain("مرداد");
  });

  it("formats date without weekday when requested", () => {
    const date = new Date("2026-08-18T12:00:00Z");
    const formatted = formatPersianDate(date, { includeWeekday: false });
    expect(formatted).not.toContain("،");
    expect(formatted).toContain("مرداد");
  });

  it("handles empty or invalid inputs gracefully", () => {
    expect(formatPersianDate(null)).toBe("");
    expect(formatPersianDate(undefined)).toBe("");
    expect(formatPersianDate("invalid-date")).toBe("");
  });
});

describe("formatPersianDateTime", () => {
  it("includes date and time in Persian format", () => {
    const date = new Date("2026-08-18T15:30:00Z");
    const formatted = formatPersianDateTime(date);
    expect(formatted).toContain("ساعت");
    expect(formatted).toContain("مرداد");
  });
});
