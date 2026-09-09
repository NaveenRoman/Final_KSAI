"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { ActionableAlert } from "@/lib/admin/admin-service";

interface ImportantAlertsBannerProps {
  alerts?: ActionableAlert[];
}

export function ImportantAlertsBanner({ alerts = [] }: ImportantAlertsBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});

  const activeAlerts = alerts.filter((a) => !dismissedIds[a.id]);

  if (activeAlerts.length === 0) return null;

  const dismissAlert = (id: string) => {
    setDismissedIds((prev) => ({ ...prev, [id]: true }));
  };

  // Sort critical first, then warning, then info
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  // Display top priority alert (or can display top 1 or 2)
  const primaryAlert = sortedAlerts[0];

  const config = {
    critical: {
      bg: "bg-gradient-to-r from-rose-500/10 via-rose-50 to-red-50/60 border-rose-200",
      iconBg: "bg-rose-100 text-rose-700 border-rose-200",
      badge: "bg-rose-600 text-white",
      badgeText: "🔴 Critical",
      button: "bg-rose-600 hover:bg-rose-700 text-white",
      Icon: AlertCircle,
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 border-amber-200",
      iconBg: "bg-amber-100 text-amber-700 border-amber-200",
      badge: "bg-amber-600 text-white",
      badgeText: "🟠 Warning",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
      Icon: AlertTriangle,
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500/10 via-blue-50 to-indigo-50/50 border-blue-200",
      iconBg: "bg-blue-100 text-blue-700 border-blue-200",
      badge: "bg-blue-600 text-white",
      badgeText: "🔵 Platform Notice",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
      Icon: Info,
    },
  }[primaryAlert.level];

  const IconComponent = config.Icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all ${config.bg}`}
    >
      <div className="flex items-start sm:items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${config.iconBg}`}
        >
          <IconComponent size={18} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <span>{primaryAlert.title}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs ${config.badge}`}
            >
              {config.badgeText}
            </span>
            {sortedAlerts.length > 1 && (
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                (+{sortedAlerts.length - 1} more notice{sortedAlerts.length > 2 ? "s" : ""})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5 max-w-3xl">
            {primaryAlert.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <Link
          href={primaryAlert.actionHref}
          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${config.button}`}
        >
          <span>{primaryAlert.actionText}</span>
          <ArrowRight size={12} />
        </Link>
        <button
          onClick={() => dismissAlert(primaryAlert.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          title="Dismiss Alert"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
