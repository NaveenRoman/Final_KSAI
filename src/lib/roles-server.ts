import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import {
  UserRole,
  normalizeUserRole,
  getRoleDashboardPath,
  AuthContextUser,
} from "@/lib/roles";

export {
  type UserRole,
  normalizeUserRole,
  getRoleDashboardPath,
  type AuthContextUser,
};

export async function getAuthenticatedUser(req?: Request): Promise<AuthContextUser | null> {
  try {
    let sessionUser: any = null;

    if (req) {
      const sessionData = await auth.api.getSession({ headers: req.headers }).catch(() => null);
      sessionUser = sessionData?.user ?? null;
    }

    if (!sessionUser) {
      try {
        const reqHeaders = await headers();
        const sessionData = await auth.api.getSession({ headers: reqHeaders }).catch(() => null);
        sessionUser = sessionData?.user ?? null;
      } catch {}
    }

    let sessionToken = "";
    if (!sessionUser) {
      if (req) {
        const cookieHeader = req.headers.get("cookie") || "";
        const match = cookieHeader.match(/(?:better-auth\.session_token|sessionToken)=([^;]+)/);
        if (match) {
          sessionToken = decodeURIComponent(match[1]);
        }
      }

      if (!sessionToken) {
        try {
          const cookieStore = await cookies();
          sessionToken =
            cookieStore.get("better-auth.session_token")?.value ||
            cookieStore.get("sessionToken")?.value ||
            "";
        } catch {}
      }

      if (sessionToken) {
        const rawToken = parseSessionToken(sessionToken);
        const session = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        sessionUser = session?.user ?? null;
      }
    }

    if (!sessionUser) {
      return null;
    }

    const dbUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        department: true,
        collegeId: true,
        departmentId: true,
        currentYear: true,
      },
    });

    if (!dbUser) return null;

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      rawRole: dbUser.role || "Student",
      role: normalizeUserRole(dbUser.role),
      college: dbUser.college,
      department: dbUser.department,
      collegeId: dbUser.collegeId,
      departmentId: dbUser.departmentId,
      currentYear: dbUser.currentYear,
    };
  } catch (err) {
    console.error("getAuthenticatedUser Error:", err);
    return null;
  }
}

export async function requireRole(
  allowedRoles: UserRole[],
  req?: Request
): Promise<{ user?: AuthContextUser; errorResponse?: Response }> {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: "Authentication required." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: `Access Denied: Role '${user.role}' is not authorized to access this resource.`,
          requiredRoles: allowedRoles,
          userRole: user.role,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { user };
}
