"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightAIPanel } from "@/components/dashboard/RightAIPanel";
import { Trophy, ArrowRight, Sparkles, Calendar, Code2, Loader2, CheckCircle2 } from "lucide-react";

interface ContestChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  testCases: string;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  status: string;
  startTime: string;
  endTime: string;
  challenges: ContestChallenge[];
}

export default function StudentContestsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [activeTab, setActiveTab] = useState("Contests");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!isPending) {
      if (session?.user) {
        setUser({
          name: session.user.name ?? "Student",
          role: (session.user as any).role ?? "Student",
        });

        fetch("/api/contests")
          .then((res) => res.json())
          .then((data) => {
            if (active && data.success && Array.isArray(data.contests)) {
              setContests(data.contests);
            }
            if (active) setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            if (active) setLoading(false);
          });
      } else {
        // Fallback: verify server session before redirecting to avoid client-side race conditions
        fetch("/api/auth/me")
          .then((res) => {
            if (!res.ok) {
              if (active) router.push("/auth");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!active || !data?.user) return;
            setUser({
              name: data.user.name ?? "Student",
              role: data.user.role ?? "Student",
            });
            fetch("/api/contests")
              .then((res) => res.json())
              .then((d) => {
                if (active && d.success && Array.isArray(d.contests)) {
                  setContests(d.contests);
                }
                if (active) setLoading(false);
              })
              .catch(() => { if (active) setLoading(false); });
          })
          .catch(() => {
            if (active) router.push("/auth");
          });
      }
    }
    return () => {
      active = false;
    };
  }, [session, isPending, router]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col selection:bg-cyan-500 selection:text-black overflow-hidden font-sans">
      <TopNavbar userName={user?.name || "Student"} userRole={user?.role || "Student"} />

      <div className="flex-1 flex w-full overflow-hidden">
        <LeftSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        <main
          data-lenis-prevent
          className="flex-1 overflow-y-auto h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full custom-scrollbar"
        >
          {/* Header Banner */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-2 bg-white shadow-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">
              <Trophy size={14} className="text-amber-500" /> Competitive Programming Arena
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Active Code Contests 🏆
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Participate in live algorithmic challenges. Write real code, execute against hidden test cases, and earn XP.
            </p>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">Loading available contests...</p>
            </div>
          ) : contests.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-200 bg-white text-center space-y-4 max-w-md mx-auto py-16 shadow-xs">
              <Trophy size={40} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900">No Published Contests Right Now</h3>
              <p className="text-xs text-slate-500">
                Check back soon! New competitive programming contests will be published shortly by your instructors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contests.map((contest) => (
                <div
                  key={contest.id}
                  className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {contest.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar size={12} /> {new Date(contest.startTime).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-lg font-black text-slate-900 leading-snug">{contest.title}</h2>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{contest.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <Code2 size={15} className="text-blue-500" />
                      <span>{contest.challenges.length} Challenges</span>
                    </div>

                    <button
                      onClick={() => router.push(`/contests/${contest.id}`)}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      Enter Contest <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <RightAIPanel />
      </div>
    </div>
  );
}
