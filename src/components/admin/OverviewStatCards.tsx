"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Cpu,
  Coins,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface OverviewStatCardsProps {
  stats: SuperAdminDashboardData["overviewStats"];
}

export function OverviewStatCards({ stats }: OverviewStatCardsProps) {
  const cards = [
    {
      id: "users",
      title: stats.totalUsers.label,
      value: stats.totalUsers.value.toLocaleString("en-IN"),
      trend: stats.totalUsers.trend,
      subLabel: stats.totalUsers.subInfo,
      icon: Users,
      href: stats.totalUsers.href,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accent: "hover:border-indigo-300",
    },
    {
      id: "activeUsers",
      title: stats.activeUsers.label,
      value: stats.activeUsers.value.toLocaleString("en-IN"),
      trend: stats.activeUsers.trend,
      subLabel: stats.activeUsers.subInfo,
      icon: UserCheck,
      href: stats.activeUsers.href,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "hover:border-emerald-300",
      isLive: true,
    },
    {
      id: "colleges",
      title: stats.totalColleges.label,
      value: stats.totalColleges.value.toLocaleString("en-IN"),
      trend: stats.totalColleges.trend,
      subLabel: stats.totalColleges.subInfo,
      icon: GraduationCap,
      href: stats.totalColleges.href,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "hover:border-blue-300",
    },
    {
      id: "courses",
      title: stats.activeCourses.label,
      value: stats.activeCourses.value.toLocaleString("en-IN"),
      trend: stats.activeCourses.trend,
      subLabel: stats.activeCourses.subInfo,
      icon: BookOpen,
      href: stats.activeCourses.href,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      accent: "hover:border-purple-300",
    },
    {
      id: "aiSessions",
      title: stats.aiSessions.label,
      value: stats.aiSessions.value.toLocaleString("en-IN"),
      trend: stats.aiSessions.trend,
      subLabel: stats.aiSessions.subInfo,
      icon: Cpu,
      href: stats.aiSessions.href,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      accent: "hover:border-teal-300",
    },
    {
      id: "revenue",
      title: stats.totalRevenue.label,
      value: stats.totalRevenue.formatted,
      trend: stats.totalRevenue.trend,
      subLabel: stats.totalRevenue.subInfo,
      icon: Coins,
      href: stats.totalRevenue.href,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      accent: "hover:border-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.id}
            href={c.href}
            className={`group p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer ${c.accent}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold group-hover:scale-105 transition-transform ${c.color}`}
                >
                  <Icon size={18} />
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-slate-300 group-hover:text-slate-600 transition-colors"
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                {c.title}
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {c.value}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                {c.subLabel}
              </span>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-medium">
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  c.isLive
                    ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                    : c.trend === "No comparison data yet"
                    ? "text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"
                    : "text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
                }`}
              >
                {c.isLive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <TrendingUp size={10} />
                )}
                <span>{c.trend}</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
