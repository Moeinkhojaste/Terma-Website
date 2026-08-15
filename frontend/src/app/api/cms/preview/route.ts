import { cookies, draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expectedOrigin = request.nextUrl.origin;

  if ((origin && origin !== expectedOrigin) || (!origin && referer && !referer.startsWith(expectedOrigin))) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  let body: { id?: string; slug?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const { id, slug } = body;
  if (!id || !slug) return NextResponse.json({ detail: "Preview page parameters are missing." }, { status: 400 });

  const cookieHeader = (await cookies()).toString();
  const auth = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
    cache: "no-store",
  });

  if (!auth.ok) {
    return NextResponse.json({ redirect: "/admin/login?reason=expired" }, { status: 401 });
  }

  (await draftMode()).enable();
  const path = slug === "home" ? "/" : `/${encodeURIComponent(slug)}`;
  const previewUrl = `${path}?cmsPreview=${encodeURIComponent(id)}`;

  return NextResponse.json({ ok: true, url: previewUrl });
}
