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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { handleUserLogout } from "@/lib/auth-logout";

interface LeftSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onChange?: (tab: string) => void;
  userProfile?: {
    name?: string;
    role?: string;
    level?: number;
    xp?: number;
    targetXp?: number;
    image?: string | null;
    [key: string]: any;
  };
  isLight?: boolean;
  fullHeight?: boolean;
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
}: LeftSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Payment Flow state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");

  const [isProState, setIsProState] = useState<boolean | null>(null);
  const [hasResumeUnlocked, setHasResumeUnlocked] = useState(true);

  useEffect(() => {
    const isProSession = sessionStorage.getItem("is_pro") === "true";
    if (isProSession) {
      setIsProState(true);
    }
  }, []);

  useEffect(() => {
    setHasResumeUnlocked(true);
  }, []);

  const [localProfile, setLocalProfile] = useState<{
    name: string;
    role: string;
    level: number;
    xp: number;
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
    targetXp: 1000,
    image: session.user.image,
  } : null);

  const userRole = activeProfile?.role ?? "Student";
  const isPro = isProState !== null ? isProState : (userRole !== "Student");

  return (
    <aside
      className={`flex flex-col justify-between transition-all duration-300 z-30 select-none border-r ${
        isLight 
          ? "bg-white border-slate-200/80 text-slate-700" 
          : "dark-sidebar bg-[#09090B]/90 border-white/10 backdrop-blur-xl text-white"
      } ${
        fullHeight 
          ? "h-screen sticky top-0" 
          : "h-[calc(100vh-4rem)] sticky top-16"
      } ${
        collapsed ? "w-16" : "w-64"
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

          const isLocked = item.id === "Resume Builder" && !hasResumeUnlocked;

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
                <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/40 shrink-0">
                  <Lock size={10} className="text-amber-400" /> ₹1
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
            {/* Upgrade to Pro Card */}
            {!isPro && (
              <div className={`p-2 rounded-xl border flex flex-col gap-1 text-center ${
                isLight 
                  ? "bg-[#EEF2FF]/60 border-purple-100" 
                  : "glass-panel border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-blue-950/15"
              }`}>
                <div className="flex items-center justify-between w-full gap-1">
                  <span className={`text-[10px] font-black flex items-center gap-1 shrink-0 ${
                    isLight ? "text-[#0F172A]" : "text-white"
                  }`}>
                    👑 Pro Upgrade
                  </span>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all cursor-pointer shadow-md shrink-0"
                  >
                    Upgrade Now
                  </button>
                </div>
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
                <div className="flex items-center gap-1.5">
                  <div className={`flex-1 h-1 rounded-full overflow-hidden ${
                    isLight ? "bg-slate-100" : "bg-white/10"
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLight ? "bg-gradient-to-r from-blue-500 to-[#4F46E5]" : "bg-gradient-to-r from-blue-500 to-cyan-400"
                      }`}
                      style={{ width: `${Math.min(100, (((activeProfile.xp ?? 0) / (activeProfile.targetXp || 1000))) * 100)}%` }}
                    />
                  </div>
                  <div className={`text-[8px] font-mono font-bold shrink-0 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    {activeProfile.xp ?? 0}/{activeProfile.targetXp ?? 1000} XP
                  </div>
                </div>
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

      {/* Razorpay-style Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="bg-[#1E293B] p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                  KS
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">KnowledgeStream AI</h3>
                  <p className="text-[9px] text-slate-400 font-bold">Pro Developer Plan</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-bold">Amount to Pay</p>
                <p className="text-xs font-black text-emerald-400">₹499.00</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    paymentMethod === "card"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Card Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    paymentMethod === "upi"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  UPI Payment
                </button>
              </div>

              {paymentMethod === "card" ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CVV</label>
                      <input
                        type="password"
                        placeholder="***"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">UPI ID</label>
                    <input
                      type="text"
                      placeholder="dhanalaxmi@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 bg-[#1E293B] flex items-center justify-between gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  sessionStorage.setItem("is_pro", "true");
                  setIsProState(true);
                  setShowSuccessModal(true);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-[#09090B] border border-white/10 rounded-2xl p-5 text-center space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl mx-auto">
              ✅
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">Payment Successful</h3>
              <p className="text-xs text-slate-400 font-bold">You are now a Pro member! 🎉</p>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Locked features (Resume Builder &amp; Interview Prep) have been unlocked successfully for your account.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
