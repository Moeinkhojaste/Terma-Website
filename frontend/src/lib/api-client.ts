export type ApiProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
};

type ApiRequestInit = RequestInit & {
  cache?: RequestCache;
};

let antiforgeryTokenPromise: Promise<string> | undefined;

export class ApiError extends Error {
  readonly status?: number;
  readonly problem?: ApiProblemDetails;
  readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: { status?: number; problem?: ApiProblemDetails; isNetworkError?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.problem = options.problem;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new ApiError("آدرس سرویس بک‌اند تنظیم نشده است.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch (cause) {
    throw new ApiError("آدرس سرویس بک‌اند معتبر نیست.", { cause });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError("آدرس سرویس بک‌اند باید با http یا https شروع شود.");
  }

  return url.toString().replace(/\/$/, "");
}

function isProblemDetails(value: unknown): value is ApiProblemDetails {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) return undefined;

  try {
    return (await response.json()) as unknown;
  } catch (cause) {
    throw new ApiError("پاسخ سرویس بک‌اند قابل خواندن نیست.", {
      status: response.status,
      cause,
    });
  }
}

async function getAntiforgeryToken() {
  if (!antiforgeryTokenPromise) {
    antiforgeryTokenPromise = fetch(`${getApiBaseUrl()}/api/auth/antiforgery`, {
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await readJson(response);
        if (!response.ok || !isProblemDetails(body) || typeof (body as { token?: unknown }).token !== "string") {
          throw new ApiError("دریافت اطلاعات امنیتی درخواست ناموفق بود.", { status: response.status });
        }
        return (body as { token: string }).token;
      })
      .catch((error) => {
        antiforgeryTokenPromise = undefined;
        if (error instanceof ApiError) throw error;
        throw new ApiError("ارتباط با سرویس برای دریافت اطلاعات امنیتی برقرار نشد.", {
          isNetworkError: true,
          cause: error,
        });
      });
  }

  return antiforgeryTokenPromise;
}

export function resetAntiforgeryToken() {
  antiforgeryTokenPromise = undefined;
}

const TECHNICAL_ERROR_PATTERN = /(?:Microsoft\.Data\.SqlClient|Microsoft\.EntityFrameworkCore|Microsoft\.AspNetCore|System\.[a-zA-Z]|SqlException|SocketException|GetHostAddresses|TCP Provider|Name or service not known|SQL Server|SqlClient|Network-related|instance-specific|Invalid column name|ClientConnectionId|Error Number:\s*\d+|stack trace|at\s+[a-zA-Z0-9_.]+\(|<!DOCTYPE|<html|<\/html>|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout|ECONNREFUSED|ETIMEDOUT|fetch failed|Failed to fetch)/i;

const PERSIAN_CHAR_PATTERN = /[\u0600-\u06FF]/;

export function sanitizeErrorMessage(rawMessage?: string | null, status?: number): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return getFallbackMessageByStatus(status);
  }

  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return getFallbackMessageByStatus(status);
  }

  // If technical tokens or stack traces are present, NEVER expose them to the user!
  if (TECHNICAL_ERROR_PATTERN.test(trimmed)) {
    return getFallbackMessageByStatus(status);
  }

  // If the message contains Persian characters and has no technical patterns, preserve it
  if (PERSIAN_CHAR_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Translate common standard HTTP/API English error phrases
  const lower = trimmed.toLowerCase();
  if (lower.includes("not found")) return "اطلاعات یا منبع مورد نظر یافت نشد.";
  if (lower.includes("unauthorized") || lower.includes("authentication required")) return "نشست کاربری شما به پایان رسیده است. لطفاً مجدداً وارد حساب کاربری شوید.";
  if (lower.includes("forbidden") || lower.includes("access denied")) return "شما دسترسی لازم برای انجام این عملیات را ندارید.";
  if (lower.includes("conflict")) return "تداخل در ثبت اطلاعات؛ ممکن است این مورد قبلاً ثبت یا ویرایش شده باشد.";
  if (lower.includes("too many requests") || lower.includes("rate limit")) return "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کرده و دوباره تلاش کنید.";
  if (lower.includes("validation") || lower.includes("bad request")) return "اطلاعات وارد شده نامعتبر است. لطفاً ورودی‌های خود را بررسی و اصلاح فرمایید.";
  if (lower.includes("content changed") || lower.includes("precondition failed")) return "اطلاعات هم‌زمان توسط فرآیند دیگری تغییر یافته است. لطفاً صفحه را تازه‌سازی نمایید.";
  if (lower.includes("server error") || lower.includes("internal server error")) return "خطایی در پردازش اطلاعات در سرور رخ داده است. لطفاً لحظاتی دیگر دوباره تلاش نمایید.";

  return getFallbackMessageByStatus(status);
}

function getFallbackMessageByStatus(status?: number): string {
  switch (status) {
    case 400:
    case 422:
      return "اطلاعات ارسالی نامعتبر است. لطفاً مقادیر ورودی را بررسی نمایید.";
    case 401:
      return "نشست کاربری شما به پایان رسیده است. لطفاً مجدداً وارد حساب کاربری شوید.";
    case 403:
      return "شما دسترسی لازم برای انجام این عملیات را ندارید.";
    case 404:
      return "اطلاعات یا منبع مورد نظر یافت نشد.";
    case 409:
      return "تداخل در انجام عملیات؛ لطفاً صفحه را تازه‌سازی کرده و مجدداً تلاش کنید.";
    case 410:
      return "اعتبار این عملیات یا کد به پایان رسیده است.";
    case 412:
      return "اطلاعات توسط فرآیند دیگری تغییر یافته است. لطفاً صفحه را تازه‌سازی فرمایید.";
    case 429:
      return "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کرده و دوباره تلاش کنید.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "خطایی در سرویس‌دهنده یا پایگاه داده رخ داده است. لطفاً لحظاتی دیگر دوباره تلاش فرمایید.";
    default:
      return "خطای پیش‌بینی‌نشده‌ای رخ داد.";
  }
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}, isRetry = false): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !headers.has("X-CSRF-TOKEN")) {
    headers.set("X-CSRF-TOKEN", await getAntiforgeryToken());
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: init.credentials ?? "include",
      headers,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError("ارتباط با سرویس بک‌اند برقرار نشد. مطمئن شوید API در حال اجرا است.", {
      isNetworkError: true,
      cause,
    });
  }

  if (response.status === 204) return undefined as T;

  const body = await readJson(response);
  if (!response.ok) {
    const problem = isProblemDetails(body) ? body : undefined;
    if (!isRetry && response.status === 400 && (problem?.title === "Invalid antiforgery token" || problem?.detail?.includes("antiforgery"))) {
      resetAntiforgeryToken();
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("X-CSRF-TOKEN", await getAntiforgeryToken());
      return apiRequest<T>(path, { ...init, headers: retryHeaders }, true);
    }
    if (response.status === 401 || response.status === 403) resetAntiforgeryToken();
    const fieldErrors = problem?.errors
      ? Object.values(problem.errors).flat().join(" ")
      : undefined;
    const rawCandidate = fieldErrors || problem?.detail || problem?.title || "درخواست سرویس بک‌اند ناموفق بود.";
    const safeMessage = sanitizeErrorMessage(rawCandidate, response.status);
    throw new ApiError(safeMessage, {
      status: response.status,
      problem,
    });
  }

  if (body === undefined) {
    throw new ApiError("سرویس بک‌اند پاسخ قابل‌خواندن برنگرداند.", { status: response.status });
  }

  return body as T;
}

export function getApiErrorMessage(error: unknown): string {
  if (!error) return "خطای پیش‌بینی‌نشده‌ای رخ داد.";

  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return "ارتباط با سرویس فروشگاه برقرار نشد. لطفاً وضعیت اتصال اینترنت خود را بررسی نمایید.";
    }
    if (error.problem?.errors) {
      const messages = Object.values(error.problem.errors)
        .flat()
        .map((m) => m?.trim())
        .filter((m): m is string => Boolean(m));
      if (messages.length > 0) {
        const cleanMessages = messages.map((m) => sanitizeErrorMessage(m, error.status));
        return cleanMessages.join(" ");
      }
    }
    const candidate = error.problem?.detail || error.message || error.problem?.title;
    return sanitizeErrorMessage(candidate, error.status);
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "درخواست لغو شد.";
    }
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return "ارتباط با سرویس فروشگاه برقرار نشد. لطفاً اتصال اینترنت خود را بررسی نمایید.";
    }
    return sanitizeErrorMessage(error.message);
  }

  if (typeof error === "object" && error !== null) {
    const obj = error as { message?: unknown; status?: unknown };
    if (typeof obj.message === "string") {
      const statusNum = typeof obj.status === "number" ? obj.status : undefined;
      return sanitizeErrorMessage(obj.message, statusNum);
    }
  }

  if (typeof error === "string") {
    return sanitizeErrorMessage(error);
  }

  return "خطای پیش‌بینی‌نشده‌ای رخ داد.";
}
