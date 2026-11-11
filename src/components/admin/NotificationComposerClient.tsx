"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Bell, CheckCircle2, AlertCircle, Loader2, Sparkles, Filter, Users } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string | Date;
  user?: {
    name: string | null;
    email: string;
    role: string;
    college: string | null;
  } | null;
}

interface NotificationComposerClientProps {
  initialNotifications: NotificationItem[];
  autoOpenCompose?: boolean;
}

export function NotificationComposerClient({
  initialNotifications,
  autoOpenCompose = false,
}: NotificationComposerClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (title.trim().length < 3) {
      setStatusMsg({ type: "error", text: "Title must be at least 3 characters long." });
      return;
    }
    if (message.trim().length < 5) {
      setStatusMsg({ type: "error", text: "Message must be at least 5 characters long." });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetAudience,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to broadcast notification");
      }

      setStatusMsg({
        type: "success",
        text: `Broadcast sent successfully to ${data.recipientsCount} recipient(s).`,
      });

      // Clear fields
      setTitle("");
      setMessage("");

      // Refresh server-side state
      router.refresh();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.user?.name && n.user.name.toLowerCase().includes(q)) ||
      (n.user?.email && n.user.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Broadcast Composer Form */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send size={18} className="text-blue-600" />
            Broadcast Instant Notification to Platform
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            AUDITED BROADCAST DISPATCHER
          </span>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSendBroadcast} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700">Notification Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance Notice / Hackathon Announcement"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Target Audience *</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium text-slate-800"
            >
              <option value="ALL">All Users (Platform-Wide)</option>
              <option value="STUDENT">Students Only</option>
              <option value="FACULTY">Faculty Only</option>
              <option value="COLLEGE_ADMIN">College Administrators</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-3">
            <label className="font-bold text-slate-700">Message Content *</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement details, instructions, or system updates..."
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              * Deliveries are persisted to SQLite and immediately visible in student and faculty notification inboxes.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Broadcast</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notifications Log Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell size={18} className="text-amber-500" />
            Recent Notification Deliveries ({filtered.length})
          </h3>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter logged notifications..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              {searchFilter ? "No notifications match your search query." : "No notifications recorded yet."}
            </p>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{n.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(n.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 block mt-0.5">
                    Recipient: {n.user?.name || n.user?.email || "System User"}
                  </span>
                  {n.user?.role && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 inline-block mt-0.5">
                      {n.user.role}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
