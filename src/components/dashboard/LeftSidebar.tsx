"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  FolderGit2,
  CheckSquare,
  Clock,
  Code2,
  Terminal,
  FileText,
  Video,
  Award,
  Briefcase,
  Users,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Brain,
  Lock,
  Compass,
  Menu,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { handleUserLogout } from "@/lib/auth-logout";
import { MobileNavigationDrawer } from "@/components/navigation/MobileNavigationDrawer";

interface LeftSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onChange?: (tab: string) => void;
  userProfile?: {
    name?: string;
    role?: string;
    level?: number;
    xp?: number;
    levelProgressXp?: number;
    targetXp?: number;
    image?: string | null;
    [key: string]: any;
  };
  isLight?: boolean;
  fullHeight?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const SIDEBAR_ROUTES: Record<string, string> = {
  "Explore Courses": "/courses/catalog",
  "Dashboard": "/dashboard",
  "Courses": "/courses",
  "My Courses": "/courses",
  "AI Mentor": "/codexai",
  "AI Quiz Generator": "/quiz-generator",
  "Editor": "/editor",
  "Workspace": "/editor",
  "Certificates": "/certificates",
  "Leaderboard": "/leaderboard",
  "Resume Builder": "/resume-builder",
  "Interview Prep": "/interview",
  "Settings": "/settings",
  "Contests": "/contests",
};

const MENU_ITEMS = [
  {
    id: "Explore Courses",
    label: "Explore Courses",
    icon: Compass,
    category: "Main",
  },
  {
    id: "Dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    category: "Main",
  },

  {
    id: "Courses",
    label: "My Courses",
    icon: BookOpen,
    category: "Academic",
  },

  {
    id: "AI Quiz Generator",
    label: "AI Quiz Generator",
    icon: Brain,
    category: "AI Tools",
  },

  {
    id: "Editor",
    label: "Editor",
    icon: Code2,
    category: "Main",
  },

  {
    id: "Certificates",
    label: "Certificates",
    icon: Award,
    category: "Career",
  },

  {
    id: "Leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    category: "Social",
  },

  {
    id: "Resume Builder",
    label: "Resume Builder",
    icon: FileText,
    category: "Career",
  },

  {
    id: "Interview Prep",
    label: "Interview Prep",
    icon: Video,
    category: "Career",
  },

  {
    id: "Settings",
    label: "Settings",
    icon: Settings,
    category: "System",
  },
];

export function LeftSidebar({
  activeTab = "Dashboard",
  onTabChange,
  onChange,
  userProfile,
  isLight = false,
  fullHeight = false,
  mobileOpen,
  onMobileClose,
}: LeftSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileDrawerOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;

  const closeMobileDrawer = () => {
    setInternalMobileOpen(false);
    if (onMobileClose) onMobileClose();
  };

  const openMobileDrawer = () => {
    setInternalMobileOpen(true);
  };

  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Listen for global custom events to toggle mobile navigation drawer
  useEffect(() => {
    const handleToggle = () => {
      setInternalMobileOpen((prev) => !prev);
    };
    const handleClose = () => {
      setInternalMobileOpen(false);
    };

    window.addEventListener("ksai-toggle-mobile-sidebar", handleToggle);
    window.addEventListener("ksai-close-mobile-sidebar", handleClose);

    return () => {
      window.removeEventListener("ksai-toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("ksai-close-mobile-sidebar", handleClose);
    };
  }, []);

  // Auto-close mobile drawer on route change without triggering set-state-in-effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setInternalMobileOpen(false);
  }

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  const [subscription, setSubscription] = useState<{
    hasActiveSubscription: boolean;
    plan: "BASIC" | "PRO" | null;
    subscription?: {
      daysRemaining: number;
      endDate: string;
    } | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => setSubscription(data))
      .catch(() => {});
  }, []);

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
            image: data.user.image,
          });
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && !controller.signal.aborted) {
          console.warn("Could not load sidebar profile data:", err.message);
        }
      }
    }

    loadProfile();

    return () => {
      controller.abort();
    };
  }, [userProfile]);

  const activeProfile = userProfile || localProfile || (session?.user ? {
    name: session.user.name ?? "Student",
    role: (session.user as any).role ?? "Student",
    level: 1,
    xp: 0,
    levelProgressXp: 0,
    targetXp: 1000,
    image: session.user.image,
  } : null);

  const userRole = activeProfile?.role ?? "Student";
  const isPro = subscription?.plan === "PRO" || userRole === "Admin";
  const isBasic = subscription?.plan === "BASIC";

  return (
    <>
      <aside
        className={`hidden md:flex flex-col justify-between transition-all duration-300 z-30 select-none border-r-0 md:border-r shrink-0 ${
        isLight
          ? "bg-white border-slate-200/80 text-slate-700"
          : "dark-sidebar bg-[#09090B]/90 border-white/10 backdrop-blur-xl text-white"
      } ${
        fullHeight
          ? "h-screen sticky top-0"
          : "h-[calc(100vh-4rem)] sticky top-16"
      } ${
        collapsed ? "w-0 md:w-16" : "w-0 md:w-64"
      }`}
    >
      {/* Brand Logo Header if fullHeight */}
      {fullHeight && (
        <div className={`p-3 border-b flex items-center justify-between ${
          isLight ? "border-slate-100 bg-white" : "border-white/10 bg-[#060609]"
        }`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="KnowledgeStream AI Logo" className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className={`font-black text-xs tracking-tight flex items-center gap-1 ${
                  isLight ? "text-[#0F172A]" : "text-white"
                }`}>
                  KnowledgeStream
                  <span className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold border ${
                    isLight
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-blue-500/20 border-cyan-500/30 text-cyan-300"
                  }`}>
                    AI OS
                  </span>
                </span>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Teach to Code. Not to Copy.
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center py-0.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 p-[1px] shadow-sm flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="KnowledgeStream AI Logo" className="w-full h-full object-cover rounded-[6px]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation List */}
      <div data-lenis-prevent className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-0.5">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;

          let isActive = activeTab === item.id || activeTab === item.label;
          if (pathname) {
            if (item.id === "Explore Courses" && (pathname === "/courses/catalog" || pathname.startsWith("/courses/catalog"))) {
              isActive = true;
            } else if (item.id === "Dashboard" && pathname === "/dashboard") {
              isActive = true;
            } else if (item.id === "Courses" && (pathname === "/courses" || (pathname.startsWith("/courses") && !pathname.startsWith("/courses/catalog")))) {
              isActive = true;
            } else if (item.id === "AI Mentor" && (pathname.startsWith("/codexai") || pathname.startsWith("/codeai"))) {
              isActive = true;
            } else if (item.id === "AI Quiz Generator" && (pathname.startsWith("/quiz-generator") || pathname.startsWith("/practice"))) {
              isActive = true;
            } else if (item.id === "Editor" && pathname.startsWith("/editor")) {
              isActive = true;
            } else if (item.id === "Leaderboard" && pathname.startsWith("/leaderboard")) {
              isActive = true;
            } else if (item.id === "Certificates" && pathname.startsWith("/certificates")) {
              isActive = true;
            } else if (item.id === "Resume Builder" && pathname.startsWith("/resume-builder")) {
              isActive = true;
            } else if (item.id === "Interview Prep" && pathname.startsWith("/interview")) {
              isActive = true;
            } else if (item.id === "Settings" && pathname.startsWith("/settings")) {
              isActive = true;
            }
          }

          const isLocked = (item.id === "Resume Builder" || item.id === "Interview Prep") && !isPro;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (typeof onTabChange === "function") {
                  try {
                    onTabChange(item.id);
                  } catch (e) {
                    console.warn("onTabChange error:", e);
                  }
                }
                if (typeof onChange === "function") {
                  try {
                    onChange(item.id);
                  } catch (e) {
                    console.warn("onChange error:", e);
                  }
                }

                const targetPath = SIDEBAR_ROUTES[item.id] || SIDEBAR_ROUTES[item.label];
                if (targetPath) {
                  router.push(targetPath);
                }
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all group relative cursor-pointer ${
                isActive
                  ? isLight
                    ? "bg-[#EEF2FF] text-[#4F46E5] border-r-4 border-[#4F46E5] shadow-sm shadow-[#4F46E5]/10"
                    : "bg-gradient-to-r from-blue-600/30 to-purple-600/20 border border-blue-500/60 text-white shadow-lg shadow-blue-500/10"
                  : isLight
                    ? "text-slate-600 hover:text-[#0F172A] hover:bg-slate-50"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon
                size={16}
                className={`shrink-0 transition-transform group-hover:scale-110 ${
                  isActive
                    ? isLight ? "text-[#4F46E5]" : "text-cyan-400"
                    : isLight ? "text-slate-500 group-hover:text-slate-800" : "text-slate-400 group-hover:text-cyan-300"
                }`}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {isLocked ? (
                <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-black border border-purple-500/30 shrink-0">
                  <Lock size={10} className="text-purple-300" /> Pro
                </span>
              ) : (
                isActive && !collapsed && (
                  <span className={`w-1.5 h-1.5 rounded-full ml-auto animate-pulse ${
                    isLight ? "bg-[#4F46E5]" : "bg-cyan-400"
                  }`} />
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Controls & User Profile Widget */}
      <div className={`p-2 border-t space-y-2 ${
        isLight ? "border-slate-100 bg-[#F8FAFC]" : "border-white/10 bg-[#060609]"
      }`}>
        {!collapsed && (
          <>
            {/* Live Subscription Status Widget */}
            {!isPro ? (
              <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                isLight
                  ? "bg-[#EEF2FF]/60 border-purple-100"
                  : "glass-panel border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-blue-950/15"
              }`}>
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black flex items-center gap-1 ${
                    isLight ? "text-[#0F172A]" : "text-white"
                  }`}>
                    {isBasic ? `⚡ Basic (${subscription?.subscription?.daysRemaining ?? 0}d)` : "⚡ Codexa Plans"}
                  </span>
                  <button
                    onClick={() => router.push(isBasic ? "/plans/duration?plan=pro" : "/plans")}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all cursor-pointer shadow-md shrink-0"
                  >
                    {isBasic ? "Upgrade Pro" : "Subscribe"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-300 flex items-center gap-1">
                  👑 Pro Member
                </span>
                <span className="text-[9px] font-mono text-slate-400 font-bold">
                  {subscription?.subscription?.daysRemaining !== undefined ? `${subscription.subscription.daysRemaining}d left` : "Active"}
                </span>
              </div>
            )}

            {/* Sidebar Profile Widget */}
            {activeProfile && (
              <div className={`p-2 rounded-xl border flex flex-col gap-1.5 ${
                isLight ? "bg-white border-slate-200" : "glass-panel border-white/10 bg-white/5"
              }`}>
                <div className="flex items-center gap-2">
                  {activeProfile.image ? (
                    <img
                      src={activeProfile.image}
                      alt={activeProfile.name || "User"}
                      className="w-6 h-6 rounded-full border border-slate-200/50 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-[9px] border border-white/20 shrink-0">
                      {(activeProfile.name || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 leading-none">
                    <div className={`text-[11px] font-extrabold truncate ${isLight ? "text-[#0F172A]" : "text-white"}`}>
                      {activeProfile.name || "Student"}
                    </div>
                    <div className={`text-[9px] font-mono font-bold mt-0.5 ${isLight ? "text-[#4F46E5]" : "text-cyan-400"}`}>
                      Level {activeProfile.level ?? 0}
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                {(() => {
                  const currentProgressXp = (activeProfile as any)?.levelProgressXp !== undefined ? (activeProfile as any).levelProgressXp : (activeProfile?.xp ?? 0);
                  const targetXp = activeProfile?.targetXp || 1000;
                  const progressPct = Math.min(100, Math.round((currentProgressXp / targetXp) * 100));

                  return (
                    <div className="flex items-center gap-1.5" title={`Lifetime Cumulative XP: ${activeProfile.xp ?? 0}`}>
                      <div className={`flex-1 h-1 rounded-full overflow-hidden ${
                        isLight ? "bg-slate-100" : "bg-white/10"
                      }`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLight ? "bg-gradient-to-r from-blue-500 to-[#4F46E5]" : "bg-gradient-to-r from-blue-500 to-cyan-400"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className={`text-[8px] font-mono font-bold shrink-0 ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {currentProgressXp}/{targetXp} XP
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        <button
          onClick={handleUserLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all text-left cursor-pointer"
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-center p-1.5 rounded-xl transition-all border ${
            isLight
              ? "text-slate-500 hover:text-[#0F172A] border-slate-200 bg-white"
              : "text-slate-400 hover:text-white border-white/10 bg-[#060609]"
          }`}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>

    {/* Shared Mobile Slide-Over Navigation Drawer (< 768px) */}
    <MobileNavigationDrawer
      isOpen={isMobileDrawerOpen}
      onClose={closeMobileDrawer}
      activeTab={activeTab}
      onTabChange={(tab) => {
        if (typeof onTabChange === "function") onTabChange(tab);
        if (typeof onChange === "function") onChange(tab);
      }}
      userProfile={activeProfile || undefined}
      subscription={subscription}
      isPro={isPro}
    />

    {/* Mobile Bottom Navigation Bar (< 768px) */}
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090B]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.5)] select-none"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => {
            closeMobileDrawer();
            router.push("/dashboard");
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            pathname === "/dashboard" ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard size={18} className={pathname === "/dashboard" ? "text-cyan-400" : "text-slate-400"} />
          <span className="text-[10px] mt-1 font-semibold">Dashboard</span>
        </button>

        {/* 2. Courses */}
        <button
          type="button"
          onClick={() => {
            closeMobileDrawer();
            router.push("/courses");
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            pathname?.startsWith("/courses") ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen size={18} className={pathname?.startsWith("/courses") ? "text-cyan-400" : "text-slate-400"} />
          <span className="text-[10px] mt-1 font-semibold">Courses</span>
        </button>

        {/* 3. AI Mentor */}
        <button
          type="button"
          onClick={() => {
            closeMobileDrawer();
            router.push("/codexai");
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            pathname?.startsWith("/codexai") || pathname?.startsWith("/codeai") ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot size={18} className={pathname?.startsWith("/codexai") || pathname?.startsWith("/codeai") ? "text-cyan-400" : "text-slate-400"} />
          <span className="text-[10px] mt-1 font-semibold">AI Mentor</span>
        </button>

        {/* 4. Menu & Profile */}
        <button
          type="button"
          onClick={() => {
            if (isMobileDrawerOpen) {
              closeMobileDrawer();
            } else {
              openMobileDrawer();
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
            isMobileDrawerOpen ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {activeProfile?.image ? (
            <img
              src={activeProfile.image}
              alt="Profile"
              className={`w-5 h-5 rounded-full object-cover border ${
                isMobileDrawerOpen ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-slate-500"
              }`}
            />
          ) : (
            <div
              className={`w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white text-[9px] font-black flex items-center justify-center ${
                isMobileDrawerOpen ? "ring-2 ring-cyan-400/40" : ""
              }`}
            >
              {(activeProfile?.name || "S").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[10px] mt-1 font-semibold">Menu</span>
        </button>
      </div>
    </nav>
  </>
  );
}
