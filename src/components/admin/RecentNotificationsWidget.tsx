"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Trophy,
  Activity,
  Shield,
  Zap,
} from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface RecentNotificationsWidgetProps {
  notifications: SuperAdminDashboardData["recentNotifications"];
  liveActivity: SuperAdminDashboardData["liveActivity"];
}

export function RecentNotificationsWidget({
  notifications,
  liveActivity,
}: RecentNotificationsWidgetProps) {
  const [tab, setTab] = useState<"notifications" | "live">("notifications");

  const getIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen size={14} className="text-blue-600" />;
      case "college":
        return <GraduationCap size={14} className="text-emerald-600" />;
      case "placement":
        return <Trophy size={14} className="text-amber-500" />;
      default:
        return <Bell size={14} className="text-purple-600" />;
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setTab("notifications")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              tab === "notifications"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setTab("live")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tab === "live"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Feed</span>
          </button>
        </div>

        <Link
          href="/admin/notifications"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Content Area */}
      {tab === "notifications" ? (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link}
              className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 flex items-start gap-3 transition-colors group block"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                {getIcon(n.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {n.message}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {n.timeAgo}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {liveActivity.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <div className="truncate">
                  <strong className="text-slate-900">{act.user}</strong>{" "}
                  <span className="text-slate-500">{act.action}</span>{" "}
                  <span className="font-semibold text-slate-700">{act.target}</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-mono pl-2">
                {act.timeAgo}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Instant platform broadcast</span>
        <Link href="/admin/notifications?action=compose" className="text-blue-600 font-bold hover:underline">
          Broadcast Alert →
        </Link>
      </div>
    </div>
  );
}
