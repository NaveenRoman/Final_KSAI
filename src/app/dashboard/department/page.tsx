"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  Sparkles,
  TrendingUp,
  Award,
  ShieldCheck,
  Download,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Bell,
  BookOpen,
  Code2,
  Clock,
  PlusCircle,
  FileText,
  LogOut,
  Brain,
  Layers,
  ArrowUpRight,
  BarChart3,
  Check,
  UserCheck,
  X,
} from "lucide-react";

import { useDashboardGuard } from "@/lib/useDashboardGuard";
import { getRoleDashboardPath } from "@/lib/roles";
import { handleUserLogout } from "@/lib/auth-logout";

function DepartmentAdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deptQuery = searchParams.get("dept");

  const { isAuthorized, currentUser } = useDashboardGuard([
    "DEPARTMENT_ADMIN",
    "FACULTY",
    "COLLEGE_ADMIN",
    "SUPER_ADMIN",
  ]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"7d" | "30d" | "sem">("7d");
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>("");
  const [activeTierFilter, setActiveTierFilter] = useState<string | null>(null);

  // Notice modal states
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [isPostingNotice, setIsPostingNotice] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState(false);
  const [noticeError, setNoticeError] = useState("");

  const fetchDepartmentData = async (deptParam?: string) => {
    setLoading(true);
    try {
      const activeDept = deptParam !== undefined ? deptParam : deptQuery || "";
      const queryParam = activeDept ? `?dept=${encodeURIComponent(activeDept)}` : "";
      const res = await fetch(`/api/dashboard/department${queryParam}`);

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
        if (json.department?.code) {
          setSelectedDeptCode(json.department.code);
        }
      }
    } catch (err: any) {
      console.error("Error loading department dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDepartmentData();
    }
  }, [isAuthorized, deptQuery]);

  // Handle department switch for College Admin / Super Admin
  const handleDepartmentSwitch = (code: string) => {
    setSelectedDeptCode(code);
    fetchDepartmentData(code);
  };

  // Handle notice submission
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    setIsPostingNotice(true);
    setNoticeError("");

    try {
      const res = await fetch("/api/dashboard/department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noticeTitle.trim(),
          content: noticeContent.trim(),
          departmentId: data?.department?.id,
        }),
      });

      const resJson = await res.json();
      if (resJson.success && resJson.announcement) {
        setNoticeSuccess(true);
        // Prepend newly posted announcement to live state
        setData((prev: any) => ({
          ...prev,
          announcements: [resJson.announcement, ...(prev?.announcements || [])],
        }));

        setTimeout(() => {
          setShowNoticeModal(false);
          setNoticeSuccess(false);
          setNoticeTitle("");
          setNoticeContent("");
        }, 1200);
      } else {
        setNoticeError(resJson.error || "Failed to post announcement");
      }
    } catch (err: any) {
      setNoticeError(err.message || "Failed to communicate with server");
    } finally {
      setIsPostingNotice(false);
    }
  };

  // Export Department Dossier CSV
  const handleExportDossier = () => {
    if (!data || !data.department) return;

    const { department, overviewStats, classes, facultyOverview } = data;
    const now = new Date().toISOString().split("T")[0];

    let csv = `KnowledgeStream AI - Academic Department Dossier\n`;
    csv += `Department:,"${department.name} (${department.code})"\n`;
    csv += `College:,"${department.collegeName}"\n`;
    csv += `Head of Department:,"${department.hodName} (${department.hodEmail})"\n`;
    csv += `Generated Date:,"${now}"\n\n`;

    csv += `KEY PERFORMANCE INDICATORS\n`;
    csv += `Total Registered Student Accounts,${overviewStats.totalStudents.value}\n`;
    csv += `Total Section Seat Capacity,${overviewStats.totalStudents.sectionCapacity || 153}\n`;
    csv += `Active Students (7d),${overviewStats.activeStudents7d.value}\n`;
    csv += `Learning Engagement,${overviewStats.learningEngagement.value}\n`;
    csv += `Active Faculty Staff,${overviewStats.facultyCount.value}\n`;
    csv += `Active Classes,${overviewStats.activeClassesCount.value}\n`;
    csv += `Curriculum Benchmark Average,${overviewStats.activeClassesCount.avgScore || 0}%\n\n`;

    csv += `ACADEMIC CLASSES & SECTION COHORTS\n`;
    csv += `Class Name,Subject,Faculty Incharge,Section Capacity,Curriculum Benchmark,Status\n`;
    (classes || []).forEach((c: any) => {
      csv += `"${c.name}","${c.subject}","${c.facultyName}",${c.totalStudents},${c.avgScore}%,${c.status}\n`;
    });
    csv += `\n`;

    csv += `FACULTY & TEACHING STAFF\n`;
    csv += `Faculty Name,Email,Role,Assigned Classes,Section Capacity Covered,Status\n`;
    (facultyOverview || []).forEach((f: any) => {
      csv += `"${f.name}","${f.email}","${f.role}",${f.assignedClassesCount},${f.studentsCovered},"${f.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Department_Dossier_${department.code}_${now}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Academic Department Command Center...</p>
      </div>
    );
  }

  const {
    department,
    overviewStats,
    performanceDistribution,
    studentsNeedingAttention,
    facultyOverview,
    classes,
    aiInsights,
    announcements,
    recentActivity,
    availableDepartments,
    authenticatedUser,
  } = data || {};

  const isDepartmentAssigned = Boolean(department);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-40 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/85 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  KnowledgeStream AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {department?.code || "DEPT"} Command
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                {department?.name || "Department Workspace"} • {department?.collegeName || authenticatedUser?.college || "Institutional Platform"}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Sibling Department Selector for College Admin or Super Admin */}
          {(authenticatedUser?.role === "COLLEGE_ADMIN" || authenticatedUser?.role === "SUPER_ADMIN") &&
            availableDepartments &&
            availableDepartments.length > 1 && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <Layers size={13} className="text-indigo-400" />
                <span className="text-slate-400 text-[11px] font-semibold">Department:</span>
                <select
                  value={selectedDeptCode}
                  onChange={(e) => handleDepartmentSwitch(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {availableDepartments.map((d: any) => (
                    <option key={d.id} value={d.code} className="bg-[#0B0F1C] text-white">
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

          <Link
            href="/dashboard/college"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all"
          >
            <Building2 size={14} className="text-blue-400" />
            <span>College Overview</span>
          </Link>

          <button
            onClick={() => fetchDepartmentData()}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw size={15} />
          </button>

          {/* User Profile Info */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-md">
              {authenticatedUser?.name ? authenticatedUser.name.charAt(0) : "H"}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white">{authenticatedUser?.name || department?.hodName || "HOD Office"}</div>
              <div className="text-[10px] text-indigo-400 font-semibold">
                {authenticatedUser?.role === "DEPARTMENT_ADMIN"
                  ? "Head of Department"
                  : authenticatedUser?.role === "COLLEGE_ADMIN"
                  ? "College Administrator"
                  : authenticatedUser?.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : "Department Faculty"}
              </div>
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

      {/* Main Department Command Center Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Section: Academic Department Command Center */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/70 via-[#0E1326] to-[#0A0D18] border border-indigo-500/25 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-500/15 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                <Sparkles size={13} className="text-indigo-400" />
                <span>Academic Department Command Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {department ? `Department of ${department.name}` : "Department Command Center"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300">
                <span>
                  Head of Department: <strong className="text-white">{department?.hodName || "Dr. K. Srinivas"}</strong>
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span>
                  Institution: <strong className="text-white">{department?.collegeName || "KG Reddy College"}</strong>
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="text-indigo-300 font-semibold">
                  Semester V • 2024-2025
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowNoticeModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 transition-all shadow-sm"
              >
                <Bell size={14} className="text-indigo-400" />
                <span>Post Notice</span>
              </button>

              <button
                onClick={handleExportDossier}
                disabled={!isDepartmentAssigned}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Download size={14} />
                <span>Export Dossier</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 Real Overview KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Students */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Total Students</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <GraduationCap size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.totalStudents?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-slate-400 truncate" title={overviewStats?.totalStudents?.subtitle}>
              {overviewStats?.totalStudents?.subtitle || "Registered learners"}
            </div>
          </div>

          {/* Card 2: Active Students (7d) */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Active (7 Days)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.activeStudents7d?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>{overviewStats?.activeStudents7d?.subtitle || "Active learners"}</span>
            </div>
          </div>

          {/* Card 3: Faculty Members */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Faculty Staff</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Users size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.facultyCount?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-blue-400 truncate" title={overviewStats?.facultyCount?.subtitle}>
              {overviewStats?.facultyCount?.subtitle || "Active teaching staff"}
            </div>
          </div>

          {/* Card 4: Active Classes */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Active Classes</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BookOpen size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.activeClassesCount?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-purple-400 truncate" title={overviewStats?.activeClassesCount?.subtitle}>
              {overviewStats?.activeClassesCount?.subtitle || "Assigned cohorts"}
            </div>
          </div>

          {/* Card 5: Learning Engagement */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-amber-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Engagement Rate</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <BarChart3 size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.learningEngagement?.value ?? "0.0%"}</div>
            <div className="mt-1 text-[10px] font-medium text-amber-400 truncate">
              {overviewStats?.learningEngagement?.subtitle || "Weekly rate"}
            </div>
          </div>

          {/* Card 6: AI Learning Activity */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-rose-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">AI Activity</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <Brain size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.aiLearningActivity?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-rose-400 truncate" title={overviewStats?.aiLearningActivity?.subtitle}>
              {overviewStats?.aiLearningActivity?.subtitle || "Tracked AI events"}
            </div>
          </div>
        </div>

        {/* 2-Column Command Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 of 12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section 2: Department Performance Overview & Curriculum Progression */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-400" />
                    Curriculum Benchmarks & Section Cohort Capacity
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target curriculum syllabus benchmarks and section intake capacities across active classes
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setSelectedTimeframe("7d")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedTimeframe === "7d" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setSelectedTimeframe("30d")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedTimeframe === "30d" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setSelectedTimeframe("sem")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      selectedTimeframe === "sem" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semester V
                  </button>
                </div>
              </div>

              {/* Department Benchmark Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-blue-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                    {overviewStats?.activeClassesCount?.avgScore ?? 0}%
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Curriculum Target Benchmark Average</div>
                    <div className="text-[11px] text-slate-400">
                      Target syllabus proficiency benchmark across {classes?.length || 0} active department sections
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 self-start sm:self-auto">
                  <CheckCircle2 size={13} />
                  <span>Target Curriculum Standard</span>
                </span>
              </div>

              {/* Class by Class Progress List */}
              <div className="space-y-3 pt-1">
                {classes && classes.length > 0 ? (
                  classes.map((cls: any) => (
                    <div
                      key={cls.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 sm:max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {cls.name}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{cls.subject}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Incharge: <strong className="text-slate-200">{cls.facultyName}</strong> • Section Capacity: <strong className="text-slate-200">{cls.totalStudents} seats</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="w-28 sm:w-36 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Benchmark Target:</span>
                            <span className="font-bold text-emerald-400">{cls.avgScore}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, cls.avgScore)}%` }}
                            />
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold tracking-wider uppercase border ${
                          cls.avgScore >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                        }`}>
                          {cls.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                    <BookOpen size={28} className="mx-auto text-slate-500" />
                    <p className="text-xs font-bold text-slate-300">No classes assigned to this department yet</p>
                    <p className="text-[11px] text-slate-500">Classes will appear as academic cohorts are enrolled.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Faculty & Teaching Staff Overview */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-blue-400" />
                    Faculty & Teaching Staff Directory
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assigned faculty members, class portfolios, and section capacity allocations
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {facultyOverview?.length || 0} Registered Staff
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {facultyOverview && facultyOverview.length > 0 ? (
                  facultyOverview.map((fac: any) => (
                    <div
                      key={fac.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 font-black text-sm shrink-0">
                          {fac.name.charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white leading-tight">{fac.name}</h4>
                          <p className="text-[11px] text-indigo-300 font-semibold">{fac.role}</p>
                          <p className="text-[10px] text-slate-400 truncate">{fac.email}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                          <div className="text-[10px] text-slate-400">Assigned Classes</div>
                          <div className="font-bold text-white mt-0.5">{fac.assignedClassesCount} Classes</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02]">
                          <div className="text-[10px] text-slate-400">Section Capacity</div>
                          <div className="font-bold text-emerald-400 mt-0.5">{fac.studentsCovered} Seats</div>
                        </div>
                      </div>

                      {fac.assignedClasses && fac.assignedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {fac.assignedClasses.slice(0, 3).map((clsName: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                              {clsName}
                            </span>
                          ))}
                          {fac.assignedClasses.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-indigo-400">
                              +{fac.assignedClasses.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                    <Users size={28} className="mx-auto text-slate-500" />
                    <p className="text-xs font-bold text-slate-300">No faculty assigned to this department</p>
                    <p className="text-[11px] text-slate-500">Registered department faculty will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Students Needing Attention (Intervention Radar) */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-400" />
                    Academic Intervention Radar
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Proactive detection of learners with learning deficits or extended platform inactivity
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {studentsNeedingAttention?.count || 0} Flagged
                </span>
              </div>

              {studentsNeedingAttention && studentsNeedingAttention.count > 0 ? (
                <div className="space-y-3 pt-1">
                  {studentsNeedingAttention.students.map((student: any) => (
                    <div
                      key={student.id}
                      className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{student.name}</span>
                          <span className="text-[10px] text-slate-400">{student.email}</span>
                        </div>
                        <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                          <AlertTriangle size={12} />
                          <span>Flag Reason: {student.reason}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Total XP</div>
                          <div className="font-bold text-white">{student.xp} XP</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Last Activity</div>
                          <div className="font-bold text-slate-300">{student.lastActive}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-300">All Department Students On Track</div>
                    <p className="text-[11px] text-slate-300">
                      {studentsNeedingAttention?.emptyMessage || "No students currently require intervention. All registered department learners are meeting engagement benchmarks."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 of 12) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Section 4: Student Performance Distribution */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award size={18} className="text-indigo-400" />
                  Performance Distribution
                </h3>
                <span className="text-[10px] font-bold text-slate-400">XP Scoring Matrix</span>
              </div>

              <p className="text-xs text-slate-400">
                Categorization of {overviewStats?.totalStudents?.value || 0} registered department learners by platform mastery
              </p>

              <div className="space-y-2.5 pt-2">
                {/* Advanced */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Advanced (&gt;4,000 XP)</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {performanceDistribution?.excellent?.count ?? 0} Students ({performanceDistribution?.excellent?.percent ?? "0.0"}%)
                  </span>
                </div>

                {/* Good Progress */}
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="text-xs font-semibold text-slate-200">Good (2,500 - 3,999 XP)</span>
                  </div>
                  <span className="text-xs font-bold text-blue-400">
                    {performanceDistribution?.good?.count ?? 0} Students ({performanceDistribution?.good?.percent ?? "0.0"}%)
                  </span>
                </div>

                {/* Needs Attention */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Needs Attention (1,000 - 2,499 XP)</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">
                    {performanceDistribution?.needsAttention?.count ?? 0} Students ({performanceDistribution?.needsAttention?.percent ?? "0.0"}%)
                  </span>
                </div>

                {/* At Risk */}
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-xs font-semibold text-slate-200">At Risk (&lt;1,000 XP)</span>
                  </div>
                  <span className="text-xs font-bold text-rose-400">
                    {performanceDistribution?.atRisk?.count ?? 0} Students ({performanceDistribution?.atRisk?.percent ?? "0.0"}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Section 6: Department AI Diagnostics */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain size={18} className="text-purple-400" />
                  AI Academic Diagnostics
                </h3>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              </div>

              {aiInsights && aiInsights.hasData && aiInsights.insights.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.insights.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          item.type === "success"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : item.type === "warning"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                        }`}>
                          {item.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">{item.impact}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{item.description}</p>
                      <div className="pt-1 text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                        <span>Action:</span>
                        <span className="text-slate-300 font-normal">{item.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-center space-y-2">
                  <Brain size={24} className="mx-auto text-purple-400/60" />
                  <p className="text-xs font-bold text-slate-300">
                    {aiInsights?.emptyMessage || "AI insights will appear as department learning activity grows."}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Automated analysis monitors concept mastery, compiler errors, and quiz retention.
                  </p>
                </div>
              )}
            </div>

            {/* Section 9: Department & College Notices */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell size={18} className="text-blue-400" />
                  Department Notices & Circulars
                </h3>
                <button
                  onClick={() => setShowNoticeModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                >
                  + Add Notice
                </button>
              </div>

              {announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((anc: any) => (
                    <div
                      key={anc.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/25 transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                          anc.source === "Department Notice"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                          {anc.source}
                        </span>
                        <span className="text-slate-500">{anc.date}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{anc.title}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{anc.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                  <Bell size={20} className="mx-auto text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">No announcements posted yet</p>
                </div>
              )}
            </div>

            {/* Section 8: Real-Time Department Activity Feed */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                Recent Department Activity
              </h3>

              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((act: any) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="font-bold text-white truncate">{act.user}</div>
                        <div className="text-[11px] text-slate-400">
                          {act.action} • <span className="text-indigo-400 font-semibold">{act.role}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">{act.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                  <Clock size={20} className="mx-auto text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">No recent department activity</p>
                  <p className="text-[10px] text-slate-500">Real-time learning events will populate as students practice.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Post Department Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0F1424] border border-indigo-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Post Department Notice</h3>
                <p className="text-xs text-slate-400">Broadcast official notification to department faculty & students</p>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {noticeSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                <span>Notice published successfully to department bulletin!</span>
              </div>
            ) : (
              <form onSubmit={handlePostNotice} className="space-y-4">
                {noticeError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
                    {noticeError}
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">Notice Title</label>
                  <input
                    type="text"
                    required
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="e.g. End Semester Lab Practical Examination Schedule"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">Announcement Details</label>
                  <textarea
                    required
                    rows={4}
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    placeholder="Provide full instructions, timeline, and guidelines for students and faculty..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNoticeModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPostingNotice}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    {isPostingNotice && <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                    <span>Publish Notice</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepartmentAdminDashboard() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center">
          Loading Academic Department Command Center...
        </div>
      }
    >
      <DepartmentAdminDashboardContent />
    </React.Suspense>
  );
}
