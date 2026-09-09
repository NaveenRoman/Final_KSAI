import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

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

    // Sync Account table password hash for Better Auth compatibility
    await db.account.updateMany({
      where: { userId: user.id },
      data: { password: user.passwordHash },
    });

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

    let sessionCreated = false;

    // Try Better Auth native signInEmail
    try {
      const sessionResponse = await auth.api.signInEmail({
        body: {
          email: user.email,
          password,
          rememberMe: true,
        },
        asResponse: true,
        headers: req.headers,
      });

      if (sessionResponse && sessionResponse.headers) {
        const getSetCookieFn = (sessionResponse.headers as any).getSetCookie;
        if (typeof getSetCookieFn === "function") {
          const cookiesArr = sessionResponse.headers.getSetCookie();
          if (cookiesArr.length > 0) {
            cookiesArr.forEach((c: string) => {
              response.headers.append("set-cookie", c);
              const tokenMatch = c.match(/better-auth\.session_token=([^;]+)/);
              if (tokenMatch) {
                const parsed = parseSessionToken(tokenMatch[1]);
                response.cookies.set("sessionToken", parsed, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                  path: "/",
                  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                });
              }
            });
            sessionCreated = true;
          }
        } else {
          const setCookieHeader = sessionResponse.headers.get("set-cookie");
          if (setCookieHeader) {
            response.headers.set("set-cookie", setCookieHeader);
            const tokenMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
            if (tokenMatch) {
              const parsed = parseSessionToken(tokenMatch[1]);
              response.cookies.set("sessionToken", parsed, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              });
            }
            sessionCreated = true;
          }
        }
      }
    } catch (authErr) {
      console.warn("Better Auth signInEmail warning, applying fallback session generation:", authErr);
    }

    // Fallback Session Generation if Better Auth didn't emit cookies
    if (!sessionCreated) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      response.cookies.set("better-auth.session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      response.cookies.set("sessionToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
    }

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during login." },
      { status: 500 }
    );
  }
}
