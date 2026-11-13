"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    // Read user preference from localStorage, default to dark for premium SaaS mood
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.body.classList.remove("light");
      document.body.classList.add("dark");
    }
  }, [pathname]);

  return null;
}
