"use client";

/**
 * Universal client-side logout utility.
 * 1. Informs the server to destroy DB sessions and clear HTTP-only cookies.
 * 2. Purges localStorage and sessionStorage.
 * 3. Uses window.location.replace to redirect to /auth and eliminate back-button re-entry.
 */
export async function handleUserLogout(): Promise<void> {
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
