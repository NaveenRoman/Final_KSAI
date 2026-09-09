"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronRight,
  Building2,
  LogOut,
  Calendar,
  Bell,
  Sparkles,
  TrendingUp,
  Activity,
  Award,
  HelpCircle,
  Clock,
  Send,
  UploadCloud,
  CheckSquare,
  BarChart3,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDashboardGuard } from "@/lib/useDashboardGuard";
import { getRoleDashboardPath } from "@/lib/roles";
import { handleUserLogout } from "@/lib/auth-logout";

export default function FacultyDashboard() {
  const router = useRouter();
  const { isAuthorized, currentUser } = useDashboardGuard([
    "FACULTY",
    "DEPARTMENT_ADMIN",
    "COLLEGE_ADMIN",
    "SUPER_ADMIN",
  ]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("This Semester (May 2026)");
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "evaluations" | "students">("overview");

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/faculty");
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        const targetRole = errJson.userRole || currentUser?.role || "STUDENT";
        router.replace(getRoleDashboardPath(targetRole));
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err: any) {
      console.error("Error loading faculty portal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchFacultyData();
    }
  }, [isAuthorized]);

  if (!isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Faculty Academic Workspace...</p>
      </div>
    );
  }

  const {
    faculty,
    overviewStats,
    classes,
    classPerformanceScores,
    recentAssignments,
    studentPerformanceSummary,
    activityOverview,
    upcomingSchedule,
    aiInsights,
    announcements,
    studentsNeedingAttention,
    pendingFacultyTasks,
  } = data || {};

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/85 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  KnowledgeStream AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Faculty Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                {faculty?.college || "KG Reddy College of Engineering & Technology"} • {faculty?.department || "CSM"}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <Calendar size={13} className="text-emerald-400" />
            <span>Academic Year 2024 - 2025</span>
          </div>

          <Link
            href="/dashboard/department"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all"
          >
            <Building2 size={14} className="text-indigo-400" />
            <span>Department Hub</span>
          </Link>

          <button
            onClick={fetchFacultyData}
            title="Refresh Data"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw size={15} />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-md">
              {faculty?.name ? faculty.name.charAt(0) : "F"}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white">{faculty?.name || "Dr. Priya Sharma"}</div>
              <div className="text-[10px] text-emerald-400 font-semibold">{faculty?.designation || "Assistant Professor"}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUserLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer shadow-xs ml-1"
            title="Logout"
          >
            <LogOut size={13} className="text-red-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Header Section (Matching Image 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Welcome back, {faculty?.name || "Dr. Priya Sharma"}! 👋
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Here&apos;s what&apos;s happening with your classes and cohorts today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0B0F1C] border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="This Semester (May 2026)">This Semester (May 2026)</option>
              <option value="Previous Semester (Dec 2025)">Previous Semester (Dec 2025)</option>
            </select>

            <button
              title="Schedule Calendar"
              onClick={() => alert("Faculty academic calendar synced.")}
              className="p-2 rounded-xl bg-[#0B0F1C] border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-white transition-all"
            >
              <Calendar size={16} />
            </button>

            <div className="relative">
              <button
                title="Notifications"
                onClick={() => alert("Viewing faculty notifications.")}
                className="p-2 rounded-xl bg-[#0B0F1C] border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-white transition-all"
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {announcements?.length || 4}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Top KPI Cards (Matching Image 1 Exactly) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Students */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Total Students</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Users size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.totalStudents?.value ?? 0}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-400">
              <TrendingUp size={11} />
              <span>{overviewStats?.totalStudents?.uniqueRegistered ?? 0} active in department</span>
            </div>
          </div>

          {/* 2. Active Classes */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Active Classes</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <GraduationCap size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.activeClasses?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-slate-400">
              <span className="text-emerald-400 font-semibold">{overviewStats?.activeClasses?.value ?? 0} assigned</span> this term
            </div>
          </div>

          {/* 3. Assignments */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Assignments</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <FileText size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.assignments?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-amber-400">
              {overviewStats?.assignments?.pendingEvaluation ?? 0} pending evaluation
            </div>
          </div>

          {/* 4. Average Class Score */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-amber-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Average Class Score</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Award size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {overviewStats?.averageClassScore?.hasData ? overviewStats.averageClassScore.value : "—"}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-400">
              <TrendingUp size={11} />
              <span>Calculated across assigned classes</span>
            </div>
          </div>

          {/* 5. Student Learning Activity (Replacing Fake Attendance) */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Learning Activity</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Activity size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.learningActivity?.value ?? "0%"}</div>
            <div className="mt-1 text-[10px] font-medium text-slate-400 truncate" title="Attendance model not in DB; tracking 7-day student learning activity">
              <span className="text-purple-400 font-semibold">{overviewStats?.learningActivity?.active7d ?? 0} Active (7d)</span>
            </div>
          </div>
        </div>

        {/* Row 2: Performance Graph + My Classes + AI Insights (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Class Performance Overview (4 of 12 Desktop) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-400" />
                  Class Performance Overview
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Average Score across active cohorts</p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">Live Metrics</span>
            </div>

            {classPerformanceScores && classPerformanceScores.length > 0 ? (
              <div className="space-y-3 pt-2">
                {classPerformanceScores.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span className="truncate max-w-[180px] text-white font-semibold">{item.subject}</span>
                      <span className="text-emerald-400 font-bold">{item.avgScore}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000"
                        style={{ width: `${item.avgScore}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">{item.name} • {item.students} Enrolled</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Not enough historical assessment data yet.
              </div>
            )}
          </div>

          {/* My Classes (5 of 12 Desktop) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-emerald-400" />
                  My Classes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Assigned teaching sections & subjects</p>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{classes?.length ?? 0} Classes</span>
            </div>

            {classes && classes.length > 0 ? (
              <div className="space-y-2.5">
                {classes.map((cls: any, idx: number) => (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        idx === 0 ? "bg-indigo-600/30 text-indigo-400 border border-indigo-500/30"
                        : idx === 1 ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                        : idx === 2 ? "bg-amber-600/30 text-amber-400 border border-amber-500/30"
                        : idx === 3 ? "bg-blue-600/30 text-blue-400 border border-blue-500/30"
                        : "bg-purple-600/30 text-purple-400 border border-purple-500/30"
                      }`}>
                        {cls.departmentCode || "CSM"}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">{cls.subject}</div>
                        <div className="text-[11px] text-slate-400">{cls.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <div className="text-xs font-extrabold text-emerald-400">{cls.avgScore}%</div>
                        <div className="text-[10px] text-slate-500">{cls.totalStudents} Students</div>
                      </div>
                      <Link
                        href="/dashboard/department"
                        className="text-slate-400 hover:text-white"
                        title="Manage class"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <BookOpen size={24} className="text-slate-600 mx-auto" />
                <div className="text-xs font-bold text-white">No classes assigned yet</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Your department administrator has not assigned teaching sections to this account yet.
                </p>
              </div>
            )}
          </div>

          {/* AI Insights (3 of 12 Desktop) */}
          <div className="lg:col-span-3 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                AI Insights
              </h3>
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            </div>

            <div className="space-y-3">
              {(aiInsights || []).map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      item.type === "success" ? "bg-emerald-500/10 text-emerald-400"
                      : item.type === "warning" ? "bg-amber-500/10 text-amber-400"
                      : "bg-blue-500/10 text-blue-400"
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{item.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Recent Assignments + Student Performance Summary + Learning Activity (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Assignments (5 of 12 Desktop) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-blue-400" />
                  Recent Assignments & Evaluations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated compiler submissions & evaluations</p>
              </div>
              <span className="text-xs text-blue-400 font-semibold cursor-pointer hover:underline">View All</span>
            </div>

            {recentAssignments && recentAssignments.length > 0 ? (
              <div className="space-y-2.5">
                {recentAssignments.map((asg: any) => (
                  <div
                    key={asg.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{asg.title}</div>
                      <div className="text-[11px] text-slate-400">{asg.className} • Due: {asg.dueDate}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-white">
                        <span className="text-emerald-400">{asg.submitted}</span> / {asg.total}
                      </div>
                      <div className="text-[10px] text-amber-400">{asg.pending} Pending</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No assignments created yet.
              </div>
            )}
          </div>

          {/* Student Performance Summary Donut (4 of 12 Desktop) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                Student Performance Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Cohort learning mastery bands</p>
            </div>

            {/* Donut representation */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-white/10" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-400 transition-all duration-1000"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - (studentPerformanceSummary?.excellent?.percent || 40) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white">{studentPerformanceSummary?.total || 0}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Students</span>
                </div>
              </div>
            </div>

            {/* Performance Legend */}
            <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Excellent (80% and above)
                </span>
                <span className="font-bold text-white">
                  {studentPerformanceSummary?.excellent?.count || 0} ({studentPerformanceSummary?.excellent?.percent || 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Good (60% - 79%)
                </span>
                <span className="font-bold text-white">
                  {studentPerformanceSummary?.good?.count || 0} ({studentPerformanceSummary?.good?.percent || 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Average (40% - 59%)
                </span>
                <span className="font-bold text-white">
                  {studentPerformanceSummary?.average?.count || 0} ({studentPerformanceSummary?.average?.percent || 0}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Needs Improvement (&lt;40%)
                </span>
                <span className="font-bold text-white">
                  {studentPerformanceSummary?.needsImprovement?.count || 0} ({studentPerformanceSummary?.needsImprovement?.percent || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Student Learning Activity (3 of 12 Desktop - Replacing Fake Attendance) */}
          <div className="lg:col-span-3 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-purple-400" />
                Learning Activity Overview
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Verified platform interaction status</p>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-white/10" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-purple-400 transition-all duration-1000"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - (activityOverview?.activeRate || 0) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white">{activityOverview?.activeRate || 0}%</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Active Rate</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Active Today
                </span>
                <span className="font-bold text-white">{activityOverview?.activeToday || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Active This Week
                </span>
                <span className="font-bold text-white">{activityOverview?.active7d || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Inactive Learners
                </span>
                <span className="font-bold text-slate-400">{activityOverview?.inactive || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Upcoming Schedule + Recent Announcements + Quick Actions (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upcoming Schedule (4 of 12 Desktop) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                Upcoming Schedule
              </h3>
              <span className="text-xs text-amber-400 font-semibold cursor-pointer hover:underline">View Calendar</span>
            </div>

            {upcomingSchedule && upcomingSchedule.length > 0 ? (
              <div className="space-y-3">
                {upcomingSchedule.map((s: any) => (
                  <div key={s.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.subject}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {s.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{s.class}</div>
                    <div className="text-[11px] text-slate-300 font-medium">{s.time}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No upcoming schedule configured.
              </div>
            )}
          </div>

          {/* Recent Announcements (4 of 12 Desktop) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell size={18} className="text-emerald-400" />
                Recent Announcements
              </h3>
              <span className="text-xs text-emerald-400 font-semibold cursor-pointer hover:underline">View All</span>
            </div>

            {announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((anc: any) => (
                  <div key={anc.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">{anc.scope}</span>
                      <span className="text-[10px] text-slate-500">{anc.date}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{anc.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{anc.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No circulars published yet.
              </div>
            )}
          </div>

          {/* Quick Actions (4 of 12 Desktop) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-indigo-400" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => alert("Assignment creator opening...")}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 text-center space-y-2 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <FileText size={18} />
                </div>
                <div className="text-xs font-bold text-white">Create Assignment</div>
              </button>

              <button
                onClick={() => alert("Material uploader opening...")}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 text-center space-y-2 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <UploadCloud size={18} />
                </div>
                <div className="text-xs font-bold text-white">Upload Material</div>
              </button>

              <button
                onClick={() => alert("Quiz scheduler opening...")}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 text-center space-y-2 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <CheckSquare size={18} />
                </div>
                <div className="text-xs font-bold text-white">Schedule Quiz</div>
              </button>

              <button
                onClick={() => alert("Institutional gradebook report generated.")}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 text-center space-y-2 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <BarChart3 size={18} />
                </div>
                <div className="text-xs font-bold text-white">View Reports</div>
              </button>
            </div>
          </div>
        </div>

        {/* Row 5: Product-Level Additions: Students Needing Attention & Pending Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Students Needing Attention */}
          <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Students Needing Attention
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {studentsNeedingAttention?.length || 0} Alerts
              </span>
            </div>

            {studentsNeedingAttention && studentsNeedingAttention.length > 0 ? (
              <div className="space-y-2.5">
                {studentsNeedingAttention.map((st: any) => (
                  <div key={st.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{st.department} • {st.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        {st.issue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                All cohort students are actively progressing with no critical alerts.
              </div>
            )}
          </div>

          {/* Pending Faculty Tasks */}
          <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-400" />
                Pending Faculty Command Center Tasks
              </h3>
              <span className="text-xs text-slate-400">{pendingFacultyTasks?.length || 0} Action Items</span>
            </div>

            <div className="space-y-2.5">
              {(pendingFacultyTasks || []).map((t: any) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{t.title}</div>
                    <div className="text-[10px] text-slate-400">Due: {t.due}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    t.priority === "High" ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : t.priority === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
