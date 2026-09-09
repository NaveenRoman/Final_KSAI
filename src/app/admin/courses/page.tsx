import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { BookOpen, Plus, Trophy, Code2, Layers, ExternalLink, Star } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const admin = await requireAdminPage();

  const courses = await db.course.findMany({
    include: {
      chapters: true,
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminPageLayout
      title="Course & Curriculum Management"
      subtitle="KnowledgeStream AI curriculum catalog, chapter syllabi, contests, and coding challenges"
      adminUser={admin}
    >
      {/* Quick Nav Pills to Contests, Submissions, Leaderboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-colors"
          >
            <Trophy size={13} />
            <span>Manage Contests</span>
          </Link>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors"
          >
            <Code2 size={13} />
            <span>Student Submissions</span>
          </Link>
          <Link
            href="/admin/leaderboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors"
          >
            <Layers size={13} />
            <span>Leaderboard Monitor</span>
          </Link>
        </div>

        <Link
          href="/courses/catalog"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
        >
          <Plus size={14} />
          <span>Explore Course Catalog</span>
        </Link>
      </div>

      {/* Courses Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {courses.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {c.language.toUpperCase()}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star size={12} className="fill-amber-400" /> {c.rating}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {c.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Chapters</span>
                  <strong className="text-slate-900 font-black">{c.chapters.length} Modules</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled</span>
                  <strong className="text-blue-600 font-black">{c._count.enrollments} Students</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">₹{c.price.toLocaleString("en-IN")}</span>
              <Link
                href={`/courses/${c.language}/overview`}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>Curriculum</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AdminPageLayout>
  );
}
