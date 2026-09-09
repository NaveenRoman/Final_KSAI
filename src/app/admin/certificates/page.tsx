import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Award, CheckCircle2, Search, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const admin = await requireAdminPage();

  const templates = [
    { title: "C Language Mastery & System Programming", code: "KSAI-CERT-C", issued: 142, track: "C" },
    { title: "C++ Object-Oriented & STL Masterclass", code: "KSAI-CERT-CPP", issued: 128, track: "C++" },
    { title: "Python AI & Data Structures Architecture", code: "KSAI-CERT-PY", issued: 215, track: "Python" },
    { title: "Java Enterprise & Object-Oriented Architecture", code: "KSAI-CERT-JAVA", issued: 164, track: "Java" },
  ];

  return (
    <AdminPageLayout
      title="Certificates & Accreditation"
      subtitle="Cryptographically verifiable graduation credentials and institutional skill passports"
      adminUser={admin}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500">
          4 Core Certification Tracks Configured
        </div>
        <Link
          href="/certificates"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
        >
          <Award size={14} />
          <span>Student Certificate Portal</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {templates.map((t) => (
          <div
            key={t.code}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  {t.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">{t.title}</h3>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Issued: <strong className="text-slate-900">{t.issued}</strong></span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck size={11} /> Verified
              </span>
            </div>
          </div>
        ))}
      </div>
    </AdminPageLayout>
  );
}
