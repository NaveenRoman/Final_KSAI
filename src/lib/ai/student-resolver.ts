/**
 * Codexa Server-Side Student Identity & Quota Resolver
 *
 * Resolves caller identity strictly from authenticated server-side sessions
 * (Better-Auth API and signed database cookies). Never trusts studentId from
 * client request payloads.
 *
 * For unauthenticated guests, derives a secure SHA-256 hashed identity from
 * the client IP and enforces a restrictive guest rate limit (MAX_GUEST_RPM).
 */

import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { db } from "@/lib/db";
import { MAX_STUDENT_RPM, MAX_GUEST_RPM } from "./gemini-config";

export interface StudentIdentity {
  studentId: string;
  isGuest: boolean;
  limitRpm: number;
}

export async function resolveStudentIdentity(
  request?: Request
): Promise<StudentIdentity> {
  let user: { id: string; name?: string | null; email?: string | null } | null = null;

  try {
    const reqHeaders = request?.headers || (await headers());

    // 1. Primary check: Better-Auth session API
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session?.user?.id) {
      user = session.user as any;
    }

    // 2. Fallback check: Cookie session token lookup in DB
    if (!user) {
      const cookieStore = await cookies();
      const sessionTokenRaw =
        cookieStore.get("better-auth.session_token")?.value ||
        cookieStore.get("sessionToken")?.value;

      if (sessionTokenRaw) {
        const rawToken = parseSessionToken(sessionTokenRaw);
        const dbSession = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });

        if (dbSession && new Date() < dbSession.expiresAt && dbSession.user) {
          user = dbSession.user;
        }
      }
    }
  } catch (err) {
    // Non-blocking fallback to guest
  }

  // Authenticated Student
  if (user?.id) {
    return {
      studentId: user.id,
      isGuest: false,
      limitRpm: MAX_STUDENT_RPM,
    };
  }

  // Unauthenticated Guest: Derive deterministic hash from client IP
  let clientIp = "127.0.0.1";
  try {
    const reqHeaders = request?.headers || (await headers());
    const forwarded = reqHeaders.get("x-forwarded-for");
    if (forwarded) {
      clientIp = forwarded.split(",")[0].trim();
    } else {
      clientIp = reqHeaders.get("x-real-ip") || reqHeaders.get("cf-connecting-ip") || "anonymous_guest";
    }
  } catch {
    clientIp = "anonymous_guest";
  }

  const ipHash = crypto.createHash("sha256").update(clientIp).digest("hex").slice(0, 16);
  const guestStudentId = `guest_${ipHash}`;

  return {
    studentId: guestStudentId,
    isGuest: true,
    limitRpm: MAX_GUEST_RPM,
  };
}
