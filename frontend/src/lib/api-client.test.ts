import { describe, it, expect, vi, beforeEach } from "vitest";
import { getApiBaseUrl, ApiError, getApiErrorMessage, apiRequest } from "./api-client";

describe("api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getApiBaseUrl returns formatted URL when configured", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/";
    expect(getApiBaseUrl()).toBe("http://localhost:5000");
  });

  it("getApiBaseUrl throws ApiError when invalid protocol", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "ftp://localhost:5000";
    expect(() => getApiBaseUrl()).toThrowError("آدرس سرویس بک‌اند باید با http یا https شروع شود.");
  });

  it("getApiErrorMessage returns friendly message from ApiError or generic", () => {
    expect(getApiErrorMessage(new ApiError("خطای سرور"))).toBe("خطای سرور");
    expect(getApiErrorMessage(new Error("Other"))).toBe("خطای پیش‌بینی‌نشده‌ای رخ داد.");
  });

  it("apiRequest handles successful json responses", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true, count: 4 }),
    } as unknown as Response);

    const result = await apiRequest<{ success: boolean; count: number }>("/api/test");
    expect(result).toEqual({ success: true, count: 4 });
  });

  it("apiRequest extracts ProblemDetails error messages on failure", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/problem+json" }),
      json: async () => ({
        title: "Validation error",
        detail: "شماره موبایل نامعتبر است",
      }),
    } as unknown as Response);

    await expect(apiRequest("/api/test")).rejects.toThrow("شماره موبایل نامعتبر است");
  });
});
