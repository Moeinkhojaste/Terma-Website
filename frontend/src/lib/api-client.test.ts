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

  it("sanitizes raw SqlException and database stack traces to friendly Persian message", () => {
    const rawSqlError =
      "Microsoft.Data.SqlClient.SqlException (0x80131904): Invalid column name 'CompareAtPrice'. Invalid column name 'DiscountPercent'.\n" +
      "at System.Threading.Tasks.ContinuationResultTaskFromResultTask`2.InnerInvoke()\n" +
      "at Terma.Infrastructure.Store.StoreOperationsService.GetTopSellingProductsInternalAsync(Int32 days, Int32 limit)";

    const apiError = new ApiError(rawSqlError, {
      status: 500,
      problem: {
        status: 500,
        title: "Server error",
        detail: rawSqlError,
      },
    });

    const friendlyMessage = getApiErrorMessage(apiError);
    expect(friendlyMessage).not.toContain("Microsoft.Data.SqlClient");
    expect(friendlyMessage).not.toContain("Invalid column name");
    expect(friendlyMessage).not.toContain("CompareAtPrice");
    expect(friendlyMessage).toBe("خطایی در سرویس‌دهنده یا پایگاه داده رخ داده است. لطفاً لحظاتی دیگر دوباره تلاش فرمایید.");
  });

  it("handles HTTP status codes with appropriate Persian guidance", () => {
    expect(getApiErrorMessage(new ApiError("Unauthorized", { status: 401 }))).toBe(
      "نشست کاربری شما به پایان رسیده است. لطفاً مجدداً وارد حساب کاربری شوید.",
    );
    expect(getApiErrorMessage(new ApiError("Forbidden", { status: 403 }))).toBe(
      "شما دسترسی لازم برای انجام این عملیات را ندارید.",
    );
    expect(getApiErrorMessage(new ApiError("Not Found", { status: 404 }))).toBe(
      "اطلاعات یا منبع مورد نظر یافت نشد.",
    );
    expect(getApiErrorMessage(new ApiError("Too Many Requests", { status: 429 }))).toBe(
      "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کرده و دوباره تلاش کنید.",
    );
    expect(getApiErrorMessage(new ApiError("Payload Too Large", { status: 413 }))).toBe(
      "حجم فایل ارسالی بیش از حد مجاز است. لطفاً فایل کوچک‌تری انتخاب نمایید.",
    );
    expect(getApiErrorMessage(new ApiError("Unsupported Media Type", { status: 415 }))).toBe(
      "فرمت یا محتوای فایل تصویر انتخاب‌شده نامعتبر است.",
    );
  });

  it("preserves genuine Persian business and domain messages", () => {
    expect(getApiErrorMessage(new ApiError("موجودی کالا برای ثبت سفارش کافی نیست."))).toBe(
      "موجودی کالا برای ثبت سفارش کافی نیست.",
    );
  });

  it("handles network errors with internet check message", () => {
    const networkError = new ApiError("Failed to fetch", { isNetworkError: true });
    expect(getApiErrorMessage(networkError)).toBe(
      "ارتباط با سرویس فروشگاه برقرار نشد. لطفاً وضعیت اتصال اینترنت خود را بررسی نمایید.",
    );
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

  it("apiRequest automatically sanitizes 500 server stack traces before throwing ApiError", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/problem+json" }),
      json: async () => ({
        title: "Server error",
        detail: "Microsoft.Data.SqlClient.SqlException: Invalid column name 'CompareAtPrice' at System.Threading.Tasks...",
      }),
    } as unknown as Response);

    await expect(apiRequest("/api/test")).rejects.toThrow(
      "خطایی در سرویس‌دهنده یا پایگاه داده رخ داده است. لطفاً لحظاتی دیگر دوباره تلاش فرمایید.",
    );
  });
});
