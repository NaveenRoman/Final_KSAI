import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Users, Search, Filter, UserPlus, Shield, GraduationCap, Award } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const admin = await requireAdminPage();
  const { role: roleFilter, q: searchFilter } = await searchParams;

  const whereClause: any = {};
  if (roleFilter && roleFilter !== "all") {
    if (roleFilter === "student") {
      whereClause.role = { in: ["Student", "STUDENT", "User"] };
    } else if (roleFilter === "faculty") {
      whereClause.role = { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] };
    } else if (roleFilter === "college") {
      whereClause.role = { in: ["COLLEGE_ADMIN", "CollegeAdmin", "PRINCIPAL", "DIRECTOR"] };
    } else if (roleFilter === "admin") {
      whereClause.role = { in: ["SUPER_ADMIN", "SuperAdmin", "Admin", "ADMIN"] };
    }
  }

  if (searchFilter) {
    whereClause.OR = [
      { name: { contains: searchFilter } },
      { email: { contains: searchFilter } },
      { college: { contains: searchFilter } },
    ];
  }

  const [users, totalCount, studentsCount, facultyCount, collegeCount] = await Promise.all([
    db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        department: true,
        xp: true,
        level: true,
        createdAt: true,
      },
    }),
    db.user.count(),
    db.user.count({ where: { role: { in: ["Student", "STUDENT", "User"] } } }),
    db.user.count({ where: { role: { in: ["FACULTY", "Faculty", "Teacher", "HOD"] } } }),
    db.user.count({ where: { role: { in: ["COLLEGE_ADMIN", "CollegeAdmin"] } } }),
  ]);

  return (
    <AdminPageLayout
      title="User Management"
      subtitle="Directory of students, faculty instructors, and institutional administrators"
      adminUser={admin}
    >
      {/* Metric counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Students</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{studentsCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Faculty</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{facultyCount.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">College Admins</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{collegeCount.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/users"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              !roleFilter || roleFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Roles
          </Link>
          <Link
            href="/admin/users?role=student"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === "student" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Students
          </Link>
          <Link
            href="/admin/users?role=faculty"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === "faculty" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Faculty
          </Link>
          <Link
            href="/admin/users?role=college"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === "college" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Colleges
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <form method="GET" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={searchFilter || ""}
              placeholder="Filter by name, email..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-56"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </form>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">College & Department</th>
                <th className="pb-3 px-3">Level & XP</th>
                <th className="pb-3 pl-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role?.toUpperCase().includes("ADMIN")
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : u.role?.toUpperCase().includes("FACULTY")
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="text-slate-800 font-medium">{u.college || "KnowledgeStream Platform"}</div>
                    <div className="text-[10px] text-slate-400">{u.department || "General Cohort"}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-slate-900">Level {u.level || 1}</div>
                    <div className="text-[10px] text-emerald-600 font-bold">{u.xp} XP</div>
                  </td>
                  <td className="py-3.5 pl-3 text-right text-slate-400 font-mono text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageLayout>
  );
}
