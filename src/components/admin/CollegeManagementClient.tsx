"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  ExternalLink,
  MapPin,
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { CollegesPageData, DetailedCollegeItem } from "@/lib/admin/admin-service";

interface CollegeManagementClientProps {
  initialData: CollegesPageData;
  highlightId?: string;
  autoOpenCreate?: boolean;
}

export function CollegeManagementClient({
  initialData,
  highlightId,
  autoOpenCreate = false,
}: CollegeManagementClientProps) {
  const router = useRouter();
  const [data, setData] = useState<CollegesPageData>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");
  const [sortBy, setSortBy] = useState<"name" | "departments" | "students" | "newest">("newest");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(autoOpenCreate);
  const [inspectDeptCollege, setInspectDeptCollege] = useState<DetailedCollegeItem | null>(null);

  // Create college form state
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter and sort colleges
  const filteredColleges = data.colleges
    .filter((col) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        col.name.toLowerCase().includes(q) ||
        (col.code && col.code.toLowerCase().includes(q)) ||
        (col.location && col.location.toLowerCase().includes(q));

      const statusUpper = (col.status || "").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && statusUpper === "ACTIVE") ||
        (statusFilter === "PENDING" && statusUpper !== "ACTIVE");

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "departments") return b.departmentsCount - a.departmentsCount;
      if (sortBy === "students") return b.studentsCount - a.studentsCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim() || newName.trim().length < 3) {
      setFormError("Please enter a valid college name (at least 3 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          code: newCode.trim() ? newCode.trim().toUpperCase() : undefined,
          location: newLocation.trim() || undefined,
          status: newStatus,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to register college.");
      }

      // Refresh list
      const fetchList = await fetch("/api/admin/colleges");
      const listJson = await fetchList.json();
      if (listJson.success && listJson.data) {
        setData(listJson.data);
      }

      // Reset form & close
      setNewName("");
      setNewCode("");
      setNewLocation("");
      setNewStatus("ACTIVE");
      setIsCreateModalOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP KPI COMMAND STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Colleges
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {data.kpis.totalColleges}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Verified institutions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Campuses
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {data.kpis.activeCount}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Live on platform</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Onboarding
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {data.kpis.pendingCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Awaiting student cohorts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Departments
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">
            {data.kpis.totalDepartments}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Engineering branches</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-2">
            {data.kpis.totalStudents}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Database verified</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Faculty Staff
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700 mt-2">
            {data.kpis.totalFaculty}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Teaching coordinators</span>
        </div>
      </div>

      {/* 2. SEARCH, FILTER & ACTION CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college name, code, or location..."
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "ALL"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({data.colleges.length})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active ({data.kpis.activeCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === "PENDING"
                  ? "bg-white text-amber-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Pending ({data.kpis.pendingCount})</span>
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="departments">Departments (High-Low)</option>
              <option value="students">Students (High-Low)</option>
            </select>
          </div>

          {/* Add College Action */}
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Onboard College</span>
          </button>
        </div>
      </div>

      {/* 3. COLLEGE CARDS GRID */}
      {filteredColleges.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery
              ? `No colleges match "${searchQuery}"`
              : "No colleges found in this category"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or filter to see registered institutions.
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredColleges.map((col) => {
            const isHighlighted = highlightId === col.id;
            const statusUpper = (col.status || "PENDING").toUpperCase();
            const isPlacementAvailable = col.placementOverview.hasData;

            return (
              <div
                key={col.id}
                className={`p-6 rounded-3xl bg-white border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5 ${
                  isHighlighted ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-blue-500/20">
                      <Building2 size={22} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          statusUpper === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : statusUpper === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusUpper === "ACTIVE"
                              ? "bg-emerald-500"
                              : statusUpper === "PENDING"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {statusUpper === "ACTIVE"
                          ? "Active"
                          : statusUpper === "PENDING"
                          ? "Pending Onboarding"
                          : col.status || "Status not configured"}
                      </span>
                    </div>
                  </div>

                  {/* College Identity: Name, Code & Location */}
                  <div>
                    <h3
                      className="text-base font-bold text-slate-900 leading-snug truncate"
                      title={col.name}
                    >
                      {col.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {col.code || "Code not assigned"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {col.location || "Location not added"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 2x2 Real Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                    {/* Metric 1: Departments */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Departments
                      </span>
                      <div className="mt-1">
                        {col.departmentsCount > 0 ? (
                          <div className="flex items-baseline justify-between">
                            <strong className="text-slate-900 text-sm font-black">
                              {col.departmentsCount} Depts
                            </strong>
                            <button
                              onClick={() => setInspectDeptCollege(col)}
                              className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                              Inspect
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-500">
                            0 Departments
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {col.departmentsCount > 0
                            ? col.departments.map((d) => d.code).join(", ")
                            : "No departments added yet"}
                        </span>
                      </div>
                    </div>

                    {/* Metric 2: Placement Rate (100% Real DB Only) */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Placement Rate
                      </span>
                      <div className="mt-1">
                        {isPlacementAvailable && col.placementOverview.placementRate !== null ? (
                          <>
                            <strong className="text-emerald-600 text-sm font-black">
                              {col.placementOverview.placementRate}% Placed
                            </strong>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              {col.placementOverview.placedCount} / {col.placementOverview.totalEligible} Eligible
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-slate-500 block">
                              No placement data yet
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              Start tracking placements
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metric 3: Students */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Enrolled Students
                      </span>
                      <div className="mt-1">
                        <strong className="text-slate-900 text-sm font-black">
                          {col.studentsCount} Students
                        </strong>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {col.studentsCount > 0 ? "Active learners" : "No students enrolled"}
                        </span>
                      </div>
                    </div>

                    {/* Metric 4: Faculty */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Faculty Staff
                      </span>
                      <div className="mt-1">
                        <strong className="text-slate-900 text-sm font-black">
                          {col.facultyCount} Faculty
                        </strong>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {col.facultyCount > 0 ? "Staff registered" : "No faculty assigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Code & Open Console */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {col.id.slice(0, 8)}...
                  </span>
                  <Link
                    href={`/dashboard/college?college=${encodeURIComponent(col.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>Open Console</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. ONBOARD NEW COLLEGE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Onboard New Institution
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Register a verified engineering campus on KnowledgeStream AI
                  </p>
                </div>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateCollege} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs font-medium">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  College Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Hyderabad Institute of Technology and Science"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900 font-medium transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">
                    College Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HITS"
                    maxLength={10}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900 font-mono font-medium uppercase transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">
                    Campus Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="ACTIVE">Active (Live Immediately)</option>
                    <option value="PENDING">Pending Onboarding</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  Location / City <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Gachibowli, Hyderabad, Telangana"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900 font-medium transition-colors"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Save Institution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DEPARTMENTS INSPECTION MODAL */}
      {inspectDeptCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectDeptCollege(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectDeptCollege.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {inspectDeptCollege.departmentsCount} Registered Departments
                </p>
              </div>
              <button
                onClick={() => setInspectDeptCollege(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {inspectDeptCollege.departments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No departments added to this college yet.
                </div>
              ) : (
                inspectDeptCollege.departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{dept.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Code: {dept.code}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                      {dept.classesCount} Classes
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectDeptCollege(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
