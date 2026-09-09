import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { getSuperAdminDashboardData } from "@/lib/admin/admin-service";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { BarChart3, TrendingUp, Users, CheckCircle2, Award, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const admin = await requireAdminPage();
  const data = await getSuperAdminDashboardData("30d");

  return (
    <AdminPageLayout
      title="Platform-Wide Analytics & Intelligence"
      subtitle="Deep pedagogical metrics, curriculum completion benchmarks, and learning curve diagnostics"
      adminUser={admin}
    >
      {/* 4 Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Placement Rate</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{data.placementOverview.placementRate}%</div>
          <span className="text-[10px] text-slate-400">{data.placementOverview.placedCount} Candidates Placed</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Highest Package</span>
          <div className="text-3xl font-black text-blue-600 mt-1">₹{data.placementOverview.highestPackage} LPA</div>
          <span className="text-[10px] text-slate-400">Campus top offer</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Package</span>
          <div className="text-3xl font-black text-purple-600 mt-1">₹{data.placementOverview.averagePackage} LPA</div>
          <span className="text-[10px] text-slate-400">Verified placement batch</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Cohorts</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{data.topPerformingBranches.length} Branches</div>
          <span className="text-[10px] text-emerald-600 font-bold">100% Tracking</span>
        </div>
      </div>

      {/* Branch Performance Comparison */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-600" />
          Branch &amp; Department Performance Distribution
        </h3>

        <div className="space-y-4 pt-2">
          {data.topPerformingBranches.map((b) => (
            <div key={b.code} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <strong className="text-sm font-bold text-slate-900">{b.name}</strong>
                  <span className="text-slate-400 ml-2">({b.studentsCount} Students)</span>
                </div>
                <span className="text-sm font-black text-slate-900">{b.score}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${b.score}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPageLayout>
  );
}
