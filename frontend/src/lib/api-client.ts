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

function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new ApiError("آدرس سرویس محصولات تنظیم نشده است.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch (cause) {
    throw new ApiError("آدرس سرویس محصولات معتبر نیست.", { cause });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError("آدرس سرویس محصولات باید با http یا https شروع شود.");
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
    return await response.json() as unknown;
  } catch (cause) {
    throw new ApiError("پاسخ سرویس محصولات قابل خواندن نیست.", {
      status: response.status,
      cause,
    });
  }
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError("ارتباط با سرویس محصولات برقرار نشد.", {
      isNetworkError: true,
      cause,
    });
  }

  if (response.status === 204) return undefined as T;

  const body = await readJson(response);
  if (!response.ok) {
    const problem = isProblemDetails(body) ? body : undefined;
    throw new ApiError(problem?.detail ?? problem?.title ?? "درخواست سرویس محصولات ناموفق بود.", {
      status: response.status,
      problem,
    });
  }

  if (body === undefined) {
    throw new ApiError("سرویس محصولات پاسخ JSON برنگرداند.", { status: response.status });
  }

  return body as T;
}

export function getApiErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "خطای پیش‌بینی‌نشده‌ای رخ داد.";
}
