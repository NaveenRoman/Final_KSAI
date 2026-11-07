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

export function TopNavbar({ userName = "Student", userRole = "Student", user, showSearch = true, onMenuToggle }: TopNavbarProps) {
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
    const savedTheme = localStorage.getItem("theme");
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
    <header className="h-16 border-b border-white/10 bg-[#09090B]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
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
          className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] -ml-1 rounded-xl glass-panel border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400/40 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Menu size={20} />
        </button>

        <a href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png" alt="KnowledgeStream AI Logo" className="w-full h-full object-cover rounded-[10px]" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            Knowledge<span className="text-blue-500">Stream</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono border border-cyan-500/30 hidden xs:inline-block">
              AI OS 3.0
            </span>
          </span>
        </a>
      </div>

      {/* Center Search Input */}
      {showSearch ? (
        <div className="hidden md:flex items-center gap-2 max-w-md w-full">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, AI agents, courses, tasks... (Ctrl + K)"
              className="w-full pl-9 pr-12 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-slate-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              <Command size={10} /> K
            </div>
          </div>

          <button className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 hover:opacity-90 shadow-md">
            <Sparkles size={13} /> AI Search
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <button
          aria-label="View notifications"
          className="w-11 h-11 min-w-[44px] min-h-[44px] md:w-9 md:h-9 md:min-w-0 md:min-h-0 rounded-xl glass-panel border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400/40 relative transition-all cursor-pointer shrink-0"
        >
          <Bell size={17} />
          <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2.5 right-2.5 md:top-2 md:right-2 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2.5 right-2.5 md:top-2 md:right-2" />
        </button>

        {/* Calendar */}
        <button
          aria-label="View calendar"
          className="w-9 h-9 rounded-xl glass-panel border border-white/10 hidden sm:flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all cursor-pointer"
        >
          <Calendar size={17} />
        </button>

        {/* Messages */}
        <button
          aria-label="View messages"
          className="w-9 h-9 rounded-xl glass-panel border border-white/10 hidden sm:flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all cursor-pointer"
        >
          <MessageSquare size={17} />
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 sm:p-1.5 pl-2.5 min-h-[44px] sm:min-h-0 rounded-xl glass-panel border border-white/10 hover:border-blue-500/40 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">{displayName}</span>
              <span className="text-[10px] text-cyan-400 font-mono leading-tight">{displayRole}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-56 max-w-[calc(100vw-32px)] p-2 rounded-2xl glass-panel border border-white/15 bg-[#0C0C14]/95 shadow-2xl space-y-1 z-50">
              <div className="p-2.5 border-b border-white/10 mb-1">
                <div className="text-xs font-bold text-white">{displayName}</div>
                <div className="text-[10px] text-slate-400">{displayEmail || "No email available"}</div>
              </div>
              <a href="#profile" className="flex items-center gap-2 p-2 rounded-xl text-xs text-slate-300 hover:bg-white/10 hover:text-white">
                <User size={14} /> My Profile
              </a>
              <a href="#settings" className="flex items-center gap-2 p-2 rounded-xl text-xs text-slate-300 hover:bg-white/10 hover:text-white">
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
