"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  Bot,
  Briefcase,
  BarChart3,
  CreditCard,
  Award,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Trophy,
  Code2,
  PlusCircle,
  ExternalLink,
} from "lucide-react";

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavSubItem {
  label: string;
  href: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  subItems?: NavSubItem[];
}

export function AdminSidebar({
  isMobileOpen = false,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<Record<string, boolean>>({
    colleges: true,
    courses: true,
  });

  const toggleSubmenu = (key: string) => {
    setOpenSubmenu((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navGroups = [
    {
      name: "PLATFORM",
      items: [
        {
          id: "dashboard",
          label: "Overview",
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          id: "users",
          label: "Users",
          href: "/admin/users",
          icon: Users,
        },
        {
          id: "colleges",
          label: "Colleges",
          href: "/admin/colleges",
          icon: Building2,
          subItems: [
            { label: "All Colleges", href: "/admin/colleges" },
            { label: "Add College", href: "/admin/colleges?action=create" },
          ],
        },
        {
          id: "courses",
          label: "Courses",
          href: "/admin/courses",
          icon: BookOpen,
          subItems: [
            { label: "All Courses", href: "/admin/courses" },
            { label: "Contests", href: "/admin/contests" },
            { label: "Submissions", href: "/admin/submissions" },
            { label: "Leaderboard", href: "/admin/leaderboard" },
          ],
        },
      ],
    },
    {
      name: "AI & INTELLIGENCE",
      items: [
        {
          id: "ai",
          label: "AI Usage & Performance",
          href: "/admin/ai",
          icon: Bot,
        },
        {
          id: "interview",
          label: "AI Interviews",
          href: "/interview",
          icon: Briefcase,
        },
      ],
    },
    {
      name: "BUSINESS",
      items: [
        {
          id: "subscriptions",
          label: "Subscriptions & Revenue",
          href: "/admin/subscriptions",
          icon: CreditCard,
        },
        {
          id: "analytics",
          label: "Analytics",
          href: "/admin/analytics",
          icon: BarChart3,
        },
      ],
    },
    {
      name: "SYSTEM",
      items: [
        {
          id: "certificates",
          label: "Certificates",
          href: "/admin/certificates",
          icon: Award,
        },
        {
          id: "notifications",
          label: "Notifications",
          href: "/admin/notifications",
          icon: Bell,
        },
        {
          id: "settings",
          label: "System Settings",
          href: "/admin/settings",
          icon: Settings,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#080C16] border-r border-white/10 text-[#CBD5E1] select-none">
      {/* Top Branding */}
      <div>
        <div className="h-18 px-4 flex items-center justify-between border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-3 group overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center p-1.5 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="KnowledgeStream AI"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to brain icon if image is missing
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-200">
                <div className="font-extrabold text-[#F8FAFC] text-base tracking-tight leading-tight group-hover:text-blue-400 transition-colors truncate">
                  KnowledgeStream AI
                </div>
                <div className="text-[10px] font-semibold text-[#CBD5E1] truncate tracking-wide">
                  AI Powered Learning Ecosystem
                </div>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}

          {/* Mobile close button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation items list grouped */}
        <nav className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-14rem)] custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={group.name} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                  {group.name}
                </div>
              ) : groupIdx > 0 ? (
                <div className="my-2 border-t border-white/10 mx-2" />
              ) : null}

              {group.items.map((item) => {
                const Icon = item.icon;
                const hasSub = Boolean(item.subItems && item.subItems.length > 0);
                const isSubOpen = openSubmenu[item.id] ?? false;

                const isExactActive = pathname === item.href;
                const isSubActive = Boolean(
                  item.subItems?.some((sub) => pathname === sub.href || (sub.href !== "/admin" && pathname.startsWith(sub.href)))
                );
                const isActive = isExactActive || isSubActive;

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (onMobileClose && window.innerWidth < 1024) {
                            onMobileClose();
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? "bg-blue-600 text-[#F8FAFC] font-bold shadow-md shadow-blue-600/30"
                            : "text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5"
                        } ${isCollapsed ? "justify-center px-2" : ""}`}
                      >
                        <Icon
                          size={18}
                          className={`shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? "text-[#F8FAFC]" : "text-[#94A3B8] group-hover:text-blue-400"
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>

                      {hasSub && !isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSubmenu(item.id);
                          }}
                          className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors ml-1"
                          title="Toggle submenu"
                        >
                          {isSubOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>

                    {/* Submenu items */}
                    {hasSub && !isCollapsed && isSubOpen && (
                      <div className="pl-9 pr-2 py-1 space-y-1 border-l border-white/10 ml-5 my-0.5">
                        {item.subItems!.map((sub) => {
                          const isSubItemActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => {
                                if (onMobileClose && window.innerWidth < 1024) {
                                  onMobileClose();
                                }
                              }}
                              className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                isSubItemActive
                                  ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30"
                                  : "text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Branding & Tagline */}
      <div className="p-3 border-t border-white/10 bg-[#060912]/90">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-[#172033] border border-white/10 shadow-inner">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Sparkles size={12} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-[#F8FAFC] leading-none truncate">KnowledgeStream AI</div>
                <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">v1.0.0</div>
              </div>
            </div>
            <p className="text-[10px] text-[#CBD5E1] italic leading-tight">
              &quot;Teach to Code. Not to Copy.&quot;
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center" title="Teach to Code. Not to Copy.">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-1">
              <Sparkles size={14} />
            </div>
            <span className="text-[9px] text-[#94A3B8] font-mono">v1.0.0</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside
        className={`hidden lg:block fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide in) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
