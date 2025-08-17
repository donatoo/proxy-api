import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;

  // Skip Next.js static assets and API routes
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Rewrite everything else to your proxy API
  return NextResponse.rewrite(
    new URL(`/api/proxy?url=https://vidlink.pro${url.pathname}${url.search}`, req.url)
  );
}
