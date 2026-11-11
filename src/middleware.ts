import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  if (isProtectedRoute) {
    // Check any valid session token cookie name (with underscore, hyphen, or standard prefixes)
    const sessionToken =
      request.cookies.get("better-auth.session_token")?.value?.trim() ||
      request.cookies.get("__Secure-better-auth.session_token")?.value?.trim() ||
      request.cookies.get("better-auth.session-token")?.value?.trim() ||
      request.cookies.get("__Secure-better-auth.session-token")?.value?.trim() ||
      request.cookies.get("sessionToken")?.value?.trim() ||
      request.cookies.get("session_token")?.value?.trim() ||
      request.cookies.get("ksai_session")?.value?.trim();

    // Valid session candidate must exist, be non-empty, and have valid token length (16+ chars)
    const hasValidSession = Boolean(sessionToken && sessionToken.length >= 16);

    if (!hasValidSession) {
      const loginUrl = new URL("/auth", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
