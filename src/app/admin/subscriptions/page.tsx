import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import {
  getFinancialOverview,
  getReconciledTransactions,
  formatInr,
  formatInrExact,
  TransactionStatus,
  TransactionProvenance,
} from "@/lib/financial-service";
import { getAdminSubscriptionsData } from "@/lib/admin/subscription-admin-service";
import { SubscriptionManagementClient } from "@/components/admin/SubscriptionManagementClient";
import {
  CreditCard,
  Download,
  Search,
  Filter,
  DollarSign,
  Receipt,
  RotateCcw,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    timeframe?: string;
    status?: string;
    provenance?: string;
    search?: string;
    page?: string;
    subPlan?: string;
    subStatus?: string;
    subTimeframe?: string;
    subPage?: string;
  }>;
}) {
  const admin = await requireAdminPage();
  const {
    tab = "subscriptions",
    timeframe = "all",
    status = "ALL",
    provenance = "ALL",
    search = "",
    page = "1",
    subPlan = "ALL",
    subStatus = "ALL",
    subTimeframe = "all",
    subPage = "1",
  } = await searchParams;

  const activeTab = tab === "ledger" ? "ledger" : "subscriptions";

  const validTimeframes = ["today", "7d", "30d", "3m", "1y", "all"] as const;
  const safeTimeframe = validTimeframes.includes(timeframe as any)
    ? (timeframe as "today" | "7d" | "30d" | "3m" | "1y" | "all")
    : "all";

  const validStatuses = ["ALL", "PAID", "REFUNDED", "FAILED", "CREATED"] as const;
  const safeStatus = validStatuses.includes(status.toUpperCase() as any)
    ? (status.toUpperCase() as "ALL" | "PAID" | "REFUNDED" | "FAILED" | "CREATED")
    : "ALL";

  const validProvenances = ["ALL", "LIVE", "TEST", "UNKNOWN"] as const;
  const safeProvenance = validProvenances.includes(provenance.toUpperCase() as any)
    ? (provenance.toUpperCase() as "ALL" | "LIVE" | "TEST" | "UNKNOWN")
    : "ALL";

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const subPageNum = Math.max(1, parseInt(subPage, 10) || 1);

  const [overview, transactionsData, subscriptionsData] = await Promise.all([
    getFinancialOverview(safeTimeframe),
    getReconciledTransactions({
      timeframe: safeTimeframe,
      status: safeStatus,
      provenance: safeProvenance,
      search,
      page: pageNum,
      pageSize: 20,
    }),
    getAdminSubscriptionsData({
      search,
      plan: subPlan,
      status: subStatus,
      timeframe: subTimeframe,
      page: subPageNum,
      pageSize: 20,
    }),
  ]);

  const statusBadge = (s: TransactionStatus) => {
    switch (s) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> PAID
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <RotateCcw size={11} /> REFUNDED
          </span>
        );
      case "PARTIALLY_REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RotateCcw size={11} /> PARTIAL REFUND
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={11} /> FAILED
          </span>
        );
      case "CREATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock size={11} /> PENDING
          </span>
        );
    }
  };

  const provenanceBadge = (p: TransactionProvenance) => {
    switch (p) {
      case "LIVE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            LIVE
          </span>
        );
      case "TEST":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
            TEST
          </span>
        );
      case "UNKNOWN":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">
            UNKNOWN
          </span>
        );
    }
  };

  const hasWebhookSecret = Boolean(
    process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET.trim().length > 0
  );

  return (
    <AdminPageLayout
      title="Financial Intelligence & Subscription Ledger"
      subtitle="Reconciled transaction ledger, verified Razorpay payment receipts, GST liability, and processed refunds"
      adminUser={admin}
    >
      {/* TEST DATA DETECTED NOTICE BANNER */}
      {overview.hasTestTransactions && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-950 flex items-start gap-3.5 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div>
              <strong className="font-bold text-amber-900 uppercase tracking-wide mr-1.5">
                TEST DATA DETECTED:
              </strong>
              The financial ledger contains {overview.testPaidCount} test/mock transaction{overview.testPaidCount === 1 ? "" : "s"} totaling {overview.formattedTestGrossCollections} generated in sandbox/development mode.
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              These simulated figures are strictly segregated and excluded from Company Live Revenue calculations. Only transactions authenticated against verified live payment credentials and provider evidence are recognized as commercial revenue.
            </p>
          </div>
        </div>
      )}

      {/* RAZORPAY WEBHOOK FAIL-CLOSED ADMINISTRATIVE NOTICE */}
      {!hasWebhookSecret && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mb-5">
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <AlertOctagon size={15} className="text-blue-700 shrink-0" />
              Razorpay Webhook Configuration: Fail-Closed Security Active
            </div>
            <p className="text-blue-800 text-[11px]">
              <code>RAZORPAY_WEBHOOK_SECRET</code> is unconfigured in this environment. Webhook endpoints will safely reject incoming events with HTTP 503 until a valid signing secret is provisioned. Never generate mock secrets for live processing.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold shrink-0">
            HTTP 503 Fail-Closed
          </span>
        </div>
      )}

      {/* NAVIGATION TAB CONTROLLER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
        <Link
          href="/admin/subscriptions?tab=subscriptions"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "subscriptions"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <CreditCard size={15} />
          <span>Student Subscriptions ({subscriptionsData.totalCount})</span>
        </Link>

        <Link
          href="/admin/subscriptions?tab=ledger"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "ledger"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Receipt size={15} />
          <span>Financial Overview &amp; Reconciled Receipts</span>
        </Link>
      </div>

      {activeTab === "subscriptions" ? (
        <SubscriptionManagementClient
          initialSubscriptions={subscriptionsData.subscriptions}
          summaryStats={subscriptionsData.summaryStats}
          totalCount={subscriptionsData.totalCount}
          currentPage={subscriptionsData.page}
          pageSize={subscriptionsData.pageSize}
          currentSearch={search}
          currentPlanFilter={subPlan}
          currentStatusFilter={subStatus}
          currentTimeframe={subTimeframe}
        />
      ) : (
        <>
          {/* 1. FOUR RECONCILED FINANCIAL CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Verified Live Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Verified Live Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {overview.formattedLiveGrossCollections}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {overview.livePaidCount} verified live payments ({overview.subscriptionPurchasesCount} subscriptions)
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-600 font-bold">
            <span>De-duplicated by Payment ID</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold">{overview.livePaidCount} LIVE</span>
          </div>
        </div>

        {/* Card 2: Test / Development Collections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-600" />
                Test / Mock Collections
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                <RotateCcw size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 leading-tight">
              {overview.formattedTestGrossCollections}
            </div>
            <p className="text-[10px] text-amber-800/80 mt-1">
              {overview.testPaidCount} sandbox/test transactions segregated from revenue
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] text-amber-700 font-bold">
            <span>Sandbox Test Data</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 font-extrabold">TEST DATA</span>
          </div>
        </div>

        {/* Card 3: Net Live Receipts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Net Live Receipts
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-tight">
              {overview.formattedNetLiveReceipts}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Net live cash flow after refunds and live gateway fees
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Operating Live:</span>
            <strong className="text-slate-800">{overview.formattedNetLiveReceipts} (excl. GST)</strong>
          </div>
        </div>

        {/* Card 4: Historical Lifetime vs 30d */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Historical Lifetime vs 30d
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
                <Receipt size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 leading-tight">
              {formatInr(overview.lifetimeTestCollections + overview.lifetimeLiveCollections)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              30d Live: {formatInr(overview.thirtyDayLiveCollections)} · 30d Test: {formatInr(overview.thirtyDayTestCollections)}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Lifetime Live: {formatInr(overview.lifetimeLiveCollections)}</span>
            <span className="text-purple-600 font-bold">Auditable</span>
          </div>
        </div>
      </div>

      {/* 2. RECONCILED TRANSACTION LEDGER SECTION */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        {/* Top Controls: Search, Filters, CSV Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-blue-600" />
              Unified Transaction Ledger
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Complete database aggregation · Real-time status reconciliation across Razorpay webhooks
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <form method="GET" className="relative">
              <input type="hidden" name="timeframe" value={safeTimeframe} />
              <input type="hidden" name="status" value={safeStatus} />
              <input type="hidden" name="provenance" value={safeProvenance} />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search customer, payment ID, order ID..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </form>

            {/* CSV Export Button */}
            <a
              href={`/api/admin/financial/export?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=${safeProvenance}&search=${encodeURIComponent(search)}`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Filter Pills - Status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold mr-1 shrink-0">Status:</span>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=ALL&provenance=${safeProvenance}&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeStatus === "ALL" ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Statuses ({transactionsData.totalCount})
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=PAID&provenance=${safeProvenance}&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeStatus === "PAID" ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paid ({overview.paidTransactionsCount})
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=REFUNDED&provenance=${safeProvenance}&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeStatus === "REFUNDED" ? "bg-rose-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Refunds ({overview.refundsCount})
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=FAILED&provenance=${safeProvenance}&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeStatus === "FAILED" ? "bg-red-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Failed ({overview.failedOrdersCount})
          </Link>
        </div>

        {/* Filter Pills - Provenance */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold border-t border-slate-100 pt-2.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold mr-1 shrink-0">Provenance:</span>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=ALL&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeProvenance === "ALL" ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Provenance
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=LIVE&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeProvenance === "LIVE" ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Live Only ({overview.livePaidCount})
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=TEST&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeProvenance === "TEST" ? "bg-amber-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Test Only ({overview.testPaidCount})
          </Link>
          <Link
            href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=UNKNOWN&search=${encodeURIComponent(search)}`}
            className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
              safeProvenance === "UNKNOWN" ? "bg-slate-700 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Unknown ({overview.unknownPaidCount})
          </Link>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 px-3">Product / Plan</th>
                <th className="pb-3 px-3">Identifiers (Payment &amp; Order)</th>
                <th className="pb-3 px-3 text-center">Provenance</th>
                <th className="pb-3 px-3 text-right">Gross Amount</th>
                <th className="pb-3 px-3 text-right">Net Amount</th>
                <th className="pb-3 px-3 text-center">Status</th>
                <th className="pb-3 pl-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionsData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactionsData.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer */}
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900">{tx.customerName}</div>
                      <div className="text-[10px] text-slate-500">{tx.customerEmail}</div>
                    </td>

                    {/* Product */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{tx.itemTitle}</div>
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        tx.type === "SUBSCRIPTION" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {tx.type === "SUBSCRIPTION" ? "Subscription" : "Legacy Course"}
                      </span>
                    </td>

                    {/* Identifiers */}
                    <td className="py-3.5 px-3 font-mono text-[11px] space-y-0.5">
                      <div className="text-slate-600">{tx.paymentId || "—"}</div>
                      {tx.orderId && (
                        <div className="text-[10px] text-slate-400 font-sans">Order: {tx.orderId}</div>
                      )}
                    </td>

                    {/* Provenance */}
                    <td className="py-3.5 px-3 text-center">
                      {provenanceBadge(tx.provenance)}
                    </td>

                    {/* Gross */}
                    <td className="py-3.5 px-3 text-right font-black text-slate-900">
                      ₹{tx.grossAmount.toLocaleString("en-IN")}
                      {tx.gstAmount > 0 && (
                        <span className="block text-[10px] text-purple-600 font-normal">
                          incl. ₹{tx.gstAmount.toFixed(2)} GST
                        </span>
                      )}
                    </td>

                    {/* Net */}
                    <td className="py-3.5 px-3 text-right font-black text-emerald-600">
                      ₹{tx.netAmount.toLocaleString("en-IN")}
                      {tx.refundedAmount > 0 && (
                        <span className="block text-[10px] text-rose-600 font-normal">
                          -₹{tx.refundedAmount.toFixed(2)} ref
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      {statusBadge(tx.status)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 pl-3 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(tx.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {transactionsData.totalPages > 1 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing Page <strong>{transactionsData.page}</strong> of <strong>{transactionsData.totalPages}</strong> ({transactionsData.totalCount} total entries)
            </span>
            <div className="flex items-center gap-1.5">
              {transactionsData.page > 1 && (
                <Link
                  href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=${safeProvenance}&search=${encodeURIComponent(search)}&page=${transactionsData.page - 1}`}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Previous
                </Link>
              )}
              {transactionsData.page < transactionsData.totalPages && (
                <Link
                  href={`/admin/subscriptions?timeframe=${safeTimeframe}&status=${safeStatus}&provenance=${safeProvenance}&search=${encodeURIComponent(search)}&page=${transactionsData.page + 1}`}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </AdminPageLayout>
  );
}
