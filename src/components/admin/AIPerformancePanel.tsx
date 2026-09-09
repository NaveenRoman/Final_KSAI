"use client";

import React from "react";
import Link from "next/link";
import {
  Timer,
  Bot,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Activity,
  Zap,
  Info,
} from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface AIPerformancePanelProps {
  performance: SuperAdminDashboardData["aiPerformance"];
}

export function AIPerformancePanel({ performance }: AIPerformancePanelProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              AI Performance &amp; Telemetry
            </h3>
            <span
              className={`w-2 h-2 rounded-full ${
                performance.isGeminiActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Model gateway speed &amp; execution metrics
          </p>
        </div>
        <Link
          href="/admin/ai"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
        >
          <span>View Telemetry</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Honest AI Metrics */}
      <div className="space-y-2.5">
        {/* Metric 1: Avg Response Time */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Timer size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Avg Response Time
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {performance.avgResponseTime}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {performance.gatewayStatus}
          </span>
        </div>

        {/* Metric 2: Total AI Requests */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Activity size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total AI Requests
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {performance.totalRequests.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {performance.aiSessionsToday} today
          </span>
        </div>

        {/* Metric 3: Model & Gateway Status */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Primary AI Model
              </span>
              <div className="text-sm font-black text-purple-700 leading-tight truncate">
                {performance.primaryModel}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              performance.isGeminiActive
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-amber-700 bg-amber-50 border-amber-200"
            }`}
          >
            {performance.isGeminiActive ? <ShieldCheck size={11} /> : <AlertCircle size={11} />}
            <span>{performance.geminiStatus}</span>
          </span>
        </div>

        {/* Metric 4: Most Used Feature & Error Rate */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9px] font-bold uppercase text-slate-400 block">
              Most Used Feature
            </span>
            <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {performance.mostUsedFeature}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[9px] font-bold uppercase text-slate-400 block">
              AI Error Rate
            </span>
            <div className="text-xs font-bold text-emerald-600 truncate mt-0.5">
              {performance.errorRate}
            </div>
          </div>
        </div>
      </div>

      {/* Honest Token Usage Notice */}
      <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
        <span className="leading-tight">
          {performance.tokenUsageMessage}
        </span>
      </div>
    </div>
  );
}
