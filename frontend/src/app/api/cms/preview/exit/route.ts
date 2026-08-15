import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expectedOrigin = request.nextUrl.origin;

  if ((origin && origin !== expectedOrigin) || (!origin && referer && !referer.startsWith(expectedOrigin))) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  (await draftMode()).disable();
  return NextResponse.json({ ok: true, redirect: "/admin/content" });
}
