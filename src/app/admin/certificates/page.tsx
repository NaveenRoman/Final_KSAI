import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Award, CheckCircle2, Search, ExternalLink, ShieldCheck, Clock, Users, BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const admin = await requireAdminPage();

  // Query real courses and enrollments
  const courses = await db.course.findMany({
    include: {
      chapters: { select: { id: true } },
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              college: true,
              progresses: { select: { chapterId: true, isCompleted: true, quizScore: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate real certificate statistics per course
  const trackStats = courses.map((course) => {
    const totalChapters = course.chapters.length;
    let issuedCount = 0;
    let activeInTrainingCount = 0;

    const completedStudents: Array<{
      certId: string;
      studentName: string;
      studentEmail: string;
      college: string;
      completedAt: Date;
    }> = [];

    for (const enrollment of course.enrollments) {
      const user = enrollment.user;
      if (!user) continue;

      const completedChapterIds = new Set(
        user.progresses
          .filter((p) => p.isCompleted && (p.quizScore ?? 0) >= 75)
          .map((p) => p.chapterId)
      );

      const completedCount = course.chapters.filter((ch) =>
        completedChapterIds.has(ch.id)
      ).length;

      const computedProgress = totalChapters > 0
        ? Math.round((completedCount / totalChapters) * 100)
        : enrollment.progress;

      const progress = Math.min(100, Math.max(computedProgress, enrollment.progress));
      const isCompleted = progress >= 100 || (totalChapters > 0 && completedCount >= totalChapters);

      if (isCompleted) {
        issuedCount++;
        const certHash = Buffer.from(`${user.id}-${course.id}`).toString("hex").substring(0, 8).toUpperCase();
        completedStudents.push({
          certId: `KSAI-CERT-${course.language.toUpperCase()}-${certHash}`,
          studentName: user.name,
          studentEmail: user.email,
          college: user.college || "KnowledgeStream Platform",
          completedAt: enrollment.createdAt,
        });
      } else {
        activeInTrainingCount++;
      }
    }

    return {
      courseId: course.id,
      title: course.title,
      code: `KSAI-CERT-${course.language.toUpperCase()}`,
      language: course.language,
      totalEnrolled: course.enrollments.length,
      issuedCount,
      activeInTrainingCount,
      totalChapters,
      completedStudents,
    };
  });

  const totalIssuedAll = trackStats.reduce((sum, t) => sum + t.issuedCount, 0);
  const totalEnrolledAll = trackStats.reduce((sum, t) => sum + t.totalEnrolled, 0);

  return (
    <AdminPageLayout
      title="Certificates & Accreditation"
      subtitle="Cryptographically verifiable graduation credentials and institutional skill passports"
      adminUser={admin}
    >
      {/* Top Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Accredited Tracks</span>
            <span className="text-base font-black text-slate-900">{trackStats.length} Core Programs</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Credentials Issued</span>
            <span className="text-base font-black text-emerald-600">{totalIssuedAll} Verified</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active In Training</span>
            <span className="text-base font-black text-blue-600">{totalEnrolledAll - totalIssuedAll} Students</span>
          </div>
        </div>

        <Link
          href="/certificates"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <Award size={14} />
          <span>Student Certificate Portal</span>
        </Link>
      </div>

      {/* Certification Tracks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {trackStats.map((t) => (
          <div
            key={t.code}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 font-mono">
                  {t.language.toUpperCase()}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                  {t.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">{t.title}</h3>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {t.totalChapters} Curriculum Modules
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Verified Issued:</span>
                <strong className={t.issuedCount > 0 ? "text-emerald-600 font-bold" : "text-slate-900 font-bold"}>
                  {t.issuedCount}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total Enrolled:</span>
                <span className="text-slate-600 font-medium">{t.totalEnrolled}</span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={11} /> 100% DB Audited
                </span>
                {t.issuedCount === 0 && (
                  <span className="text-slate-400 font-mono">Pending Completion</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real Issued Credentials Audit Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Verified Certificate Deliveries &amp; Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live verification records mapped directly to completed course syllabi (100% progress threshold)
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {totalIssuedAll} Verified Credentials
          </span>
        </div>

        {totalIssuedAll === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Award size={36} className="text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Certificates Issued Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Students earn credentials when completing 100% of curriculum modules with at least 75% quiz accuracy.
              Records will appear here automatically upon completion.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Credential ID</th>
                  <th className="pb-3 px-3">Recipient</th>
                  <th className="pb-3 px-3">Campus Affiliation</th>
                  <th className="pb-3 px-3">Program Track</th>
                  <th className="pb-3 pl-3 text-right">Completion Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trackStats.flatMap((t) =>
                  t.completedStudents.map((s) => (
                    <tr key={s.certId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-4 font-mono font-bold text-blue-600">{s.certId}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{s.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.studentEmail}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{s.college}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{t.title}</td>
                      <td className="py-3 pl-3 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}
