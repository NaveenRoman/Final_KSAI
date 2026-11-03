"use client";

import { authClient } from "@/lib/auth-client";

/**
 * Universal client-side logout utility.
 * 1. Calls Better Auth client signOut to clear client store and session cache.
 * 2. Informs the server to destroy DB sessions and clear HTTP-only cookies.
 * 3. Purges localStorage and sessionStorage.
 * 4. Uses window.location.replace to redirect to /auth and eliminate back-button re-entry.
 */
export async function handleUserLogout(): Promise<void> {
  try {
    await authClient.signOut();
  } catch (clientErr) {
    console.warn("Client signOut notice:", clientErr);
  }

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Logout error:", err);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    // Force navigation to /auth replacing the current history entry
    window.location.replace("/auth");
  }
}
