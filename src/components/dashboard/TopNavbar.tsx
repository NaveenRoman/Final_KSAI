"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Sparkles,
  Search,
  Command,
  Bell,
  Calendar,
  MessageSquare,
  Sun,
  Moon,
  Settings,
  User,
  ChevronDown,
  ShieldCheck,
  Menu,
} from "lucide-react";

interface TopNavbarProps {
  userName?: string;
  userRole?: string;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  } | null;
  showSearch?: boolean;
  onMenuToggle?: () => void;
}

export function TopNavbar({
  userName = "Student",
  userRole = "Student",
  user,
  showSearch = true,
  onMenuToggle,
}: TopNavbarProps) {
  const sessionData = useSession();
  const sessionUser = (sessionData?.data as any)?.user ?? null;
  const authUser = user ?? sessionUser;
  const displayName = authUser?.name || userName || "Student";
  const displayRole = authUser?.role || userRole || "Student";
  const displayEmail = authUser?.email || "";

  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    // Sync initial theme
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    } else {
      setDarkMode(true);
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (typeof window !== "undefined") {
      if (!nextMode) {
        document.documentElement.classList.add("light");
        document.body.classList.add("light");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.remove("light");
        document.body.classList.remove("light");
        localStorage.setItem("theme", "dark");
      }
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left Brand Logo & Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            if (onMenuToggle) {
              onMenuToggle();
            } else if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
            }
          }}
          aria-label="Open navigation menu"
          className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] -ml-1 rounded-xl ks-card border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-cyan)] active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Menu size={20} />
        </button>

        <a href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png" alt="KnowledgeStream AI Logo" className="w-full h-full object-cover rounded-[10px]" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            Knowledge<span className="text-[var(--brand-blue)]">Stream</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-[var(--brand-cyan)] font-mono border border-cyan-500/30 hidden xs:inline-block">
              AI
            </span>
          </span>
        </a>
      </div>

      {/* Center Search Input */}
      {showSearch ? (
        <div className="hidden md:flex items-center gap-2 max-w-md w-full">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, lessons, compiler, tests... (Ctrl + K)"
              className="w-full pl-9 pr-12 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--brand-cyan)] focus:ring-1 focus:ring-[var(--brand-cyan)] transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              <Command size={10} /> K
            </div>
          </div>

          <button className="ks-btn-primary !min-h-[36px] !py-1.5 !px-3 !text-xs !rounded-xl shrink-0">
            <Sparkles size={13} /> AI Search
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Theme Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 rounded-xl ks-card border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-cyan)] transition-all cursor-pointer"
        >
          {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-blue-500" />}
        </button>

        {/* Notifications */}
        <button
          aria-label="View notifications"
          className="w-9 h-9 rounded-xl ks-card border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-cyan)] relative transition-all cursor-pointer shrink-0"
        >
          <Bell size={17} />
          <span className="w-2 h-2 rounded-full bg-[var(--brand-cyan)] absolute top-2 right-2 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-[var(--brand-cyan)] absolute top-2 right-2" />
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-xl ks-card border border-[var(--border-subtle)] hover:border-[var(--brand-blue)] transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[var(--brand-blue)] to-[var(--accent-purple)] flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">{displayName}</span>
              <span className="text-[10px] text-[var(--brand-cyan)] font-mono leading-tight">{displayRole}</span>
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-56 max-w-[calc(100vw-32px)] p-2 rounded-2xl ks-card-elevated border border-[var(--border-subtle)] shadow-2xl space-y-1 z-50">
              <div className="p-2.5 border-b border-[var(--border-subtle)] mb-1">
                <div className="text-xs font-bold text-[var(--text-primary)]">{displayName}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{displayEmail || "Authenticated User"}</div>
              </div>
              <a href="/settings" className="flex items-center gap-2 p-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">
                <Settings size={14} /> Settings &amp; Preferences
              </a>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch (err) {
                    console.error("Logout failed:", err);
                  }
                  window.location.href = "/auth";
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
              >
                <ShieldCheck size={14} /> Switch Account / Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
