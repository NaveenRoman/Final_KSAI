"use client";

import React from "react";
import Link from "next/link";
import { Briefcase, ArrowRight, CheckCircle2, Clock, Award, Building2 } from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface PlacementOverviewWidgetProps {
  placement: SuperAdminDashboardData["placementOverview"];
}

export function PlacementOverviewWidget({ placement }: PlacementOverviewWidgetProps) {
  if (!placement.hasData) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Placement Overview
              </h3>
              <p className="text-[11px] text-slate-500">
                Platform-wide industry readiness
              </p>
            </div>
          </div>
        </div>

        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
            <Briefcase size={18} />
          </div>
          <div className="text-xs font-bold text-slate-800">No placement drives recorded yet</div>
          <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">
            Placement readiness metrics will appear as colleges schedule campus recruitment cohorts.
          </p>
        </div>
      </div>
    );
  }

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - placement.placementRate / 100);

  const breakdownMetrics = [
    {
      label: "Placed Students",
      count: placement.placedCount,
      percentage: placement.totalEligible > 0 ? Math.round((placement.placedCount / placement.totalEligible) * 100) : 0,
      color: "bg-emerald-600",
    },
    {
      label: "In Active Evaluation",
      count: placement.inProcessCount,
      percentage: placement.totalEligible > 0 ? Math.round((placement.inProcessCount / placement.totalEligible) * 100) : 0,
      color: "bg-blue-600",
    },
    {
      label: "Preparation Phase",
      count: placement.preparingCount,
      percentage: placement.totalEligible > 0 ? Math.round((placement.preparingCount / placement.totalEligible) * 100) : 0,
      color: "bg-amber-500",
    },
    {
      label: "Awaiting Criteria",
      count: placement.notEligibleCount,
      percentage: placement.totalEligible > 0 ? Math.round((placement.notEligibleCount / placement.totalEligible) * 100) : 0,
      color: "bg-slate-400",
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Briefcase size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Placement Readiness
              </h3>
              {placement.isVerified === false && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  Data Pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {placement.batchYear} · {placement.isVerified === false ? "0 Verified Offers (Records Pending)" : `${placement.totalEligible} Eligible Candidates`}
            </p>
          </div>
        </div>
        <Link
          href="/admin/analytics"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>Deep Dive</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Radial Donut + Real Progress Metrics */}
      <div className="flex flex-col sm:flex-row items-center gap-6 py-1">
        {/* Radial Meter */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={placement.isVerified === false ? "#CBD5E1" : "#10B981"}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={placement.isVerified === false ? circumference : strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {placement.isVerified === false ? (
                <span className="text-amber-600 text-lg sm:text-xl font-bold">0 Offers</span>
              ) : (
                `${placement.placementRate}%`
              )}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              {placement.isVerified === false ? "Data Pending" : "Placed Ratio"}
            </span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 w-full space-y-2.5">
          {breakdownMetrics.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600">{m.label}</span>
                <span className="font-bold text-slate-900">
                  {m.count} ({m.percentage}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${m.color}`}
                  style={{ width: `${m.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Stats */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {placement.isVerified === false ? "Projected Top Offer" : "Highest Package"}
            </span>
            {placement.isVerified === false && (
              <span className="text-[8px] uppercase font-bold px-1 rounded bg-amber-100 text-amber-700">Projected</span>
            )}
          </div>
          <div className="text-sm font-black text-emerald-600 mt-0.5">
            ₹{placement.isVerified === false ? (placement.targetHighestPackage ?? 12.5) : placement.highestPackage} LPA
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {placement.isVerified === false ? "Projected Avg Offer" : "Average Package"}
            </span>
            {placement.isVerified === false && (
              <span className="text-[8px] uppercase font-bold px-1 rounded bg-amber-100 text-amber-700">Projected</span>
            )}
          </div>
          <div className="text-sm font-black text-slate-800 mt-0.5">
            ₹{placement.isVerified === false ? (placement.targetAveragePackage ?? 4.6) : placement.averagePackage} LPA
          </div>
        </div>
      </div>
    </div>
  );
}
