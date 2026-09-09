"use client";

import React from "react";
import { Users } from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface UserDistributionDonutProps {
  distribution: SuperAdminDashboardData["userDistribution"];
}

export function UserDistributionDonut({ distribution }: UserDistributionDonutProps) {
  const { totalUsers, roles } = distribution;

  // Donut SVG geometry
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.327

  let accumulatedPercent = 0;

  const segments = roles.map((role) => {
    const strokeDasharray = `${(role.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += role.percentage;
    return {
      ...role,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            User Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Breakdown across institutional roles
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          {totalUsers.toLocaleString()} Total
        </span>
      </div>

      {/* Donut Graphic + Legend Container */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="11"
              fill="transparent"
            />

            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.role}
                cx="50"
                cy="50"
                r={radius}
                stroke={seg.color}
                strokeWidth="11"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700"
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {totalUsers.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Users
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full sm:w-auto space-y-2.5">
          {roles.map((r) => (
            <div
              key={r.role}
              className="flex items-center justify-between sm:justify-start gap-4 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span className="font-semibold text-slate-700">{r.label}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="font-bold text-slate-900">{r.percentage}%</span>
                <span className="text-slate-400 text-[11px] font-mono">
                  ({r.count.toLocaleString()})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Active role allocations</span>
        <span className="text-emerald-600 font-bold">100% verified</span>
      </div>
    </div>
  );
}
