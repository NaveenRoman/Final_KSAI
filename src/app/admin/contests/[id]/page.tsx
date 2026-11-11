"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Trophy, Plus, ArrowLeft, Code2, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  testCases: string;
  _count?: { submissions: number };
}

interface ContestDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  challenges: ChallengeItem[];
}

export default function AdminContestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [contest, setContest] = useState<ContestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Contest Edit Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [savingContest, setSavingContest] = useState(false);

  // Add Challenge Modal
  const [showAddChallengeModal, setShowAddChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeDifficulty, setChallengeDifficulty] = useState("EASY");
  const [testCasesInput, setTestCasesInput] = useState(
    JSON.stringify(
      [
        { input: "[1, 2, 3]", expectedOutput: "6" },
        { input: "[10, 20]", expectedOutput: "30" },
      ],
      null,
      2
    )
  );
  const [addingChallenge, setAddingChallenge] = useState(false);

  const fetchContest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/contests/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setContest(data.contest);
        setTitle(data.contest.title);
        setDescription(data.contest.description);
        setStatus(data.contest.status);
        setStartTime(new Date(data.contest.startTime).toISOString().slice(0, 16));
        setEndTime(new Date(data.contest.endTime).toISOString().slice(0, 16));
      } else {
        setError(data.error || "Failed to load contest");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading contest details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [id]);

  const handleUpdateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setError(null);
    try {
      setSavingContest(true);
      const res = await fetch(`/api/admin/contests/${id}`, {
        method: "PUT",
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
        setSuccessMsg("Contest metadata updated successfully!");
        fetchContest();
      } else {
        setError(data.error || "Failed to update contest");
      }
    } catch (err) {
      console.error(err);
      setError("Error saving contest changes");
    } finally {
      setSavingContest(false);
    }
  };

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle.trim() || !challengeDesc.trim()) return;

    try {
      // Validate JSON formatting
      JSON.parse(testCasesInput);
    } catch (e) {
      alert("Invalid JSON format for Test Cases. Please check syntax.");
      return;
    }

    try {
      setAddingChallenge(true);
      const res = await fetch(`/api/admin/contests/${id}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle,
          description: challengeDesc,
          difficulty: challengeDifficulty,
          testCases: testCasesInput,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddChallengeModal(false);
        setChallengeTitle("");
        setChallengeDesc("");
        setChallengeDifficulty("EASY");
        fetchContest();
      } else {
        alert(data.error || "Failed to add challenge");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding challenge");
    } finally {
      setAddingChallenge(false);
    }
  };

  return (
    <AdminPageLayout
      title={contest ? `Contest: ${contest.title}` : "Contest Details"}
      subtitle="Configure contest challenges, test cases, and publishing schedule"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Contests
          </Link>

          {contest && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                contest.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {contest.status}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading contest details...</p>
          </div>
        ) : error || !contest ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error || "Contest not found"}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Contest Editor (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Trophy className="text-amber-500" size={18} /> Contest Metadata
                </h2>

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateContest} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
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
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Publication Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-semibold"
                    >
                      <option value="DRAFT">DRAFT (Hidden)</option>
                      <option value="PUBLISHED">PUBLISHED (Active)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingContest}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {savingContest ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Contest Metadata</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Challenges List & Management (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Code2 className="text-blue-500" size={18} /> Contest Challenges ({contest.challenges.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Challenges inside this contest. Students can solve them to earn XP based on difficulty tier.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddChallengeModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Challenge
                  </button>
                </div>

                {contest.challenges.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Code2 size={36} className="text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No challenges added to this contest yet.</p>
                    <button
                      onClick={() => setShowAddChallengeModal(true)}
                      className="px-3.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 font-bold text-xs hover:bg-blue-50 cursor-pointer"
                    >
                      + Add First Challenge
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contest.challenges.map((ch, idx) => (
                      <div key={ch.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] flex items-center justify-center font-black">
                              {idx + 1}
                            </span>
                            {ch.title}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              ch.difficulty === "HARD"
                                ? "bg-rose-100 text-rose-700"
                                : ch.difficulty === "MEDIUM"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {ch.difficulty} ({ch.difficulty === "HARD" ? 150 : ch.difficulty === "MEDIUM" ? 75 : 30} XP)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{ch.description}</p>
                        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Submissions: {ch._count?.submissions ?? 0}</span>
                          <span>Test Cases: Configured</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal for Adding Challenge */}
        {showAddChallengeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Code2 className="text-blue-500" size={18} /> Add Challenge to Contest
                </h3>
                <button onClick={() => setShowAddChallengeModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddChallenge} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="e.g. Two Sum Array Optimizer"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Problem Description & Requirements</label>
                  <textarea
                    required
                    rows={4}
                    value={challengeDesc}
                    onChange={(e) => setChallengeDesc(e.target.value)}
                    placeholder="Provide detailed problem statement, input formats, constraints..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Difficulty Tier (XP Tier)</label>
                  <select
                    value={challengeDifficulty}
                    onChange={(e) => setChallengeDifficulty(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="EASY">EASY (30 XP)</option>
                    <option value="MEDIUM">MEDIUM (75 XP)</option>
                    <option value="HARD">HARD (150 XP)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Test Cases (JSON String)</label>
                  <textarea
                    required
                    rows={5}
                    value={testCasesInput}
                    onChange={(e) => setTestCasesInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs font-mono bg-slate-900 text-emerald-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    JSON array containing input and expectedOutput per test case (e.g. [{`"input": "...", "expectedOutput": "..."`}]).
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddChallengeModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingChallenge}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                  >
                    {addingChallenge ? <Loader2 size={14} className="animate-spin" /> : "Save Challenge"}
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
