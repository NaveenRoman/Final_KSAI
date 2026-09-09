"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Crown,
  Search,
  Bell,
  User,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { handleUserLogout } from "@/lib/auth-logout";

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  adminUser?: {
    name?: string;
    email?: string;
    role?: string;
  };
  unreadCount?: number;
}

export function AdminHeader({
  onToggleSidebar,
  onOpenSearch,
  adminUser,
  unreadCount = 3,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const adminName = adminUser?.name || "Banoth Naveen";
  const adminRole = "Founder & Director";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left Section: Hamburger + Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Admin Dashboard Title with Crown Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <Crown size={20} className="fill-amber-400 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                Admin Dashboard
              </h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                System Overview and Management
              </p>
            </div>
          </div>
        </div>

        {/* Center / Search trigger on desktop */}
        {onOpenSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-500 hover:text-slate-700 transition-all cursor-pointer shadow-2xs group"
            >
              <span className="flex items-center gap-2">
                <Search size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span>Search students, colleges, courses...</span>
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-400 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Section: Status, Notifications, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Mobile Search Button */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Search"
            >
              <Search size={18} />
            </button>
          )}

          {/* System Status Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-slate-200 text-xs font-semibold shadow-xs border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] tracking-wide">System Online</span>
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl py-3 px-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-900">Platform Notifications</span>
                  <Link
                    href="/admin/notifications"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    View All →
                  </Link>
                </div>
                <div className="space-y-2.5 py-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <p className="font-semibold text-slate-900">New course &apos;Advanced AI&apos; published</p>
                    <span className="text-[10px] text-slate-500">2 hours ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-900">3 colleges verified accreditation</p>
                    <span className="text-[10px] text-slate-500">1 day ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-900">Placement drive scheduled for May 28</p>
                    <span className="text-[10px] text-slate-500">2 days ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Super Admin Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1 sm:pl-2 sm:pr-3 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden ring-2 ring-slate-200 group-hover:ring-blue-500 transition-all">
                <img
                  src="/images/admin_avatar.png"
                  alt={adminName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="text-white font-bold">BN</span>
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                  <span>{adminName}</span>
                  <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-transform" />
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                  {adminRole}
                </div>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{adminName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{adminUser?.email || "admin@knowledgestream.ai"}</div>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-extrabold border border-amber-200">
                    <Crown size={10} /> Super Admin
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>Account Settings</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Shield size={14} className="text-slate-400" />
                    <span>Security</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleUserLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={14} className="text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
