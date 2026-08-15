import "server-only";
import { cookies, draftMode } from "next/headers";
import { ApiError, getApiBaseUrl } from "@/lib/api-client";
import type { CmsPageDetail } from "./cms-types";

export async function getDraftCmsPage(id: string): Promise<CmsPageDetail | undefined> {
  const draft = await draftMode();
  if (!draft.isEnabled) return undefined;
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${getApiBaseUrl()}/api/admin/cms/pages/${id}`, { headers: { Accept: "application/json", Cookie: cookieHeader }, cache: "no-store" });
  if (response.status === 401 || response.status === 403) return undefined;
  if (!response.ok) throw new ApiError("پیش‌نمایش پیش‌نویس دریافت نشد.", { status: response.status });
  return response.json() as Promise<CmsPageDetail>;
}
