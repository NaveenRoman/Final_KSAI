import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, rememberMe } = body;
    const isRemember = Boolean(rememberMe);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user by email in local database
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Google/OAuth users without a set password
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account was registered using Google. Please sign in using 'Continue with Google'.",
        },
        { status: 401 }
      );
    }

    // Verify password hash against User.passwordHash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Purge any existing/stale sessions for this user or the incoming cookie to prevent role leakage
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:better-auth\.session_token|sessionToken)=([^;]+)/);
      if (match) {
        const oldRawToken = parseSessionToken(decodeURIComponent(match[1]));
        if (oldRawToken) {
          await db.session.deleteMany({
            where: {
              OR: [
                { token: oldRawToken },
                { userId: user.id },
              ],
            },
          });
        }
      } else {
        await db.session.deleteMany({
          where: { userId: user.id },
        });
      }
    } catch (cleanErr) {
      console.warn("Stale session cleanup warning on login:", cleanErr);
    }

    // Ensure credential Account record exists and password matches User.passwordHash for Better Auth
    const credAccount = await db.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (!credAccount) {
      await db.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: user.passwordHash,
        },
      });
    } else if (credAccount.password !== user.passwordHash) {
      await db.account.update({
        where: { id: credAccount.id },
        data: { password: user.passwordHash },
      });
    }

    // Update user's lastActiveDate and record genuine LOGIN activity
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveDate: new Date() },
    });

    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          actionType: "LOGIN",
          metadata: JSON.stringify({
            ip: req.headers.get("x-forwarded-for") || "local",
            userAgent: req.headers.get("user-agent") || "unknown",
          }),
        },
      });
    } catch (logErr) {
      console.warn("Login activity log notice:", logErr);
    }

    // Call Better Auth native signInEmail to generate official signed session
    const sessionResponse = await auth.api.signInEmail({
      body: {
        email: cleanEmail,
        password,
        rememberMe: isRemember,
      },
      asResponse: true,
      headers: req.headers,
    });

    let setCookieHeader: string[] = [];
    if (sessionResponse && sessionResponse.headers) {
      const getSetCookieFn = (sessionResponse.headers as any).getSetCookie;
      if (typeof getSetCookieFn === "function") {
        setCookieHeader = sessionResponse.headers.getSetCookie();
      } else {
        const raw = sessionResponse.headers.get("set-cookie");
        if (raw) setCookieHeader = [raw];
      }
    }

    if (setCookieHeader.length === 0) {
      throw new Error("Better Auth failed to emit session cookies during sign-in.");
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        createdAt: user.createdAt,
      },
    });

    // Forward all official signed Better Auth cookies directly to the browser
    setCookieHeader.forEach((c: string) => {
      response.headers.append("set-cookie", c);
      const tokenMatch = c.match(/(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
      if (tokenMatch) {
        const parsed = parseSessionToken(tokenMatch[1]);
        const isProd = process.env.NODE_ENV === "production";
        const maxAge = isRemember ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
        const secureFlag = isProd ? "; Secure" : "";
        response.headers.append(
          "set-cookie",
          `sessionToken=${parsed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`
        );
      }
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during login." },
      { status: 500 }
    );
  }
}
