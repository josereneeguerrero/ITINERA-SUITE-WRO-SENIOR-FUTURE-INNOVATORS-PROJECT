import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that are allowed on mobile (landing + the mobile page itself)
const MOBILE_ALLOWED = ["/", "/mobile"];

// Prefixes that are always allowed (static assets, API, Next internals)
const ALWAYS_ALLOWED_PREFIXES = [
  "/_next",
  "/favicon",
  "/api",
  "/mobile",
];

function isMobile(ua: string): boolean {
  return /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|mobile/i.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and API routes
  if (ALWAYS_ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") ?? "";

  if (isMobile(ua)) {
    // Allow landing page on mobile
    if (MOBILE_ALLOWED.includes(pathname)) {
      return NextResponse.next();
    }
    // Everything else → redirect to mobile page
    return NextResponse.redirect(new URL("/mobile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
