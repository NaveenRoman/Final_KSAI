import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseSessionToken } from "@/lib/auth-cookie";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("__Secure-better-auth.session_token")?.value ||
      cookieStore.get("better-auth.session-token")?.value ||
      cookieStore.get("__Secure-better-auth.session-token")?.value ||
      cookieStore.get("sessionToken")?.value ||
      cookieStore.get("session_token")?.value ||
      cookieStore.get("ksai_session")?.value;

    // 1. Primary check: Use Better Auth's native getSession
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let u = session?.user as any;

    // 2. Fallback check: If native getSession fails, look up using raw token from cookie in DB
    if (!u && sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        u = dbSession.user;
      }
    }

    if (!u) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        country: u.country,
        college: u.college,
        department: u.department,
        currentYear: u.currentYear,
        provider: u.provider,
        googleId: u.googleId,
        emailVerified: u.emailVerified,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}