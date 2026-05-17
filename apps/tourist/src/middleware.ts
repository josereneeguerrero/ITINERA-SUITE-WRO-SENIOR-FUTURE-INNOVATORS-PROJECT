import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isMobile(ua: string): boolean {
  return /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|mobile/i.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, landing and mobile page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/mobile" ||
    pathname === "/"        // landing visible en móvil
  ) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") ?? "";

  if (isMobile(ua)) {
    return NextResponse.redirect(new URL("/mobile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
