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
    throw new ApiError(fieldErrors || problem?.detail || problem?.title || "درخواست سرویس بک‌اند ناموفق بود.", {
      status: response.status,
      problem,
    });
  }

  if (body === undefined) {
    throw new ApiError("سرویس بک‌اند پاسخ قابل‌خواندن برنگرداند.", { status: response.status });
  }

  return body as T;
}

export function getApiErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "خطای پیش‌بینی‌نشده‌ای رخ داد.";
}
