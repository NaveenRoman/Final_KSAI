"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Trophy, Plus, Edit, ToggleLeft, ToggleRight, Calendar, Code2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ContestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  challengesCount: number;
  submissionsCount: number;
  createdAt: string;
}

export default function AdminContestsPage() {
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [submitting, setSubmitting] = useState(false);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/contests");
      const data = await res.json();
      if (res.ok && data.success) {
        setContests(data.contests || []);
      } else {
        setError(data.error || "Failed to load contests");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading contests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          startTime,
          endTime,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setTitle("");
        setDescription("");
        setStatus("DRAFT");
        fetchContests();
      } else {
        alert(data.error || "Failed to create contest");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating contest");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/contests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchContests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminPageLayout
      title="Contest Management"
      subtitle="Create and publish competitive coding challenges for students to test XP, streaks, and leaderboard progression"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Create Contest
          </button>
        </div>

        {/* Contests List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading contests...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : contests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-500 mx-auto flex items-center justify-center">
              <Trophy size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Contests Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Get started by creating your first contest to publish coding challenges for your students.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Create Contest Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        c.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.status}
                    </span>
                    <button
                      onClick={() => toggleStatus(c.id, c.status)}
                      className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-medium"
                      title="Toggle Draft/Publish"
                    >
                      {c.status === "PUBLISHED" ? (
                        <>
                          <ToggleRight size={20} className="text-emerald-600" /> Published
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={20} className="text-slate-400" /> Draft
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Code2 size={14} className="text-blue-500" />
                      <span>{c.challengesCount} Challenges</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span>{c.submissionsCount} Submissions</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} /> Start: {new Date(c.startTime).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} /> End: {new Date(c.endTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/admin/contests/${c.id}`}
                    className="w-full py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit size={14} /> Manage Challenges & Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for Creating Contest */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Trophy className="text-amber-500" size={18} /> Create New Contest
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateContest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Contest Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Weekly Algorithm Showdown #1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the contest topic, guidelines, and target audience..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="DRAFT">DRAFT (Hidden from students)</option>
                    <option value="PUBLISHED">PUBLISHED (Visible to students)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Create Contest"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}
