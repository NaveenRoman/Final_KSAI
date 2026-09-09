"use client";

import React from "react";
import Link from "next/link";
import { Trophy, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface TopPerformingBranchesProps {
  branches: SuperAdminDashboardData["topPerformingBranches"];
}

export function TopPerformingBranches({ branches }: TopPerformingBranchesProps) {
  const assessedBranches = branches.filter((b) => b.hasData && b.score > 0);
  const pendingBranches = branches.filter((b) => !b.hasData || b.score === 0);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Trophy size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Department Performance
            </h3>
            <p className="text-[11px] text-slate-500">
              Actual cohort evaluations &amp; class averages
            </p>
          </div>
        </div>
        <Link
          href="/admin/analytics"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Evaluated Branches List */}
      <div className="space-y-3">
        {assessedBranches.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No class evaluations recorded yet across departments.
          </div>
        ) : (
          assessedBranches.map((b) => (
            <div key={b.code} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{b.name}</span>
                  {b.studentsCount > 0 && (
                    <span className="text-[10px] text-slate-500 font-normal ml-2">
                      ({b.studentsCount.toLocaleString()} enrolled)
                    </span>
                  )}
                </div>
                <span className="font-black text-emerald-600 text-sm">{b.score}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${b.score}%`,
                    backgroundColor: b.color,
                  }}
                />
              </div>
            </div>
          ))
        )}

        {/* Other departments status */}
        {pendingBranches.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-bold text-slate-700">Other Registered Departments:</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {pendingBranches.slice(0, 5).map((pb) => (
                <span
                  key={pb.code}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold text-[10px]"
                >
                  {pb.code}: Awaiting evaluations
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Verified academic classes</span>
        <span className="text-slate-600 font-semibold">Real scorecards</span>
      </div>
    </div>
  );
}
