import { cookies, draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-client";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const slug = request.nextUrl.searchParams.get("slug");
  if (!id || !slug) return NextResponse.json({ detail: "Preview page is missing." }, { status: 400 });
  const cookieHeader = (await cookies()).toString();
  const auth = await fetch(`${getApiBaseUrl()}/api/auth/me`, { headers: { Accept: "application/json", Cookie: cookieHeader }, cache: "no-store" });
  if (!auth.ok) return NextResponse.redirect(new URL("/admin/login?reason=expired", request.url));
  (await draftMode()).enable();
  const path = slug === "home" ? "/" : `/${encodeURIComponent(slug)}`;
  return NextResponse.redirect(new URL(`${path}?cmsPreview=${encodeURIComponent(id)}`, request.url));
}
