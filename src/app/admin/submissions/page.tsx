import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Code2, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const admin = await requireAdminPage();

  const submissions = await db.submission.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      challenge: {
        select: {
          title: true,
          difficulty: true,
          contest: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  return (
    <AdminPageLayout
      title="Student Submissions Monitor"
      subtitle="Real-time audit log of student challenge submissions, pass/fail status evaluations, and XP transaction awards"
      adminUser={admin}
    >
      {submissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <Code2 size={40} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Submissions Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Submissions submitted by students taking published contests will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Challenge & Contest</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">XP Awarded</th>
                  <th className="py-3.5 px-4 text-right">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.user.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.user.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.challenge.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{s.challenge.contest?.title || "Contest"}</span> &bull;{" "}
                        <span className="font-semibold text-slate-600">{s.challenge.difficulty}</span> &bull;{" "}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {s.language}
                        </span>
                      </div>
                      {s.errorDetail && (
                        <div className="mt-1 text-[10px] font-mono text-rose-600 line-clamp-2 bg-rose-50 p-1.5 rounded border border-rose-100">
                          {s.errorDetail}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.status === "PASSED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={12} /> PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                          <XCircle size={12} /> FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {s.xpAwarded > 0 ? (
                        <span className="text-emerald-600 inline-flex items-center gap-0.5">
                          <Zap size={12} /> +{s.xpAwarded} XP
                        </span>
                      ) : (
                        <span className="text-slate-400">0 XP</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
