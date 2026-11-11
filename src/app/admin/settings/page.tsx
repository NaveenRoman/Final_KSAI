import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Shield, Cpu, Database, Terminal, Server, Box } from "lucide-react";
import { measureDatabasePing, measureDjangoPing } from "@/lib/server-monitoring";
import { getAiHealthSummary } from "@/lib/ai/ai-health";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage();

  // 1. Live Database Ping
  const dbPing = await measureDatabasePing();

  // 2. Live Django Ping with Sandbox State
  const djangoPing = await measureDjangoPing();

  // 3. Live AI Telemetry Health Truth
  const aiHealth = await getAiHealthSummary();

  // 4. Environment configuration checks (never exposing secrets)
  const isGoogleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID.length > 5
  );

  const isBetterAuthConfigured = Boolean(
    process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length > 8
  );

  // 5. Ollama reachability & model inventory probe (800ms timeout)
  const configuredFallbackModel = process.env.OLLAMA_FALLBACK_MODEL || "deepseek-coder:6.7b";
  let ollamaBadge = "Standing By (Not Connected)";
  let ollamaColor = "bg-slate-100 text-slate-600 border border-slate-200";
  let ollamaDetail = `Fallback Target: ${configuredFallbackModel}`;

  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    const ollamaRes = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(800),
    });
    if (ollamaRes.ok) {
      const data = await ollamaRes.json().catch(() => ({}));
      const models: any[] = Array.isArray(data?.models) ? data.models : [];
      const isModelInstalled = models.some((m: any) => {
        const name = String(m.name || m.model || "");
        return name.toLowerCase().includes("deepseek-coder") || name === configuredFallbackModel;
      });
      if (isModelInstalled) {
        ollamaBadge = "Connected & Ready";
        ollamaColor = "bg-blue-100 text-blue-800";
        ollamaDetail = `Installed: ${configuredFallbackModel} (${models.length} model(s) available)`;
      } else {
        ollamaBadge = "Daemon Active (Model Missing)";
        ollamaColor = "bg-amber-100 text-amber-800";
        ollamaDetail = `Warning: ${configuredFallbackModel} not pulled in Ollama`;
      }
    }
  } catch {
    ollamaBadge = "Standing By (Not Connected)";
    ollamaColor = "bg-slate-100 text-slate-600 border border-slate-200";
    ollamaDetail = "Local Ollama daemon is offline";
  }

  // 6. RBAC Verification Status (Derived dynamically from authenticated session)
  const isRbacVerified = Boolean(admin && admin.role === "SUPER_ADMIN");

  // AI Health Color Scheme
  const aiBadgeColor =
    aiHealth.status === "Operational"
      ? "bg-emerald-100 text-emerald-800"
      : aiHealth.status === "Degraded"
      ? "bg-amber-100 text-amber-800"
      : aiHealth.status === "Unavailable"
      ? "bg-rose-100 text-rose-800"
      : aiHealth.status === "Configured / Unprobed"
      ? "bg-purple-100 text-purple-800"
      : "bg-slate-100 text-slate-600 border border-slate-200";

  // Sandbox Badge Color
  const sandboxStatus = djangoPing.sandbox?.status || "Unknown";
  const sandboxBadgeColor =
    sandboxStatus === "Ready" || sandboxStatus === "Ready (Host Process)"
      ? "bg-emerald-100 text-emerald-800"
      : sandboxStatus === "Unavailable"
      ? "bg-rose-100 text-rose-800"
      : "bg-slate-100 text-slate-600 border border-slate-200";

  return (
    <AdminPageLayout
      title="Super Admin Settings & Governance"
      subtitle="Global security configurations, AI credentials, and database parameters"
      adminUser={admin}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Authentication Settings */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            Security &amp; Authentication Layer
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Session Management</strong>
                <span className="text-slate-500">Better-Auth Cryptographic Token Cookies</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isBetterAuthConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isBetterAuthConfigured ? "Active & Signed" : "Default Secret (Dev)"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Google OAuth Provider</strong>
                <span className="text-slate-500">Institutional SSO for Students &amp; Faculty</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isGoogleOAuthConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isGoogleOAuthConfigured ? "Configured" : "Not Configured"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Role-Based Access Control (RBAC)</strong>
                <span className="text-slate-500">Strict SUPER_ADMIN, COLLEGE_ADMIN, FACULTY, STUDENT</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isRbacVerified
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {isRbacVerified ? "Active & Enforced (SUPER_ADMIN Verified)" : "Verification Required"}
              </span>
            </div>
          </div>
        </div>

        {/* AI & Infrastructure Settings */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu size={18} className="text-purple-600" />
            AI Model Engine &amp; Infrastructure
          </h3>

          <div className="space-y-3 text-xs">
            {/* Primary AI Model with Live Telemetry Truth */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <strong className="text-slate-900 block">Primary AI Model</strong>
                <span className="text-slate-500 block font-mono text-[11px]">{aiHealth.primaryModel} (Resilience Gateway)</span>
                <span className="text-[10px] text-slate-400 block">{aiHealth.detail}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${aiBadgeColor}`}>
                {aiHealth.status}
              </span>
            </div>

            {/* Local Fallback Model with Inventory Check */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <strong className="text-slate-900 block">Local Fallback Model</strong>
                <span className="text-slate-500 block font-mono text-[11px]">{configuredFallbackModel} (Ollama Gateway)</span>
                <span className="text-[10px] text-slate-400 block">{ollamaDetail}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ollamaColor}`}>
                {ollamaBadge}
              </span>
            </div>

            {/* Database Architecture */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Database Architecture</strong>
                <span className="text-slate-500">{dbPing.provider}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  dbPing.status === "Healthy"
                    ? "bg-emerald-100 text-emerald-800"
                    : dbPing.status === "Degraded"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {dbPing.status} ({dbPing.latencyMs}ms)
              </span>
            </div>

            {/* Django Execution Backend HTTP Availability */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Django Backend HTTP Gateway</strong>
                <span className="text-slate-500">{djangoPing.service}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  djangoPing.status === "Healthy"
                    ? "bg-emerald-100 text-emerald-800"
                    : djangoPing.status === "Degraded"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {djangoPing.status} ({djangoPing.latencyMs}ms)
              </span>
            </div>

            {/* Django Execution Sandbox Readiness */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Execution Sandbox Runtime</strong>
                <span className="text-slate-500">
                  Mode: {djangoPing.sandbox?.mode === "docker" ? "Docker Hardened Sandbox" : "Host Subprocess Runner (Dev)"}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sandboxBadgeColor}`}>
                {sandboxStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
