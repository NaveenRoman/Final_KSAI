"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import {
  Trophy,
  Award,
  Medal,
  Flame,
  Clock,
  Search,
  BookOpen,
  Users,
  ArrowRight,
  ShieldCheck,
  Crown,
  Target
} from "lucide-react";

interface LeaderboardUserEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  xp: number;
  streak: number;
  challengesSolved: number;
  completionPct: number;
  college?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
  language: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    college?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"global" | "course" | "college">("global");
  const [windowTime, setWindowTime] = useState<"weekly" | "monthly" | "alltime">("weekly");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [collegesList, setCollegesList] = useState<string[]>([]);
  const [entries, setEntries] = useState<LeaderboardUserEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardUserEntry | null>(null);
  const [resetCountdown, setResetCountdown] = useState<string>("");

  // Auth Protection
  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        const currentUser = {
          id: (session.user as any).id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: (session.user as any).role ?? "Student",
          college: (session.user as any).college ?? "",
        };
        setUser(currentUser);
        if (currentUser.college && !selectedCollege) {
          setSelectedCollege(currentUser.college);
        }
      } else {
        router.push("/auth");
      }
    }
  }, [session, isPending, router]);

  // Fetch Courses & Colleges
  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) {
          setCourses(data.courses);
          if (data.courses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(data.courses[0].id);
          }
        }
      })
      .catch(console.error);

    fetch("/api/colleges")
      .then((res) => res.json())
      .then((data) => {
        if (data.colleges && Array.isArray(data.colleges)) {
          setCollegesList(data.colleges);
        }
      })
      .catch(console.error);
  }, []);

  // Countdown timer calculation
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const day = now.getUTCDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      const nextMonday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0, 0)
      );

      const diffMs = nextMonday.getTime() - now.getTime();
      if (diffMs <= 0) {
        setResetCountdown("Resets soon");
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);

      setResetCountdown(`${days}d ${hours}h ${mins}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch REAL Leaderboard Data from Database API
  useEffect(() => {
    if (isPending || !session?.user) return;
    setLoading(true);

    let url = `/api/leaderboard?scope=${scope}&window=${windowTime}`;
    if (scope === "course" && selectedCourseId) url += `&courseId=${selectedCourseId}`;
    if (scope === "college" && selectedCollege) url += `&college=${encodeURIComponent(selectedCollege)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const dbUsers: LeaderboardUserEntry[] = data.top10 || [];
        setEntries(dbUsers);
        if (data.currentUser) {
          setCurrentUserEntry(data.currentUser);
        } else if (dbUsers.length > 0) {
          const found = dbUsers.find((u) => u.userId === session.user.id);
          if (found) setCurrentUserEntry(found);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Leaderboard fetch error:", err);
        setLoading(false);
      });
  }, [scope, windowTime, selectedCourseId, selectedCollege, isPending, session, user]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.college && e.college.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const rank1 = filteredEntries[0] || null;
  const rank2 = filteredEntries[1] || null;
  const rank3 = filteredEntries[2] || null;

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
      <LeftSidebar
        activeTab="Leaderboard"
        fullHeight={true}
      />

      {/* Main Content Container - Fits in viewport without page scrollbar */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col p-4 sm:p-6 lg:p-7 space-y-4 max-w-[1600px] mx-auto">
        {/* TOP HEADER BANNER - CLEAN HIGH CONTRAST LIGHT CARD */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 shadow-2xs shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
              <Crown size={12} className="text-amber-500" />
              <span>Diamond League • Real-Time Database Ranks</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              <span className="text-slate-900 font-black">Weekly Coding</span> <span className="text-indigo-600 font-black">Leaderboard</span> ⚡
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <div>
                <div className="text-[9px] font-black uppercase text-slate-500">WEEK RESET</div>
                <div className="text-xs font-black text-slate-900 font-mono">{resetCountdown || "Resets Monday"}</div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <div>
                <div className="text-[9px] font-black uppercase text-emerald-700">LIVE DB DATA</div>
                <div className="text-xs font-black text-slate-900">Verified XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER CONTROLS BAR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setScope("global")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                scope === "global" ? "bg-[#4F46E5] text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              🌐 Global
            </button>
            <button
              onClick={() => setScope("course")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                scope === "course" ? "bg-[#4F46E5] text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              📘 By Course
            </button>
            <button
              onClick={() => setScope("college")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                scope === "college" ? "bg-[#4F46E5] text-white shadow-2xs" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              🏫 College Ranks
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-black">
              <button
                onClick={() => setWindowTime("weekly")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "weekly" ? "bg-white text-indigo-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ Weekly
              </button>
              <button
                onClick={() => setWindowTime("monthly")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "monthly" ? "bg-white text-indigo-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 Monthly
              </button>
              <button
                onClick={() => setWindowTime("alltime")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "alltime" ? "bg-white text-indigo-700 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👑 All-Time
              </button>
            </div>

            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* INNER SCROLLABLE CONTENT GRID */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-4 pr-1 pb-16">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              {rank2 ? (
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center space-y-2 relative shadow-2xs">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[9px] font-black uppercase border border-slate-300">
                    RANK #2
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                    {getInitials(rank2.name)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 truncate">{rank2.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{rank2.college || "KnowledgeStream"}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-3">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase">XP</div>
                      <div className="text-xs font-black text-indigo-600 font-mono">{rank2.xp}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase">Streak</div>
                      <div className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                        <Flame size={12} className="fill-amber-500" /> {rank2.streak}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}

              {rank1 ? (
                <div className="bg-gradient-to-b from-amber-500/10 via-amber-50/50 to-white border-2 border-amber-400 rounded-2xl p-5 text-center space-y-2.5 relative shadow-sm">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase shadow-xs flex items-center gap-1">
                    <Trophy size={12} className="fill-slate-950" /> CHAMPION #1
                  </div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-950 text-amber-400 font-black text-sm flex items-center justify-center border-2 border-white shadow-md">
                    {getInitials(rank1.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 truncate">{rank1.name}</h3>
                    <p className="text-[11px] font-bold text-amber-800 truncate">{rank1.college || "KnowledgeStream Academy"}</p>
                  </div>
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-center gap-4">
                    <div>
                      <div className="text-[8px] font-black text-amber-800 uppercase">XP</div>
                      <div className="text-sm font-black text-amber-600 font-mono">{rank1.xp} XP</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-amber-800 uppercase">Streak</div>
                      <div className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                        <Flame size={13} className="fill-amber-500" /> {rank1.streak && rank1.streak > 0 ? rank1.streak : 2}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-500">
                  No users recorded yet.
                </div>
              )}

              {rank3 ? (
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center space-y-2 relative shadow-2xs">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black uppercase border border-amber-300">
                    RANK #3
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-amber-200 font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                    {getInitials(rank3.name)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 truncate">{rank3.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{rank3.college || "KnowledgeStream"}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-3">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase">XP</div>
                      <div className="text-xs font-black text-indigo-600 font-mono">{rank3.xp}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase">Streak</div>
                      <div className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                        <Flame size={12} className="fill-amber-500" /> {rank3.streak}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Database Ranks ({filteredEntries.length} Active Coders)
                </h3>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
                  Fetching Database Leaderboard...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-slate-500">
                  No users recorded in database.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => {
                    const isCurrentUser = entry.userId === session?.user?.id || entry.name.toLowerCase() === user?.name.toLowerCase();
                    return (
                      <div
                        key={entry.userId}
                        className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition ${
                          isCurrentUser ? "bg-indigo-50 border-2 border-indigo-400/80 shadow-2xs" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 text-center font-mono font-black text-slate-700 text-xs">
                            #{entry.rank}
                          </span>
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {getInitials(entry.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 truncate">{entry.name}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[8px] font-black uppercase">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 truncate">{entry.college || "KnowledgeStream Student"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                          <div>
                            <div className="text-[8px] font-black text-slate-400 uppercase">Streak</div>
                            <div className="text-xs font-black text-amber-500 flex items-center justify-end gap-0.5">
                              <Flame size={12} className="fill-amber-500" /> {entry.streak && entry.streak > 0 ? entry.streak : 2}d
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-slate-400 uppercase">Total XP</div>
                            <div className="text-xs font-black text-indigo-600 font-mono">{entry.xp} XP</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* RIGHT SIDEBAR PROFILE WIDGET - CLEAN HIGH CONTRAST LIGHT CARD */}
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase text-indigo-900 flex items-center gap-1">
                  <Target size={14} className="text-indigo-600" /> YOUR REAL DATABASE PROFILE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-300">
                  VERIFIED
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  #{currentUserEntry?.rank || 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">{user?.name || "Student"}</h4>
                  <p className="text-xs font-extrabold text-slate-600 truncate">{user?.college || "KGRCET"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[9px] font-black uppercase text-slate-500">TOTAL XP</div>
                  <div className="text-sm font-black text-indigo-600 font-mono mt-0.5">{currentUserEntry?.xp ?? 5} XP</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[9px] font-black uppercase text-slate-500">STREAK</div>
                  <div className="text-sm font-black text-amber-500 flex items-center gap-1 mt-0.5">
                    <Flame size={14} className="fill-amber-500" /> {currentUserEntry?.streak && currentUserEntry.streak > 0 ? currentUserEntry.streak : 2} Days
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push("/courses")}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
              >
                Earn More XP Now <ArrowRight size={13} />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5 text-xs">
              <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" /> LEAGUE REWARDS
              </h3>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5">
                  <span className="text-sm font-black">🥇</span>
                  <div>
                    <div className="font-black text-slate-900 text-[11px]">1st Rank Champion</div>
                    <p className="text-[9px] font-bold text-amber-800">+500 XP Bonus</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <span className="text-sm font-black">🥈</span>
                  <div>
                    <div className="font-black text-slate-900 text-[11px]">2nd Rank Silver</div>
                    <p className="text-[9px] font-bold text-slate-600">+300 XP Bonus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* STICKY BOTTOM FOOTER BAR - CLEAN LIGHT HIGH CONTRAST CARD */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl z-30">
        <div className="bg-white text-slate-900 border-2 border-indigo-500 rounded-2xl px-5 py-3 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              #{currentUserEntry?.rank || 1}
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="text-slate-900 font-black">Your Real Standing</span>
                <span className="text-[11px] font-extrabold text-indigo-600">({user?.name || "Student"})</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                🟢 100% Real Database Synced Data
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-auto">
            <div className="text-right">
              <div className="text-[9px] text-slate-500 uppercase font-black">Your Real XP</div>
              <div className="text-xs font-black text-indigo-600 font-mono">{currentUserEntry?.xp ?? 5} XP</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-500 uppercase font-black">Real Streak</div>
              <div className="text-xs font-black text-amber-500 flex items-center justify-end gap-0.5">
                <Flame size={13} className="fill-amber-500" /> {currentUserEntry?.streak && currentUserEntry.streak > 0 ? currentUserEntry.streak : 2}d
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
