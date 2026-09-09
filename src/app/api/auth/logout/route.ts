import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    if (sessionToken) {
      try {
        const rawToken = parseSessionToken(sessionToken);
        await db.session.deleteMany({
          where: {
            OR: [
              { token: rawToken },
              { token: sessionToken },
            ],
          },
        });
      } catch (dbError) {
        console.error("Error deleting session from DB during logout:", dbError);
      }
    }

    // Call Better Auth signOut
    try {
      await auth.api.signOut({
        headers: await headers(),
      });
    } catch (authErr) {
      // Ignored if signOut fails or is not applicable
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    const cookieNames = [
      "better-auth.session_token",
      "better-auth.session_data",
      "better-auth.csrf_token",
      "sessionToken",
    ];

    for (const name of cookieNames) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    }

    console.log(`✅ [LOGOUT] All sessions and cookies cleared successfully.`);
    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during logout." },
      { status: 500 }
    );
  }
}
