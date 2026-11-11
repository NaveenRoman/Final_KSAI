"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  BookOpen,
  Calendar,
  DollarSign,
  Receipt,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  X,
  AlertTriangle,
  Award,
  Zap,
} from "lucide-react";

export interface CourseProgressDetail {
  courseId: string;
  title: string;
  language: string;
  progressPercentage: number;
  completedChapters: number;
  totalChapters: number;
}

export interface StudentProgressSummary {
  overallPercentage: number;
  completedChaptersCount: number;
  totalChaptersCount: number;
  courses: CourseProgressDetail[];
}

export interface RenewalHistoryItem {
  subscriptionId: string;
  plan: string;
  status: string;
  durationMonths: number;
  startDate: string | Date;
  endDate: string | Date;
  totalAmount: number;
  paymentId: string | null;
  orderId: string | null;
  receipt: string | null;
}

export interface UpgradeHistoryItem {
  isUpgrade: boolean;
  previousSubscriptionId?: string | null;
  unusedCreditApplied: number;
  originalBasicTotal?: number | null;
  explanation?: string | null;
}

export interface SubscriptionItem {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentRole: string;
  studentJoinedAt: string | Date;
  plan: "BASIC" | "PRO";
  durationMonths: number;
  billingInterval: string;
  status: "ACTIVE" | "EXPIRED" | "UPGRADED" | "CANCELLED";
  originalDbStatus: string;
  baseAmount: number;
  gstAmount: number;
  feeAmount: number;
  totalAmount: number;
  currency: string;
  paymentId: string | null;
  orderId: string | null;
  receipt: string | null;
  paymentStatus: string;
  purchaseDate: string | Date;
  startDate: string | Date;
  endDate: string | Date;
  daysRemaining: number;
  subjects: string[];
  courseTitles: string[];
  courseProgress: StudentProgressSummary;
  renewalHistory: RenewalHistoryItem[];
  upgradeHistory: UpgradeHistoryItem | null;
  isLivePayment: boolean;
}

export interface SummaryStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  proCount: number;
  basicCount: number;
  totalRevenue: number;
  formattedTotalRevenue: string;
}

export interface SubscriptionManagementClientProps {
  initialSubscriptions: SubscriptionItem[];
  summaryStats: SummaryStats;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSearch?: string;
  currentPlanFilter?: string;
  currentStatusFilter?: string;
  currentTimeframe?: string;
}

export function SubscriptionManagementClient({
  initialSubscriptions,
  summaryStats,
  totalCount,
  currentPage = 1,
  pageSize = 20,
  currentSearch = "",
  currentPlanFilter = "ALL",
  currentStatusFilter = "ALL",
  currentTimeframe = "all",
}: SubscriptionManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [subscriptions] = useState<SubscriptionItem[]>(initialSubscriptions);
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [selectedPlan, setSelectedPlan] = useState(currentPlanFilter);
  const [selectedStatus, setSelectedStatus] = useState(currentStatusFilter);
  const [selectedTimeframe, setSelectedTimeframe] = useState(currentTimeframe);

  // Modal / Detail state
  const [selectedSub, setSelectedSub] = useState<SubscriptionItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyFilters = (newOverrides?: {
    search?: string;
    plan?: string;
    status?: string;
    timeframe?: string;
    page?: number;
  }) => {
    const s = newOverrides?.search !== undefined ? newOverrides.search : searchQuery;
    const p = newOverrides?.plan !== undefined ? newOverrides.plan : selectedPlan;
    const st = newOverrides?.status !== undefined ? newOverrides.status : selectedStatus;
    const tf = newOverrides?.timeframe !== undefined ? newOverrides.timeframe : selectedTimeframe;
    const pg = newOverrides?.page !== undefined ? newOverrides.page : 1;

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (p && p !== "ALL") params.set("subPlan", p);
    if (st && st !== "ALL") params.set("subStatus", st);
    if (tf && tf !== "all") params.set("subTimeframe", tf);
    if (pg > 1) params.set("subPage", String(pg));

    startTransition(() => {
      router.push(`/admin/subscriptions?${params.toString()}`);
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const formatDate = (val: string | Date | undefined) => {
    if (!val) return "—";
    const d = new Date(val);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimestampExact = (val: string | Date | undefined) => {
    if (!val) return "—";
    const d = new Date(val);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const statusBadge = (s: SubscriptionItem["status"]) => {
    switch (s) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} className="text-emerald-600" /> ACTIVE
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock size={11} className="text-slate-500" /> EXPIRED
          </span>
        );
      case "UPGRADED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles size={11} className="text-purple-600" /> UPGRADED TO PRO
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} className="text-rose-600" /> CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Subscriptions */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Subscriptions
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {summaryStats.totalSubscriptions}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime all tiers</p>
        </div>

        {/* Active Subscriptions */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Active Students
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {summaryStats.activeSubscriptions}
          </div>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Current platform access</p>
        </div>

        {/* Expired Subscriptions */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Expired
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
            {summaryStats.expiredSubscriptions}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Ready for renewal</p>
        </div>

        {/* Pro Plan */}
        <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Pro Career Tier
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {summaryStats.proCount}
          </div>
          <p className="text-[10px] text-purple-600/80 mt-0.5">Full 4 courses + AI</p>
        </div>

        {/* Basic Plan */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Basic Tier
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {summaryStats.basicCount}
          </div>
          <p className="text-[10px] text-blue-600/80 mt-0.5">Curriculum access</p>
        </div>

        {/* Total Subscription Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Sub Revenue
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {summaryStats.formattedTotalRevenue}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Incl. 18% GST liability</p>
        </div>
      </div>

      {/* 2. MAIN TABLE CONTAINER */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        {/* Controls: Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-blue-600" />
              Student Subscription Entitlements
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live status · Exact validity window · Course progress · Verified Razorpay receipts
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters({ search: searchQuery });
                }}
                placeholder="Search student, email, ID, payment..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value);
                handleApplyFilters({ plan: e.target.value });
              }}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="PRO">Pro Tier</option>
              <option value="BASIC">Basic Tier</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                handleApplyFilters({ status: e.target.value });
              }}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired</option>
              <option value="UPGRADED">Upgraded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Timeframe Filter */}
            <select
              value={selectedTimeframe}
              onChange={(e) => {
                setSelectedTimeframe(e.target.value);
                handleApplyFilters({ timeframe: e.target.value });
              }}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="1y">Last 1 Year</option>
            </select>

            <button
              onClick={() => handleApplyFilters()}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isPending ? "Filtering..." : "Search"}
            </button>
          </div>
        </div>

        {/* 3. SUBSCRIPTIONS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Plan &amp; Scope</th>
                <th className="py-3 px-3">Course Progress</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Validity Window</th>
                <th className="py-3 px-3">Days Left</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Transaction</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No subscriptions match the selected criteria.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isPro = sub.plan === "PRO";
                  const isExpiringSoon = sub.status === "ACTIVE" && sub.daysRemaining <= 3 && sub.daysRemaining > 0;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedSub(sub)}
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isPro
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {sub.studentName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {sub.studentName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                              {sub.studentEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Scope */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isPro
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              {sub.plan}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {sub.durationMonths}m
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {sub.subjects.map((subName, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-semibold"
                              >
                                {subName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Course Progress */}
                      <td className="py-3.5 px-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-700">
                              {sub.courseProgress?.overallPercentage ?? 0}%
                            </span>
                            <span className="text-slate-400">
                              {sub.courseProgress?.completedChaptersCount ?? 0} chapters
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                (sub.courseProgress?.overallPercentage ?? 0) >= 100
                                  ? "bg-emerald-500"
                                  : isPro
                                  ? "bg-purple-600"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${Math.min(100, sub.courseProgress?.overallPercentage ?? 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-3 font-mono">
                        <div className="font-black text-slate-900">
                          ₹{sub.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Base ₹{sub.baseAmount.toFixed(2)} + GST
                        </div>
                      </td>

                      {/* Validity Window */}
                      <td className="py-3.5 px-3">
                        <div className="text-[11px] text-slate-800 font-medium">
                          {formatDate(sub.startDate)} &rarr; {formatDate(sub.endDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Expires: {formatTimestampExact(sub.endDate)}
                        </div>
                      </td>

                      {/* Days Remaining */}
                      <td className="py-3.5 px-3">
                        {sub.status === "ACTIVE" ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isExpiringSoon
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            <Clock size={10} />
                            {sub.daysRemaining} {sub.daysRemaining === 1 ? "day" : "days"} left
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            0 days
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3">{statusBadge(sub.status)}</td>

                      {/* Transaction Details */}
                      <td className="py-3.5 px-3 font-mono text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {sub.paymentId ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <span>{sub.paymentId.slice(0, 14)}...</span>
                              <button
                                onClick={() => copyToClipboard(sub.paymentId!, sub.id + "-pay")}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copy Payment ID"
                              >
                                {copiedId === sub.id + "-pay" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">No payment ID</span>
                          )}
                          {sub.orderId && (
                            <div className="text-[9px] text-slate-400 truncate max-w-[100px]">
                              {sub.orderId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/60 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{subscriptions.length}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> subscriptions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleApplyFilters({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage <= 1 || isPending}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2.5 py-1 text-xs font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handleApplyFilters({ page: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage >= totalPages || isPending}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. SUBSCRIPTION DETAIL MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm uppercase ${
                    selectedSub.plan === "PRO"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {selectedSub.studentName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedSub.studentName}</span>
                    {statusBadge(selectedSub.status)}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedSub.studentEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid 1: Plan, Validity & Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A: Plan & Validity */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                  Membership &amp; Validity
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Plan Tier:</span>
                  <strong className="text-slate-900">{selectedSub.plan} ({selectedSub.durationMonths} Months)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Start Date:</span>
                  <span className="font-mono text-slate-700">{formatDate(selectedSub.startDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Exact Expiry:</span>
                  <span className="font-mono text-slate-900 font-bold">{formatTimestampExact(selectedSub.endDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Days Remaining:</span>
                  <span className="font-bold text-emerald-600">{selectedSub.daysRemaining} days</span>
                </div>
              </div>

              {/* Card B: Financial Receipt Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                  Verified Payment Line Items
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Base Price:</span>
                  <span className="font-mono text-slate-700">₹{selectedSub.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">GST (18%):</span>
                  <span className="font-mono text-slate-700">₹{selectedSub.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                  <span className="text-slate-900">Total Paid:</span>
                  <span className="font-mono text-emerald-600 text-sm">₹{selectedSub.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Order Receipt:</span>
                  <span className="font-mono">{selectedSub.receipt || "sub_receipt"}</span>
                </div>
              </div>
            </div>

            {/* Grid 2: Razorpay Verification Audit */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                Razorpay Cryptographic Audit Trail
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Payment ID:</span>
                  <span className="text-slate-800 font-bold">{selectedSub.paymentId || "Unrecorded"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Order ID:</span>
                  <span className="text-slate-800 font-bold">{selectedSub.orderId || "Unrecorded"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Student ID:</span>
                  <span className="text-slate-800">{selectedSub.userId}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Gateway Mode:</span>
                  <span className="text-emerald-700 font-bold">
                    {selectedSub.isLivePayment ? "Verified Live Gateway" : "Sandbox / Test"}
                  </span>
                </div>
              </div>
            </div>

            {/* Course Progress Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Course Completion Progress
                </span>
                <span className="text-xs font-bold text-blue-600">
                  Overall: {selectedSub.courseProgress?.overallPercentage ?? 0}%
                </span>
              </div>

              {selectedSub.courseProgress?.courses && selectedSub.courseProgress.courses.length > 0 ? (
                <div className="space-y-2">
                  {selectedSub.courseProgress.courses.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{c.title}</span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {c.completedChapters}/{c.totalChapters} chapters ({c.progressPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${c.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific course progression recorded yet.</p>
              )}
            </div>

            {/* Upgrade History Section (if applicable) */}
            {selectedSub.upgradeHistory && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-1.5 text-purple-900">
                <div className="flex items-center gap-2 font-bold text-purple-800">
                  <Sparkles size={14} /> Basic to Pro Upgrade Audit
                </div>
                <p className="text-[11px] leading-relaxed">
                  {selectedSub.upgradeHistory.explanation ||
                    `Previous Basic subscription entitlement credited (₹${selectedSub.upgradeHistory.unusedCreditApplied.toFixed(2)}). Upgraded to Pro without losing membership history.`}
                </p>
                {selectedSub.upgradeHistory.previousSubscriptionId && (
                  <div className="text-[10px] text-purple-700 font-mono">
                    Prior Subscription ID: {selectedSub.upgradeHistory.previousSubscriptionId}
                  </div>
                )}
              </div>
            )}

            {/* Renewal Timeline (if student has multiple subscriptions) */}
            {selectedSub.renewalHistory.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Student Renewal &amp; Membership History ({selectedSub.renewalHistory.length} other subscriptions)
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedSub.renewalHistory.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {h.plan} ({h.durationMonths}m) · {formatDate(h.startDate)} &rarr; {formatDate(h.endDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Payment: {h.paymentId || "N/A"} · Receipt: {h.receipt || "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">₹{h.totalAmount.toFixed(2)}</span>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{h.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
