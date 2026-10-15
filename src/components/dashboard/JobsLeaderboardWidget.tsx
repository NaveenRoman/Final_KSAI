"use client";

import React from "react";
import { useSession } from "@/lib/auth-client";
import { Briefcase, Trophy, Award, ExternalLink, Star } from "lucide-react";

export function JobsLeaderboardWidget() {
  const { data: session } = useSession();
  const displayName = session?.user?.name || "Student";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Recommended Jobs */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              AI Recommended Jobs
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">98% Match</span>
        </div>

        <div className="space-y-2">
          {[
            { title: "Senior AI Engineer", company: "OpenAI Labs", location: "Remote / SF", match: "99%", pay: "$180k - $240k" },
            { title: "Full-Stack Next.js Architect", company: "Linear Tech", location: "Remote", match: "97%", pay: "$150k - $200k" },
            { title: "Autonomous Swarm Developer", company: "Vercel Enterprise", location: "Hybrid", match: "95%", pay: "$160k - $210k" },
          ].map((j) => (
            <div key={j.title} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between group cursor-pointer">
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{j.title}</h4>
                <div className="text-[10px] text-slate-400 font-mono">{j.company} &bull; {j.location}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">{j.pay}</div>
              </div>
              <button className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1 border border-blue-500/40">
                Apply <ExternalLink size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Global XP Leaderboard */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Global XP Leaderboard
            </h3>
          </div>
          <span className="text-[10px] text-amber-300 font-mono">Weekly Rank</span>
        </div>

        <div className="space-y-2">
          {[
            { rank: 1, name: "Dr. Elena Rostova", xp: "4,820 XP", badge: "🥇 Rank #1", avatar: "👩‍🔬" },
            { rank: 2, name: `${displayName} (You)`, xp: "2,450 XP", badge: "🥈 Rank #2", avatar: "👨‍💻", isUser: true },
            { rank: 3, name: "Marcus Vance", xp: "2,180 XP", badge: "🥉 Rank #3", avatar: "🚀" },
          ].map((l) => (
            <div
              key={l.name}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                l.isUser
                  ? "bg-blue-600/20 border-cyan-400/80 shadow-md shadow-cyan-500/10"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{l.avatar}</span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {l.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">{l.badge}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-400 font-mono">{l.xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
