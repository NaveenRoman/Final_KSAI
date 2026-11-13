"use client";

import React from "react";
import { UserPlus, BookCheck, Sparkles, Terminal, Award, Clock } from "lucide-react";
import { TodayStats } from "@/lib/admin/admin-service";

interface TodayAtKSAIProps {
  stats: TodayStats;
}

export function TodayAtKSAI({ stats }: TodayAtKSAIProps) {
  const items = [
    {
      id: "students",
      label: "New Students",
      value: stats.newStudentsToday,
      sublabel: "Registered today",
      icon: UserPlus,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    },
    {
      id: "lessons",
      label: "Lessons Completed",
      value: stats.lessonsCompletedToday,
      sublabel: "Chapters completed",
      icon: BookCheck,
      color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    },
    {
      id: "ai",
      label: "AI Interactions",
      value: stats.aiInteractionsToday,
      sublabel: "Voice dictations & prompts",
      icon: Sparkles,
      color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    },
    {
      id: "code",
      label: "Code Executions",
      value: stats.codeExecutionsToday,
      sublabel: "Editor runs & challenges",
      icon: Terminal,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    },
    {
      id: "certs",
      label: "Certificates Issued",
      value: stats.certificatesIssuedToday,
      sublabel: "100% course completions",
      icon: Award,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl ks-card border border-[var(--border-subtle)] shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase text-[var(--text-primary)]">
            Today at KnowledgeStream AI
          </h3>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            — Real-time Activity Summary
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Clock size={13} className="text-[var(--text-muted)]" />
          <span>Live telemetry synced</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.id}
              className="p-3 rounded-xl ks-card-elevated border border-[var(--border-subtle)] hover:border-[var(--brand-cyan)] transition-all flex items-center gap-3 shadow-inner"
            >
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${it.color}`}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block truncate">
                  {it.label}
                </span>
                <div className="text-lg sm:text-xl font-black text-[var(--text-primary)] leading-tight mt-0.5">
                  {it.value.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] truncate block mt-0.5">
                  {it.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
