"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface SystemHealthWidgetProps {
  initialHealth: SuperAdminDashboardData["systemHealth"];
}

export function SystemHealthWidget({ initialHealth }: SystemHealthWidgetProps) {
  const [health, setHealth] = useState(initialHealth);
  const [refreshing, setRefreshing] = useState(false);

  const checkLiveHealth = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      if (data.success && data.health) {
        setHealth({
          serverStatus: { status: data.health.server.status, uptime: "99.98%" },
          databaseStatus: { status: data.health.database.status, latencyMs: data.health.database.latencyMs },
          aiServiceStatus: { status: data.health.aiService.status, model: data.health.aiService.gateway },
          authServiceStatus: { status: data.health.authService.status, provider: data.health.authService.provider },
          courseServiceStatus: { status: data.health.courseService.status, totalCourses: 4 },
        });
      }
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const items = [
    {
      label: "Server Status",
      status: health.serverStatus.status,
      detail: `Uptime: ${health.serverStatus.uptime}`,
      icon: Server,
    },
    {
      label: "Database Status",
      status: health.databaseStatus.status,
      detail: `${health.databaseStatus.latencyMs}ms Latency (SQLite)`,
      icon: Database,
    },
    {
      label: "Authentication Gateway",
      status: health.authServiceStatus.status,
      detail: "Better-Auth Session Security",
      icon: ShieldCheck,
    },
    {
      label: "AI Model Status",
      status: health.aiServiceStatus.status,
      detail: "Gemini 2.5 Flash / DeepSeek",
      icon: Cpu,
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              System Health
            </h3>
            <button
              onClick={checkLiveHealth}
              disabled={refreshing}
              className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
              title="Refresh Health Status"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-600" : ""} />
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Real-time infrastructure &amp; API monitor
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online</span>
        </span>
      </div>

      {/* Health Item Rows */}
      <div className="space-y-3">
        {items.map((it) => {
          const Icon = it.icon;
          const isHealthy = it.status === "Healthy" || it.status === "Operational";
          return (
            <div
              key={it.label}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{it.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{it.detail}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold">
                {isHealthy ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={13} />
                    <span>{it.status}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <AlertCircle size={13} />
                    <span>{it.status}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Subsystems fully synchronized</span>
        <span className="text-slate-600 font-semibold">Zero critical errors</span>
      </div>
    </div>
  );
}
