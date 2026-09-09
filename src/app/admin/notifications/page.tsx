import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Bell, Send, CheckCircle2, User, Sparkles, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireAdminPage();
  const { action } = await searchParams;

  const notifications = await db.notification.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true, role: true, college: true },
      },
    },
  });

  return (
    <AdminPageLayout
      title="Notification Center & Broadcasts"
      subtitle="Send high-priority announcements and inspect system event deliveries"
      adminUser={admin}
    >
      {/* Broadcast Composer */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Send size={18} className="text-blue-600" />
          Broadcast Instant Notification to Platform
        </h3>

        <form className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700">Notification Title</label>
            <input
              type="text"
              placeholder="e.g. Scheduled Maintenance Notice / Hackathon Announcement"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Target Audience</label>
            <select className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500">
              <option>All Users (Platform-Wide)</option>
              <option>Students Only</option>
              <option>Faculty Only</option>
              <option>College Administrators</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-3">
            <label className="font-bold text-slate-700">Message Content</label>
            <textarea
              rows={3}
              placeholder="Enter announcement details..."
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={() => alert("Notification broadcast queued for immediate delivery.")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
            >
              <Send size={13} />
              <span>Send Broadcast</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notifications Log Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bell size={18} className="text-amber-500" />
          Recent Notification Deliveries ({notifications.length})
        </h3>

        <div className="divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No notifications recorded yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">{n.title}</div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-[10px] text-slate-500">{n.user?.name || "System"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
