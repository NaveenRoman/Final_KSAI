import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseSessionToken } from "@/lib/auth-cookie";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Resolves the server-side authenticated user from better-auth session or cookies.
 * Server-side authenticated identity remains strictly authoritative.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    // 1. Better Auth session lookup
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let u = session?.user as any;

    // 2. Cookie session token fallback in DB
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

    if (u && u.id) {
      return {
        id: u.id,
        email: u.email,
        role: u.role,
      };
    }
  } catch (err) {
    // Non-fatal, unauthenticated request
  }

  return null;
}
