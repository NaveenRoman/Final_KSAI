"use client";

import React from "react";
import Link from "next/link";
import {
  Flame,
  AlertTriangle,
  TrendingUp,
  Bot,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface AIActivityInsightsProps {
  insights: SuperAdminDashboardData["aiActivityInsights"];
}

export function AIActivityInsights({ insights }: AIActivityInsightsProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              AI Activity Insights
            </h3>
            <p className="text-[11px] text-slate-500">
              Real learning patterns &amp; concept bottlenecks
            </p>
          </div>
        </div>
        <Link
          href="/admin/ai"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Insight Items */}
      <div className="space-y-3">
        {/* Most Studied Topics */}
        <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700 uppercase tracking-wider">
            <Flame size={13} className="text-orange-500 fill-orange-500" />
            <span>Most Asked Topics</span>
          </div>
          {insights.mostAskedTopics.length > 0 && insights.mostAskedTopics[0].count > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {insights.mostAskedTopics.map((t) => (
                <span
                  key={t.topic}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-orange-200 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[170px]">{t.topic}</span>
                  <span className="text-[10px] text-orange-600 font-bold font-mono">
                    ({t.count})
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No topics tracked yet</p>
          )}
        </div>

        {/* Weak Learning Concepts */}
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            <AlertTriangle size={13} className="text-amber-500" />
            <span>Weak Concepts</span>
          </div>
          {insights.weakConcepts.length > 0 && insights.weakConcepts[0].concept !== "Zero concept struggle flags" ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {insights.weakConcepts.map((w) => (
                <span
                  key={w.concept}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[170px]">{w.concept}</span>
                  <span className="text-[10px] font-bold text-amber-600">
                    {w.struggleRate}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 font-medium">Zero concept struggle flags · All concepts mastered</p>
          )}
        </div>

        {/* Trending Skills */}
        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            <TrendingUp size={13} className="text-emerald-500" />
            <span>Trending Skills</span>
          </div>
          {insights.trendingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {insights.trendingSkills.map((s) => (
                <span
                  key={s.skill}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[170px]">{s.skill}</span>
                  <span className="text-[10px] font-bold text-emerald-600 font-mono">
                    {s.growth}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No course skills available yet</p>
          )}
        </div>

        {/* Most Used AI Features */}
        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            <Bot size={13} className="text-blue-500" />
            <span>Most Used AI Features</span>
          </div>
          {insights.mostUsedFeatures.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {insights.mostUsedFeatures.map((f) => (
                <span
                  key={f.feature}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[170px]">{f.feature}</span>
                  <span className="text-[10px] font-bold text-blue-600 font-mono">
                    {f.usageRate}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No feature telemetry tracked yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
