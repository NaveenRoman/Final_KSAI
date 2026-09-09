import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

import { normalizeUserRole, getRoleDashboardPath } from "@/lib/roles";

export async function getAdminUser(req: Request) {
  try {
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user) {
      const cookieHeader = req.headers.get("cookie") || "";
      let sessionToken = "";
      const match = cookieHeader.match(/(?:better-auth\.session_token|sessionToken)=([^;]+)/);
      if (match) {
        sessionToken = decodeURIComponent(match[1]);
      }

      if (!sessionToken) {
        try {
          const cookieStore = await cookies();
          sessionToken =
            cookieStore.get("better-auth.session_token")?.value ||
            cookieStore.get("sessionToken")?.value ||
            "";
        } catch (e) {
          // Ignore cookies() error if called outside server action
        }
      }

      if (sessionToken) {
        const rawToken = parseSessionToken(sessionToken);
        const session = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        user = session?.user ?? null;
      }
    }

    if (!user) return null;

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!dbUser || normalizeUserRole(dbUser.role) !== "SUPER_ADMIN") {
      return null;
    }

    return dbUser;
  } catch (e) {
    console.error("getAdminUser Error:", e);
    return null;
  }
}

export async function requireAdminPage() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  let user = sessionData?.user ?? null;

  if (!user) {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    if (sessionToken) {
      const rawToken = parseSessionToken(sessionToken);
      const session = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });
      user = session?.user ?? null;
    }
  }

  if (!user) {
    redirect("/auth");
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!dbUser) {
    redirect("/auth");
  }

  const normRole = normalizeUserRole(dbUser.role);
  if (normRole !== "SUPER_ADMIN") {
    redirect(getRoleDashboardPath(normRole));
  }

  return dbUser;
}
