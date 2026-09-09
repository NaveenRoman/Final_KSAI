"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole, normalizeUserRole, getRoleDashboardPath, AuthContextUser } from "@/lib/roles";

/**
 * Enforces role-based dashboard access on client components.
 * - Unauthenticated users are redirected immediately to /auth.
 * - Authenticated users with the wrong role are redirected immediately to their verified dashboard.
 * - No access notification popups are shown.
 */
export function useDashboardGuard(allowedRoles: UserRole[]) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthContextUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401 || !res.ok) {
          router.replace("/auth");
          return;
        }

        const json = await res.json();
        const user = json?.user;
        if (!user) {
          router.replace("/auth");
          return;
        }

        const normRole = normalizeUserRole(user.role);

        if (!allowedRoles.includes(normRole)) {
          const destination = getRoleDashboardPath(normRole);
          router.replace(destination);
          return;
        }

        if (active) {
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            rawRole: user.role,
            role: normRole,
            college: user.college,
            department: user.department,
            currentYear: user.currentYear,
          });
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error("Dashboard guard error:", err);
        router.replace("/auth");
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, [router]);

  return { isAuthorized, currentUser };
}
