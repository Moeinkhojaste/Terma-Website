import { describe, expect, it } from "vitest";
import { normalizeIranianMobile, normalizeNumericText } from "./iranian-phone";

describe("normalizeIranianMobile", () => {
  it.each([
    "09121234567",
    "+989121234567",
    "00989121234567",
    "۰۹۱۲۱۲۳۴۵۶۷",
    "٠٩١٢١٢٣٤٥٦٧",
  ])("accepts %s", (value) => expect(normalizeIranianMobile(value)).toBe("09121234567"));

  it.each(["", "912123456", "08121234567", "+971501234567"])("rejects %s", (value) => {
    expect(normalizeIranianMobile(value)).toBeNull();
  });
});

it("normalizes Persian and Arabic numeric text", () => {
  expect(normalizeNumericText("۱۲٣-۴۵")).toBe("12345");
});
