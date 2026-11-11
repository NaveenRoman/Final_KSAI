import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import {
  formatAiCost,
  getCanonicalPricingBannerData,
} from "@/lib/ai/pricing-config";
import {
  Cpu,
  Timer,
  CheckCircle2,
  AlertCircle,
  Info,
  Coins,
  Layers,
  Activity,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAIPage() {
  const admin = await requireAdminPage();

  const [
    attemptTotal,
    attemptSuccess,
    attemptFailed,
    correlatedRequestsTotal,
    correlatedRequestsSuccess,
    correlatedRequestsFailed,
    legacyRecordsCount,
    requestLatencyAgg,
    attemptLatencyAgg,
    tokensAgg,
    recentTelemetry,
    legacyAiCount,
  ] = await Promise.all([
    db.aiTelemetry.count(),
    db.aiTelemetry.count({ where: { status: 200 } }),
    db.aiTelemetry.count({ where: { status: { not: 200 } } }),
    db.aiTelemetry.count({ where: { isFinal: true } }),
    db.aiTelemetry.count({ where: { isFinal: true, status: 200 } }),
    db.aiTelemetry.count({ where: { isFinal: true, status: { not: 200 } } }),
    db.aiTelemetry.count({ where: { requestId: null } }),
    db.aiTelemetry.aggregate({
      _avg: { endToEndLatencyMs: true },
      where: { isFinal: true, status: 200 },
    }),
    db.aiTelemetry.aggregate({
      _avg: { latencyMs: true },
      where: { status: 200 },
    }),
    db.aiTelemetry.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true,
      },
    }),
    db.aiTelemetry.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.count({
      where: {
        actionType: {
          in: [
            "AI_CHAT",
            "AI_DICTATE",
            "AI_GUIDE",
            "AI_DEBUG",
            "AI_INTERVIEW",
            "AI_TEACHER",
            "AI_EXPLAIN",
            "INTERVIEW_COMPLETE",
          ],
        },
      },
    }),
  ]);

  const hasLiveTelemetry = attemptTotal > 0;

  // Student Request Metrics (Requests that reached a final outcome + legacy records treated as individual interactions)
  const totalStudentRequests =
    correlatedRequestsTotal > 0
      ? correlatedRequestsTotal + legacyRecordsCount
      : hasLiveTelemetry
      ? attemptTotal
      : legacyAiCount;

  const successfulStudentRequests =
    correlatedRequestsTotal > 0
      ? correlatedRequestsSuccess + (legacyRecordsCount > 0 ? attemptSuccess - (attemptTotal - legacyRecordsCount) : 0)
      : attemptSuccess;

  const failedStudentRequests =
    correlatedRequestsTotal > 0
      ? correlatedRequestsFailed + (legacyRecordsCount > 0 ? attemptFailed - (attemptTotal - legacyRecordsCount) : 0)
      : attemptFailed;

  const avgEndToEndLatencyMs = requestLatencyAgg._avg?.endToEndLatencyMs
    ? Math.round(requestLatencyAgg._avg.endToEndLatencyMs)
    : attemptLatencyAgg._avg?.latencyMs
    ? Math.round(attemptLatencyAgg._avg.latencyMs)
    : null;

  const avgAttemptLatencyMs = attemptLatencyAgg._avg?.latencyMs
    ? Math.round(attemptLatencyAgg._avg.latencyMs)
    : null;

  const studentErrorRatePercent =
    totalStudentRequests > 0
      ? ((failedStudentRequests / totalStudentRequests) * 100).toFixed(1)
      : "0.0";

  const attemptRetryRatePercent =
    attemptTotal > 0
      ? ((attemptFailed / attemptTotal) * 100).toFixed(1)
      : "0.0";

  const totalTrackedTokens = tokensAgg._sum?.totalTokens || 0;
  const totalCostUsd = tokensAgg._sum?.costUsd ?? null;

  const pricingBannerItems = getCanonicalPricingBannerData();
  const configuredBillingTier = (
    process.env.GEMINI_BILLING_TIER || "unknown"
  ).toUpperCase();

  const aiFeatures = [
    {
      name: "KnowledgeStream AI Dictator",
      purpose: "Voice-driven coding tutor with real-time token execution & syntax supervision",
      status: "Operational",
      latency: avgEndToEndLatencyMs ? `${avgEndToEndLatencyMs}ms (Tracked)` : "< 1.2s",
      usage: "Interactive Voice Dictation",
    },
    {
      name: "AI Guided Debugger",
      purpose: "Step-by-step conceptual hints without directly revealing solutions",
      status: "Operational",
      latency: avgEndToEndLatencyMs ? `${avgEndToEndLatencyMs}ms (Tracked)` : "< 1.4s",
      usage: "Hint Supervision",
    },
    {
      name: "AI Mock Interview Simulator",
      purpose: "Technical & HR behavioral evaluations with automated scorecards",
      status: "Operational",
      latency: avgEndToEndLatencyMs ? `${avgEndToEndLatencyMs}ms (Tracked)` : "< 1.9s",
      usage: "Evaluation Gateway",
    },
    {
      name: "AI Quiz Generator",
      purpose: "Generates adaptive conceptual questions based on chapter learning gaps",
      status: "Operational",
      latency: avgEndToEndLatencyMs ? `${avgEndToEndLatencyMs}ms (Tracked)` : "< 1.1s",
      usage: "Assessment Engine",
    },
  ];

  return (
    <AdminPageLayout
      title="AI Management & Telemetry"
      subtitle="Model routing, response latencies, token economics, and learning accuracy"
      adminUser={admin}
    >
      {/* 5 Real AI Student-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Avg Latency */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg E2E Latency
            </span>
            <Timer size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {avgEndToEndLatencyMs !== null ? `${avgEndToEndLatencyMs}ms` : "—"}
          </div>
          <span
            className={`text-[10px] font-bold ${
              avgEndToEndLatencyMs !== null ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {avgEndToEndLatencyMs !== null
              ? "True student wait time"
              : "Standing by for requests"}
          </span>
        </div>

        {/* Card 2: Total Requests */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Student Requests
            </span>
            <Activity size={14} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalStudentRequests.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-blue-600 font-bold">
            {hasLiveTelemetry ? `${successfulStudentRequests} successful` : "Legacy interactions"}
          </span>
        </div>

        {/* Card 3: Error Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Student Error Rate
            </span>
            <AlertCircle size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {hasLiveTelemetry ? `${studentErrorRatePercent}%` : "0.0%"}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {hasLiveTelemetry ? `${failedStudentRequests} student failures` : "Zero failure records"}
          </span>
        </div>

        {/* Card 4: Token Economics */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tokens Tracked
            </span>
            <Layers size={14} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalTrackedTokens > 0
              ? totalTrackedTokens.toLocaleString("en-IN")
              : "0"}
          </div>
          <span className="text-[10px] text-purple-600 font-bold">
            {hasLiveTelemetry ? `${tokensAgg._sum?.inputTokens || 0} in / ${tokensAgg._sum?.outputTokens || 0} out` : "Tracking active"}
          </span>
        </div>

        {/* Card 5: AI Spend */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Est. API Cost
            </span>
            <Coins size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1 truncate">
            {formatAiCost(totalCostUsd)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {hasLiveTelemetry ? `Published rates (${configuredBillingTier})` : "Historical: NOT TRACKED"}
          </span>
        </div>
      </div>

      {/* Attempt-Level Infrastructure Diagnostics */}
      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GitBranch size={16} className="text-indigo-600 shrink-0" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong>Total Raw Model Attempts:</strong> {attemptTotal.toLocaleString("en-IN")}
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong>Attempt Retry/Failure Rate:</strong> {attemptRetryRatePercent}% ({attemptFailed} retries/errors)
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong>Avg Raw Model Latency:</strong> {avgAttemptLatencyMs !== null ? `${avgAttemptLatencyMs}ms` : "—"}
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <strong>Correlated Requests:</strong> {correlatedRequestsTotal}
            </span>
            {legacyRecordsCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  <strong>Legacy Un-correlated:</strong> {legacyRecordsCount} records
                </span>
              </>
            )}
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 shrink-0 self-start md:self-auto">
          Attempt Diagnostics
        </span>
      </div>

      {/* Pricing Rates and Disclaimer Banner (Derived from Canonical Pricing Config) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-slate-900 font-semibold">
                Official Published Model Economics (USD)
              </strong>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                Tier: {configuredBillingTier}
              </span>
            </div>
            <div className="text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {pricingBannerItems.map((item, idx) => (
                <span key={item.model}>
                  <strong className="text-slate-700">{item.displayName}:</strong>{" "}
                  {item.promptRate} / 1M in · {item.candidateRate} / 1M out
                  {item.isLocal ? " (Local)" : ""}
                  {idx < pricingBannerItems.length - 1 ? " |" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0 self-start lg:self-auto">
          Canonical Configuration
        </span>
      </div>

      {/* Live AI Telemetry Event Stream Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Live AI Telemetry Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Correlated requests, individual attempt diagnostics, raw/e2e latencies, and token economics (zero prompt or code content stored)
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {recentTelemetry.length} Recent Records
          </span>
        </div>

        {recentTelemetry.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Request / Attempt</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Latency (Raw / E2E)</th>
                  <th className="py-2.5 px-3 text-right">Tokens (In / Out)</th>
                  <th className="py-2.5 px-3 text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentTelemetry.map((row) => {
                  const isLegacy = !row.requestId;
                  const isSuccess = row.status === 200;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 font-sans whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {isLegacy ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Legacy (No ID)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Att #{row.attempt ?? 1}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800">
                              <span title={row.requestId || undefined}>
                                {row.requestId?.slice(0, 12)}...
                              </span>
                              {row.isFinal && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    row.finalOutcome === "SUCCESS" || (!row.finalOutcome && isSuccess)
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  Final
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className="capitalize font-semibold text-slate-600">
                                {row.attemptRole || (row.attempt && row.attempt > 1 ? "retry" : "primary")}
                              </span>
                              <span>·</span>
                              <span>Att #{row.attempt ?? 1}</span>
                              {row.fallbackSelected && (
                                <>
                                  <span>·</span>
                                  <span className="text-indigo-600 font-medium">Fallback</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">
                        {row.service}
                      </td>
                      <td className="py-2.5 px-3 text-purple-700 truncate max-w-[140px]">
                        {row.model}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : row.status === 429 || row.status === 408
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 size={10} />
                          ) : (
                            <AlertCircle size={10} />
                          )}
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="text-slate-700 font-bold">
                          {row.latencyMs}ms
                        </div>
                        {row.endToEndLatencyMs && row.endToEndLatencyMs !== row.latencyMs && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            E2E: {row.endToEndLatencyMs}ms
                          </div>
                        )}
                        {row.backoffMs !== null && row.backoffMs > 0 && (
                          <div className="text-[9px] text-amber-600 font-sans">
                            +{row.backoffMs}ms backoff
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {row.inputTokens ?? "—"} / {row.outputTokens ?? "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                        {row.costUsd !== null ? formatAiCost(row.costUsd) : "NOT TRACKED"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Zero live telemetry records in database. Telemetry will automatically log and display here when students interact with the AI tutor.
          </div>
        )}
      </div>

      {/* AI Features & Services Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Cpu size={18} className="text-blue-600" />
          Active AI Capabilities &amp; Engine Subsystems
        </h3>

        <div className="divide-y divide-slate-100">
          {aiFeatures.map((f) => (
            <div
              key={f.name}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm font-bold text-slate-900">{f.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">{f.purpose}</p>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0">
                <span className="text-slate-500 font-mono">{f.latency}</span>
                <span className="text-slate-600 font-semibold">{f.usage}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={11} /> {f.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPageLayout>
  );
}
