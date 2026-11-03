import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // Single source of truth: Better Auth's cryptographic session resolution
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const u = session?.user as any;

    if (!u) {
      // Purge any invalid/unsigned/zombie session cookies from client browser
      const response = NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );

      const staleCookieNames = [
        "better-auth.session_token",
        "__Secure-better-auth.session_token",
        "better-auth.session-token",
        "__Secure-better-auth.session-token",
        "better-auth.session_data",
        "sessionToken",
        "session_token",
        "ksai_session",
      ];

      for (const name of staleCookieNames) {
        response.cookies.set(name, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          expires: new Date(0),
          maxAge: 0,
          path: "/",
        });
      }

      return response;
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