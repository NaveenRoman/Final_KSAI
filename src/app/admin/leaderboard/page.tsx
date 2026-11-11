import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { getLeaderboardData, LeaderboardScope, LeaderboardWindow } from "@/lib/leaderboard-service";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Layers, Trophy, Zap, Award, Flame, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; window?: string }>;
}) {
  const admin = await requireAdminPage();

  const { scope: rawScope, window: rawWindow } = await searchParams;
  const scope: LeaderboardScope = (rawScope as LeaderboardScope) || "global";
  const window: LeaderboardWindow = (rawWindow as LeaderboardWindow) || "alltime";

  const leaderboardData = await getLeaderboardData({
    scope,
    window,
  });

  return (
    <AdminPageLayout
      title="Leaderboard Monitor"
      subtitle="Read-only view into live student rankings, XP distributions, and locked weekly snapshot statistics"
      adminUser={admin}
    >
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-black">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {window === "alltime" ? "Global All-Time Leaderboard" : "Current Weekly Leaderboard"}
              </h3>
              <p className="text-xs text-slate-500">
                Total Participants: <span className="font-bold text-slate-800">{leaderboardData.totalParticipants}</span> &bull;{" "}
                Status: {leaderboardData.isSnapshot ? "Frozen Weekly Snapshot" : "Live Real-Time Standings"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <Link
              href="/admin/leaderboard?scope=global&window=alltime"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                window === "alltime" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All-Time Ranks
            </Link>
            <Link
              href="/admin/leaderboard?scope=global&window=weekly"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                window === "weekly" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly Rankings
            </Link>
          </div>
        </div>

        {/* Ranks Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 text-center">Rank</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4">Streak</th>
                  <th className="py-3.5 px-4 text-right">XP Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {leaderboardData.top10.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-400 font-medium">
                      No leaderboard entries found for this scope.
                    </td>
                  </tr>
                ) : (
                  leaderboardData.top10.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black inline-flex items-center justify-center text-xs shadow-xs">
                            🥇 1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black inline-flex items-center justify-center text-xs shadow-xs">
                            🥈 2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-700/10 text-amber-900 font-black inline-flex items-center justify-center text-xs shadow-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="font-bold text-slate-500">#{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{entry.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {entry.userId.slice(0, 8)}...</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {entry.college || "Independent Learner"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Flame size={14} className="fill-amber-500 text-amber-500" /> {entry.streak}d
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600">
                        <span className="inline-flex items-center gap-1">
                          <Zap size={14} className="fill-blue-500 text-blue-500" /> {entry.xp} XP
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
