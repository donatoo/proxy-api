import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;

  // Skip Vercel assets (unless you want to proxy them too)
  if (url.pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Rewrite everything else to your proxy API
  if (!url.pathname.startsWith("/api/proxy")) {
    return NextResponse.rewrite(
      new URL(`/api/proxy?url=https://vidlink.pro${url.pathname}${url.search}`, req.url)
    );
  }

  return NextResponse.next();
}
