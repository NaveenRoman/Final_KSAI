"use client";

import React, { useState } from "react";
import { TrendingUp, BarChart3, Clock, AlertCircle } from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface PlatformUsageChartProps {
  trend: SuperAdminDashboardData["usageTrend"];
  onSelectTimeframe?: (tf: "today" | "7d" | "30d" | "3m" | "1y") => void;
}

export function PlatformUsageChart({ trend, onSelectTimeframe }: PlatformUsageChartProps) {
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const data = trend.data || [];

  const timeframes: Array<{ id: "today" | "7d" | "30d" | "3m" | "1y"; label: string }> = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "3m", label: "3 Months" },
    { id: "1y", label: "1 Year" },
  ];

  // Dynamic scaling using actual database maximums (never fake hardcoded numbers)
  const maxUsers = Math.max(...data.map((d) => d.activeUsers), 1);
  const maxSessions = Math.max(...data.map((d) => d.aiSessions), 1);

  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 24;
  const paddingY = 24;

  const stepX = (svgWidth - paddingX * 2) / Math.max(data.length - 1, 1);

  // Active users points (Scale 0 to actual maxUsers)
  const userPoints = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = svgHeight - paddingY - (d.activeUsers / maxUsers) * (svgHeight - paddingY * 2);
    return { x, y, val: d.activeUsers };
  });

  // AI sessions points (Scale 0 to actual maxSessions)
  const sessionPoints = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = svgHeight - paddingY - (d.aiSessions / maxSessions) * (svgHeight - paddingY * 2);
    return { x, y, val: d.aiSessions };
  });

  const createSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    return pts.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = a[i - 1];
      const cpX = (prev.x + p.x) / 2;
      return `${acc} C ${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
    }, "");
  };

  const userPath = createSmoothPath(userPoints);
  const sessionPath = createSmoothPath(sessionPoints);

  const userAreaPath = userPoints.length > 0
    ? `${userPath} L ${userPoints[userPoints.length - 1]?.x},${
        svgHeight - paddingY
      } L ${userPoints[0]?.x},${svgHeight - paddingY} Z`
    : "";

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      {/* Header: Title + Legend + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Platform Usage Trend
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
              <Clock size={11} /> {trend.growthRate}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Active Users &amp; AI learning interactions over actual time
          </p>
        </div>

        {/* Timeframe pill selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onSelectTimeframe && onSelectTimeframe(tf.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                trend.timeframe === tf.id
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Series Legend */}
      <div className="flex items-center gap-4 text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-600">Active Registrations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          <span className="text-slate-600">Platform Events</span>
        </div>
      </div>

      {/* Chart Canvas or Professional Empty State */}
      <div className="relative w-full h-52 sm:h-56 select-none flex items-center justify-center">
        {!trend.hasEnoughData ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400 mb-2.5">
              <BarChart3 size={20} />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Not enough historical data yet
            </h4>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
              Data will appear here as KnowledgeStream AI collects more activity.
            </p>
          </div>
        ) : (
          <>
            {/* Horizontal gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
            </div>

            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Shaded Area for Users */}
              {userAreaPath && <path d={userAreaPath} fill="url(#userGrad)" />}

              {/* Smooth Line: Users */}
              {userPath && (
                <path
                  d={userPath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Smooth Line: Sessions */}
              {sessionPath && (
                <path
                  d={sessionPath}
                  fill="none"
                  stroke="#9333EA"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Data points */}
              {userPoints.map((p, i) => (
                <g key={`point-${i}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={activeHoverIndex === i ? 5 : 3.5}
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setActiveHoverIndex(i)}
                    onMouseLeave={() => setActiveHoverIndex(null)}
                  />
                  {sessionPoints[i] && (
                    <circle
                      cx={sessionPoints[i].x}
                      cy={sessionPoints[i].y}
                      r={activeHoverIndex === i ? 5 : 3.5}
                      fill="#9333EA"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setActiveHoverIndex(i)}
                      onMouseLeave={() => setActiveHoverIndex(null)}
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* Interactive hover tooltip */}
            {activeHoverIndex !== null && data[activeHoverIndex] && (
              <div
                className="absolute z-10 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-xl pointer-events-none transition-all duration-75 border border-slate-700"
                style={{
                  left: `${(activeHoverIndex / Math.max(data.length - 1, 1)) * 80 + 10}%`,
                  top: "10%",
                }}
              >
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1">
                  {data[activeHoverIndex].label}
                </div>
                <div className="flex items-center justify-between gap-3 text-blue-400 font-semibold">
                  <span>Users:</span>
                  <span className="font-black text-white">
                    {data[activeHoverIndex].activeUsers}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-purple-400 font-semibold">
                  <span>Events:</span>
                  <span className="font-black text-white">
                    {data[activeHoverIndex].aiSessions}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* X-axis date labels */}
      {trend.hasEnoughData && (
        <div className="flex justify-between items-center px-3 pt-2 text-[11px] font-semibold text-slate-400 border-t border-slate-100">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
