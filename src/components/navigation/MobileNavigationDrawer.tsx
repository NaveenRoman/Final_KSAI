"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { handleUserLogout } from "@/lib/auth-logout";
import {
  Compass,
  LayoutDashboard,
  BookOpen,
  Brain,
  Code2,
  Award,
  Trophy,
  FileText,
  Video,
  Settings,
  Lock,
  X,
  LogOut,
  Zap,
} from "lucide-react";

export interface MobileNavigationDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userProfile?: {
    name?: string;
    role?: string;
    level?: number;
    xp?: number;
    levelProgressXp?: number;
    targetXp?: number;
    image?: string | null;
    [key: string]: unknown;
  };
  subscription?: {
    hasActiveSubscription?: boolean;
    plan?: "BASIC" | "PRO" | null;
    subscription?: {
      daysRemaining?: number;
      endDate?: string;
    } | null;
  } | null;
  isPro?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  proOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "Explore Courses",
    label: "Explore Courses",
    icon: Compass,
    route: "/courses/catalog",
  },
  {
    id: "Dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    route: "/dashboard",
  },
  {
    id: "Courses",
    label: "My Courses",
    icon: BookOpen,
    route: "/courses",
  },
  {
    id: "AI Quiz Generator",
    label: "AI Quiz Generator",
    icon: Brain,
    route: "/quiz-generator",
  },
  {
    id: "Editor",
    label: "Editor",
    icon: Code2,
    route: "/editor",
  },
  {
    id: "Certificates",
    label: "Certificates",
    icon: Award,
    route: "/certificates",
  },
  {
    id: "Leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    route: "/leaderboard",
  },
  {
    id: "Resume Builder",
    label: "Resume Builder",
    icon: FileText,
    route: "/resume-builder",
    proOnly: true,
  },
  {
    id: "Interview Prep",
    label: "Interview Prep",
    icon: Video,
    route: "/interview",
    proOnly: true,
  },
  {
    id: "Settings",
    label: "Settings",
    icon: Settings,
    route: "/settings",
  },
];

export function MobileNavigationDrawer({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  userProfile,
  subscription,
  isPro,
}: MobileNavigationDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [internalOpen, setInternalOpen] = useState(false);
  const isDrawerOpen = isOpen !== undefined ? isOpen : internalOpen;

  const closeDrawer = useCallback(() => {
    setInternalOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  // Global event listener for custom dispatch triggers
  useEffect(() => {
    const handleToggle = () => {
      setInternalOpen((prev) => !prev);
    };
    const handleClose = () => {
      setInternalOpen(false);
      if (onClose) onClose();
    };

    window.addEventListener("ksai-toggle-mobile-sidebar", handleToggle);
    window.addEventListener("ksai-close-mobile-sidebar", handleClose);

    return () => {
      window.removeEventListener("ksai-toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("ksai-close-mobile-sidebar", handleClose);
    };
  }, [onClose]);

  // Support Escape key to close drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDrawerOpen]);

  // Auto-close mobile drawer on route change
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setInternalOpen(false);
    if (onClose) onClose();
  }

  // Fetch subscription if not provided via props
  const [localSub, setLocalSub] = useState<typeof subscription | null>(null);
  useEffect(() => {
    if (subscription !== undefined) return;

    let active = true;
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        if (active) setLocalSub(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [subscription]);

  // Fetch user profile if not provided via props
  const [localProfile, setLocalProfile] = useState<{
    name: string;
    role: string;
    level: number;
    xp: number;
    levelProgressXp?: number;
    targetXp: number;
    image?: string | null;
  } | null>(null);

  useEffect(() => {
    if (userProfile) return;

    const controller = new AbortController();
    async function loadProfile() {
      try {
        const res = await fetch("/api/dashboard", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.user && !controller.signal.aborted) {
          setLocalProfile({
            name: data.user.name,
            role: data.user.role,
            level: data.user.level ?? 1,
            xp: data.user.xp ?? 0,
            levelProgressXp: data.user.levelProgressXp ?? data.user.xp ?? 0,
            targetXp: data.user.targetXp ?? 1000,
            image: data.user.image ?? null,
          });
        }
      } catch {
        // Ignored aborted fetches
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [userProfile]);

  const activeProfile =
    userProfile ||
    localProfile ||
    (session?.user
      ? {
          name: session.user.name || "Student",
          role: (session.user as { role?: string }).role || "Student",
          level: 1,
          xp: 0,
          levelProgressXp: 0,
          targetXp: 1000,
          image: session.user.image || null,
        }
      : null);

  const activeSub = subscription !== undefined ? subscription : localSub;
  const userRole = activeProfile?.role ?? "Student";
  const isProUser = isPro !== undefined ? isPro : activeSub?.plan === "PRO" || userRole === "Admin";
  const isBasicUser = activeSub?.plan === "BASIC";

  if (!isDrawerOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className="relative w-72 max-w-[85vw] sm:max-w-xs h-full bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col justify-between text-[var(--text-primary)] z-10 shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200 pl-safe pt-safe pb-safe"
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/images/logo.png"
                alt="KnowledgeStream AI Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-black text-xs text-white tracking-tight flex items-center gap-1 truncate">
                KnowledgeStream
                <span className="text-[8px] px-1 py-0.5 rounded font-mono font-bold bg-blue-500/20 border border-cyan-500/30 text-cyan-300">
                  AI OS
                </span>
              </span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">
                Teach to Code. Not to Copy.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation List */}
        <div className="p-2.5 overflow-y-auto custom-scrollbar flex-1 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            let isActive = activeTab === item.id || activeTab === item.label;

            if (pathname) {
              if (item.id === "Explore Courses" && pathname.startsWith("/courses/catalog")) isActive = true;
              else if (item.id === "Dashboard" && pathname === "/dashboard") isActive = true;
              else if (
                item.id === "Courses" &&
                pathname.startsWith("/courses") &&
                !pathname.startsWith("/courses/catalog")
              )
                isActive = true;
              else if (item.id === "AI Quiz Generator" && pathname.startsWith("/quiz-generator")) isActive = true;
              else if (item.id === "Editor" && pathname.startsWith("/editor")) isActive = true;
              else if (item.id === "Certificates" && pathname.startsWith("/certificates")) isActive = true;
              else if (item.id === "Leaderboard" && pathname.startsWith("/leaderboard")) isActive = true;
              else if (item.id === "Resume Builder" && pathname.startsWith("/resume-builder")) isActive = true;
              else if (item.id === "Interview Prep" && pathname.startsWith("/interview")) isActive = true;
              else if (item.id === "Settings" && pathname.startsWith("/settings")) isActive = true;
            }

            const isLocked = item.proOnly && !isProUser;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  closeDrawer();
                  if (onTabChange) onTabChange(item.id);
                  router.push(item.route);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all min-h-[44px] cursor-pointer text-left ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/30 to-purple-600/20 border border-blue-500/60 text-white shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} className={isActive ? "text-cyan-400" : "text-slate-400"} />
                <span className="truncate text-sm flex-1">{item.label}</span>
                {isLocked ? (
                  <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black border border-purple-500/30 shrink-0">
                    <Lock size={10} className="text-purple-300" /> Pro
                  </span>
                ) : (
                  isActive && (
                    <span className="w-2 h-2 rounded-full ml-auto bg-cyan-400 animate-pulse shrink-0" />
                  )
                )}
              </button>
            );
          })}

          {/* Codexa Plans / Subscribe Banner */}
          <div className="pt-2">
            {!isProUser ? (
              <div className="p-3 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-blue-950/30 to-purple-900/20 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Zap size={15} className="text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        {isBasicUser
                          ? `Basic (${activeSub?.subscription?.daysRemaining ?? 0}d left)`
                          : "Codexa Plans"}
                      </span>
                      <span className="text-[10px] text-purple-300/80 font-medium block truncate">
                        {isBasicUser ? "Upgrade unlimited" : "Subscribe to Pro"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      router.push(isBasicUser ? "/plans/duration?plan=pro" : "/plans");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 transition-all shadow-md shrink-0 cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    {isBasicUser ? "Upgrade" : "Subscribe"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-purple-500/30 flex items-center justify-between">
                <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                  👑 Pro Member
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  {activeSub?.subscription?.daysRemaining !== undefined
                    ? `${activeSub.subscription.daysRemaining}d left`
                    : "Active"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer with Profile & Logout */}
        <div className="p-3 border-t border-white/10 bg-[#060609] space-y-2 shrink-0">
          {activeProfile && (
            <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 space-y-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {activeProfile.image ? (
                  <Image
                    src={activeProfile.image}
                    alt={activeProfile.name || "User"}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-slate-400 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-xs shrink-0">
                    {(activeProfile.name || "S").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-xs font-bold text-white truncate">
                    {activeProfile.name || "Student"}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    Level {activeProfile.level ?? 1} &bull; {activeProfile.xp ?? 0} XP
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              {(() => {
                const currentProgressXp =
                  activeProfile.levelProgressXp !== undefined
                    ? activeProfile.levelProgressXp
                    : (activeProfile.xp ?? 0);
                const targetXp = activeProfile.targetXp || 1000;
                const progressPct = Math.min(
                  100,
                  Math.round((currentProgressXp / targetXp) * 100)
                );

                return (
                  <div className="flex items-center gap-1.5 pt-0.5" title={`Level Progress XP: ${currentProgressXp}/${targetXp}`}>
                    <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-[8px] font-mono font-bold text-slate-400 shrink-0">
                      {currentProgressXp}/{targetXp} XP
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              closeDrawer();
              void handleUserLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] cursor-pointer"
          >
            <LogOut size={16} className="text-red-400 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
