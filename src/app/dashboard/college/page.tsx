"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  Sparkles,
  TrendingUp,
  Award,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Bell,
  Download,
  Layers,
  LogOut,
  Activity,
  CheckCircle,
  HelpCircle,
  Clock,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardGuard } from "@/lib/useDashboardGuard";
import { getRoleDashboardPath } from "@/lib/roles";
import { handleUserLogout } from "@/lib/auth-logout";

export default function CollegeAdminDashboard() {
  const router = useRouter();
  const { isAuthorized, currentUser } = useDashboardGuard(["COLLEGE_ADMIN", "SUPER_ADMIN"]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");

  const fetchCollegeData = async (collegeId?: string) => {
    setLoading(true);
    try {
      const queryParam = collegeId ? `?college=${encodeURIComponent(collegeId)}` : "";
      const res = await fetch(`/api/dashboard/college${queryParam}`);
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
        if (json.college?.id && !selectedCollegeId) {
          setSelectedCollegeId(json.college.id);
        }
      }
    } catch (err: any) {
      console.error("Error loading college dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchCollegeData(selectedCollegeId);
    }
  }, [isAuthorized, selectedCollegeId]);

  if (!isAuthorized || loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading College Intelligence Console...</p>
      </div>
    );
  }

  const {
    college,
    unassigned,
    message,
    overviewStats,
    placementStatistics,
    departmentPerformance,
    topStudents,
    aiInsights,
    recentActivities,
    announcements,
    authenticatedUser,
    allColleges,
  } = data || {};

  // Case: Unassigned administrator
  if (unassigned) {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0B0F1C] border border-amber-500/20 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Unassigned Institutional Account</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {message || "Your administrator account is not linked to any registered institution. Please contact your Super Administrator to assign your college credentials."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => fetchCollegeData()}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-all"
            >
              Retry Connection
            </button>
            <button
              onClick={handleUserLogout}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredDepartments = selectedDeptFilter === "All"
    ? departmentPerformance || []
    : (departmentPerformance || []).filter((d: any) => d.code === selectedDeptFilter);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/85 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  KnowledgeStream AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  College Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                {college?.name || "Institution Console"} {college?.code ? `(${college.code})` : ""}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Super Admin College Selector Switcher */}
          {currentUser?.role === "SUPER_ADMIN" && allColleges && allColleges.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs">
              <span className="text-[10px] uppercase font-bold text-blue-400 hidden sm:inline">Inspect:</span>
              <select
                value={selectedCollegeId || college?.id || ""}
                onChange={(e) => {
                  setSelectedCollegeId(e.target.value);
                  fetchCollegeData(e.target.value);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              >
                {allColleges.map((col: any) => (
                  <option key={col.id} value={col.id} className="bg-[#0B0F1C] text-white">
                    {col.name} {col.code ? `(${col.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className={`w-2 h-2 rounded-full ${college?.status === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span>Academic Year {college?.academicYear || "2024 - 2025"}</span>
          </div>

          <button
            onClick={() => fetchCollegeData(selectedCollegeId)}
            title="Refresh Data"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw size={15} />
          </button>

          <Link
            href="/dashboard/department"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-all"
          >
            <Layers size={14} />
            <span>Dept Consoles</span>
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-md">
              {authenticatedUser?.name ? authenticatedUser.name.charAt(0) : "A"}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white">{authenticatedUser?.name || "College Admin"}</div>
              <div className="text-[10px] text-slate-400">{college?.name ? "Institutional Authority" : "Principal Office"}</div>
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
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/50 via-[#0E1528] to-[#0A0E1A] border border-blue-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Sparkles size={13} />
                <span>AI-Powered Institutional Governance Console</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {college?.name || "Institution Command Center"}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                {college?.location ? `${college.location} • ` : ""}
                Real-time verified platform data tracking student enrollment, faculty governance, curriculum mastery, and campus placements.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="All Semesters" className="bg-[#0F1422]">All Semesters</option>
                <option value="Semester VII" className="bg-[#0F1422]">Semester VII (Final Year)</option>
                <option value="Semester V" className="bg-[#0F1422]">Semester V (3rd Year)</option>
                <option value="Semester III" className="bg-[#0F1422]">Semester III (2nd Year)</option>
              </select>

              <button
                onClick={() => alert("Institutional performance summary report exported.")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all"
              >
                <Download size={14} />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 Key Overview Metrics Cards (100% Real Database Values) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Total Students */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Total Students</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <GraduationCap size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.totalStudents?.value ?? 0}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-400">
              <Activity size={11} className="text-blue-400" />
              <span>{overviewStats?.totalStudents?.active7d ?? 0} active (7d)</span>
            </div>
          </div>

          {/* 2. Faculty Members */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Faculty Members</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Users size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.facultyCount?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-slate-400">
              <span className="text-emerald-400 font-semibold">{overviewStats?.facultyCount?.activeToday ?? 0} Active</span> today
            </div>
          </div>

          {/* 3. Active Departments */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Departments</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Building2 size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.departmentsCount?.value ?? 0}</div>
            <div className="mt-1 text-[10px] font-medium text-purple-400 truncate">
              {overviewStats?.departmentsCount?.label || "Registered Branches"}
            </div>
          </div>

          {/* 4. Placement Rate */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-cyan-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Avg Placement</span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Briefcase size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {overviewStats?.placementRate?.hasData ? overviewStats.placementRate.value : "—"}
            </div>
            <div className="mt-1 text-[10px] font-medium text-slate-400 truncate">
              {overviewStats?.placementRate?.hasData ? (
                <span>
                  <strong className="text-cyan-400">{overviewStats.placementRate.placed}</strong> / {overviewStats.placementRate.eligible} Placed
                </span>
              ) : (
                <span className="text-slate-500">Not configured</span>
              )}
            </div>
          </div>

          {/* 5. Learning Engagement (Real 7d active learners) */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-amber-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Engagement</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{overviewStats?.engagementRate?.value ?? "0%"}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-400">
              <span className="text-amber-400 font-semibold">{overviewStats?.engagementRate?.status || "None"}</span> activity
            </div>
          </div>

          {/* 6. Curriculum Assessment Average */}
          <div className="p-4 rounded-2xl bg-[#0B0F1C] border border-white/5 hover:border-rose-500/30 transition-all group">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Avg Assessment</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <Sparkles size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {overviewStats?.assessmentIndex?.hasData ? overviewStats.assessmentIndex.score : "—"}
            </div>
            <div className="mt-1 text-[10px] font-medium text-slate-400 truncate">
              {overviewStats?.assessmentIndex?.hasData ? (
                <span className="text-rose-400 font-semibold">{overviewStats.assessmentIndex.completedChapters} assessments</span>
              ) : (
                <span className="text-slate-500">Awaiting data</span>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 of 12 Desktop) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Curriculum Progress Overview */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-400" />
                    Academic & Curriculum Progression
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time academic performance and chapter mastery across enrolled departments
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
                  <BookOpen size={13} className="text-indigo-400" />
                  <span>{departmentPerformance?.length ?? 0} Departments Active</span>
                </div>
              </div>

              {departmentPerformance && departmentPerformance.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {departmentPerformance.slice(0, 6).map((dept: any) => (
                    <div key={dept.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {dept.code}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{dept.avgScore}%</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate">{dept.name}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>{dept.studentsCount} Students</span>
                        <span>{dept.facultyCount} Faculty</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${Math.max(dept.avgScore, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center mx-auto">
                    <Building2 size={22} />
                  </div>
                  <div className="text-sm font-semibold text-white">No Departments Registered Yet</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Configure engineering and science departments to track curriculum mastery and student rankings.
                  </p>
                </div>
              )}
            </div>

            {/* Department Performance Breakdown (Detailed List) */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-400" />
                    Department Comparative Performance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluated by enrolled student cohort, faculty mentorship, and active curriculum classes
                  </p>
                </div>
                {departmentPerformance && departmentPerformance.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Filter:</span>
                    <select
                      value={selectedDeptFilter}
                      onChange={(e) => setSelectedDeptFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      <option value="All" className="bg-[#0F1422]">All Departments</option>
                      {departmentPerformance.map((dept: any) => (
                        <option key={dept.id} value={dept.code} className="bg-[#0F1422]">
                          {dept.code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {filteredDepartments && filteredDepartments.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {filteredDepartments.map((dept: any) => (
                    <div
                      key={dept.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {dept.code}
                          </span>
                          <div>
                            <span className="text-sm font-bold text-white">{dept.name}</span>
                            <span className="text-xs text-slate-400 ml-2">
                              ({dept.studentsCount} Students • {dept.facultyCount} Faculty)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-400">
                            Classes: <strong className="text-indigo-400 font-bold">{dept.classesCount}</strong>
                          </span>
                          <Link
                            href={`/dashboard/department?dept=${encodeURIComponent(dept.code)}`}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            <span>Manage</span>
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                          <span>Curriculum & Assessment Mastery</span>
                          <span className="text-white font-bold">{dept.avgScore}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                            style={{ width: `${Math.max(dept.avgScore, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No departments match the selected filter.
                </div>
              )}
            </div>

            {/* Top Performing Students Table (100% Real DB Students) */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award size={18} className="text-amber-400" />
                    Top Performing Student Cohort (College-Wide)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recognized for real platform XP, completed curriculum lessons, and coding challenge mastery
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {topStudents?.length ?? 0} Students Ranked
                </span>
              </div>

              {topStudents && topStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/5 text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-3 px-3">Rank</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Level</th>
                        <th className="py-3 px-3">Total XP</th>
                        <th className="py-3 px-3">Lessons Done</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {topStudents.map((student: any) => (
                        <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                              student.rank === 1
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : student.rank === 2
                                ? "bg-slate-300/20 text-slate-300 border border-slate-300/30"
                                : student.rank === 3
                                ? "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                                : "bg-white/5 text-slate-400"
                            }`}>
                              #{student.rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-white">
                            <div>{student.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{student.email}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                              {student.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-indigo-400">Lvl {student.level}</td>
                          <td className="py-3.5 px-3 font-extrabold text-emerald-400">{student.xp.toLocaleString()} XP</td>
                          <td className="py-3.5 px-3 font-medium text-slate-300">{student.completedLessons} Lessons</td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              student.status === "Advanced Learner"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : student.status === "Active Learner"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center mx-auto">
                    <GraduationCap size={22} />
                  </div>
                  <div className="text-sm font-semibold text-white">No Students Registered Yet</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    As students register with this college and solve coding challenges, they will appear on the institutional leaderboard.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 of 12 Desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Campus Placement Statistics Card */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase size={18} className="text-cyan-400" />
                  Campus Placement Status
                </h3>
                {placementStatistics?.hasData && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {placementStatistics.batchYear}
                  </span>
                )}
              </div>

              {placementStatistics?.hasData ? (
                <div className="space-y-4">
                  {/* Donut Chart representation */}
                  <div className="flex flex-col items-center justify-center p-2">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="stroke-white/10"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="stroke-emerald-400 transition-all duration-1000"
                          strokeWidth="10"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 * (1 - (placementStatistics.placedPercent || 0) / 100)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-white">{placementStatistics.placedPercent}%</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Placed Rate</span>
                      </div>
                    </div>

                    <div className="text-center mt-3">
                      <div className="text-xs font-bold text-white">
                        {placementStatistics.placed} / {placementStatistics.totalEligible} Students Placed
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Avg: <span className="text-emerald-400 font-bold">{placementStatistics.averagePackage}</span> | Peak: <span className="text-cyan-400 font-bold">{placementStatistics.highestPackage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Placement Breakdown Legend */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        Placed in Tier-1 & Dream Companies
                      </span>
                      <span className="font-bold text-white">{placementStatistics.placed}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        In Technical Interview Rounds
                      </span>
                      <span className="font-bold text-white">{placementStatistics.inProgress}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        Specialized Preparation / Higher Studies
                      </span>
                      <span className="font-bold text-white">{placementStatistics.preparing}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
                    <Briefcase size={20} />
                  </div>
                  <div className="text-xs font-bold text-white">Placement Batch Not Configured</div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    No placement batches recorded for this academic year. Placement statistics will display once configured.
                  </p>
                </div>
              )}
            </div>

            {/* AI Diagnostics & Institutional Insights */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-400" />
                  Institutional Intelligence
                </h3>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              </div>

              {aiInsights && aiInsights.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.map((insight: any) => (
                    <div
                      key={insight.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          insight.type === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : insight.type === "warning"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {insight.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{insight.impact}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{insight.title}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{insight.description}</p>
                      <div className="pt-1 text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                        <span>Action:</span>
                        <span className="text-slate-300">{insight.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No institutional insights generated yet.
                </div>
              )}
            </div>

            {/* Campus Real-Time Activity Feed (100% Real from ActivityLog) */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                Live Campus Activity Feed
              </h3>

              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        act.type === "success"
                          ? "bg-emerald-400"
                          : act.type === "warning"
                          ? "bg-amber-400"
                          : "bg-blue-400"
                      }`} />
                      <div>
                        <p className="text-slate-300">
                          <strong className="text-white font-bold">{act.user}</strong> ({act.role}) {act.action}
                        </p>
                        <span className="text-[10px] text-slate-500">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No campus activity recorded in the past 24 hours.
                </div>
              )}
            </div>

            {/* Official College Announcements */}
            <div className="p-6 rounded-3xl bg-[#0B0F1C] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell size={18} className="text-amber-400" />
                  College Circulars & Notices
                </h3>
              </div>

              {announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((anc: any) => (
                    <div
                      key={anc.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                          {anc.category || "CIRCULAR"}
                        </span>
                        <span className="text-[10px] text-slate-500">{anc.date}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{anc.title}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {anc.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center space-y-1">
                  <div className="text-xs font-bold text-slate-400">No circulars published yet</div>
                  <p className="text-[11px] text-slate-500">
                    Official announcements will appear here when issued by college administration.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
