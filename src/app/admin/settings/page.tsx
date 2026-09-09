import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Settings, Shield, Cpu, Key, Database, CheckCircle2, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage();

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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Google OAuth Provider</strong>
                <span className="text-slate-500">Institutional SSO for Students &amp; Faculty</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Configured
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Role-Based Access Control (RBAC)</strong>
                <span className="text-slate-500">Strict SUPER_ADMIN, COLLEGE_ADMIN, FACULTY, STUDENT</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Enforced
              </span>
            </div>
          </div>
        </div>

        {/* AI & Infrastructure Settings */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu size={18} className="text-purple-600" />
            AI Model Engine &amp; Gateway
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Primary AI Model</strong>
                <span className="text-slate-500">Gemini 2.5 Flash (Adaptive Tutor)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                Connected
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Local Fallback Model</strong>
                <span className="text-slate-500">DeepSeek-Coder 6.7B (Ollama Gateway)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Standby
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 block">Database Architecture</strong>
                <span className="text-slate-500">SQLite + Prisma High-Speed Local Client</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Healthy
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
