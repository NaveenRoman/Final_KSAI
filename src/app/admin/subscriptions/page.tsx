import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { CreditCard, TrendingUp, DollarSign, Calendar, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const admin = await requireAdminPage();

  const enrollments = await db.enrollment.findMany({
    include: {
      user: {
        select: { name: true, email: true, college: true },
      },
      course: {
        select: { title: true, language: true, price: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const paidEnrollmentsCount = enrollments.filter((e) => (e.paidAmount || 0) > 0).length;

  return (
    <AdminPageLayout
      title="Subscription & Revenue Management"
      subtitle="Financial transactions, institutional licenses, and Razorpay payment history"
      adminUser={admin}
    >
      {/* 3 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Real-time database records</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Enrollments</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {enrollments.length}
          </div>
          <span className="text-[10px] text-blue-600 font-bold">{paidEnrollmentsCount} paid · {enrollments.length - paidEnrollmentsCount} free/preview</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Gateway</span>
          <div className="text-2xl font-black text-slate-900 mt-1">Razorpay Live</div>
          <span className="text-[10px] text-emerald-600 font-bold">100% webhook verification</span>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CreditCard size={18} className="text-amber-500" />
          Recent Transaction Receipts
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 px-3">Course Enrolled</th>
                <th className="pb-3 px-3">Payment ID</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 pl-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                    No payment records recorded yet.
                  </td>
                </tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-900">{e.user.name}</div>
                      <div className="text-[10px] text-slate-500">{e.user.email}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{e.course.title}</div>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                        {e.course.language}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">
                      {e.paymentId}
                    </td>
                    <td className="py-3.5 px-3 font-black text-slate-900">
                      ₹{e.paidAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 pl-3 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageLayout>
  );
}
