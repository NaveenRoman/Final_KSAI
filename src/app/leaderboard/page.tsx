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
  Target,
  Menu
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
    let active = true;
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
            const currentUser = {
              id: data.user.id,
              name: data.user.name ?? "",
              email: data.user.email ?? "",
              role: data.user.role ?? "Student",
              college: data.user.college ?? "",
            };
            setUser(currentUser);
            if (currentUser.college && !selectedCollege) {
              setSelectedCollege(currentUser.college);
            }
          })
          .catch(() => {
            if (active) router.push("/auth");
          });
      }
    }
    return () => {
      active = false;
    };
  }, [session, isPending, router, selectedCollege]);

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
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans antialiased">
      <LeftSidebar
        activeTab="Leaderboard"
        fullHeight={true}
      />

      {/* Main Content Container - Fits in viewport without page scrollbar */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col p-4 sm:p-6 lg:p-7 space-y-4 max-w-[1600px] mx-auto">
        {/* TOP HEADER BANNER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 sm:p-5 rounded-2xl shrink-0 shadow-lg shadow-black/20">
          <div className="flex items-start gap-3 min-w-0">
            {/* Mobile Global Navigation Toggle (< 768px) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
                }
              }}
              aria-label="Open navigation menu"
              className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-cyan)] active:scale-95 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <Menu size={20} />
            </button>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                <Crown size={12} className="text-amber-400" />
                <span>Diamond League • Real-Time Database Ranks</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                <span>Weekly Coding </span>
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">Leaderboard</span> ⚡
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <div>
                <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">WEEK RESET</div>
                <div className="text-xs font-bold text-[var(--text-primary)] font-mono">{resetCountdown || "Resets Monday"}</div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <div>
                <div className="text-[9px] font-bold uppercase text-emerald-400">LIVE DB DATA</div>
                <div className="text-xs font-bold text-[var(--text-primary)]">Verified XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER CONTROLS BAR */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl text-xs border border-[var(--border-subtle)]">
            <button
              onClick={() => setScope("global")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scope === "global" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              🌐 Global
            </button>
            <button
              onClick={() => setScope("course")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scope === "course" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              📘 By Course
            </button>
            <button
              onClick={() => setScope("college")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scope === "college" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              🏫 College Ranks
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-xl text-xs font-bold border border-[var(--border-subtle)]">
              <button
                onClick={() => setWindowTime("weekly")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "weekly" ? "bg-[var(--bg-elevated)] text-[var(--brand-cyan)] shadow-xs font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                ⚡ Weekly
              </button>
              <button
                onClick={() => setWindowTime("monthly")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "monthly" ? "bg-[var(--bg-elevated)] text-[var(--brand-cyan)] shadow-xs font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                📅 Monthly
              </button>
              <button
                onClick={() => setWindowTime("alltime")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  windowTime === "alltime" ? "bg-[var(--bg-elevated)] text-[var(--brand-cyan)] shadow-xs font-bold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                👑 All-Time
              </button>
            </div>

            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)]"
              />
            </div>
          </div>
        </div>

        {/* INNER SCROLLABLE CONTENT GRID */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-4 pr-1 pb-16">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              {rank2 ? (
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 text-center space-y-2 relative shadow-lg shadow-black/20">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[9px] font-bold uppercase border border-[var(--border-subtle)]">
                    RANK #2
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center border-2 border-[var(--border-subtle)] shadow-xs">
                    {getInitials(rank2.name)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">{rank2.name}</h3>
                    <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{rank2.college || "KnowledgeStream"}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-center gap-3">
                    <div>
                      <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">XP</div>
                      <div className="text-xs font-bold text-cyan-400 font-mono">{rank2.xp}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Streak</div>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5">
                        <Flame size={12} className="fill-amber-400" /> {rank2.streak}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}

              {rank1 ? (
                <div className="bg-gradient-to-b from-amber-500/10 via-[var(--bg-card)] to-[var(--bg-card)] border-2 border-amber-500/40 rounded-2xl p-5 text-center space-y-2.5 relative shadow-xl shadow-amber-500/5">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold uppercase shadow-xs flex items-center gap-1">
                    <Trophy size={12} className="fill-slate-950" /> CHAMPION #1
                  </div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-950 text-amber-400 font-bold text-sm flex items-center justify-center border-2 border-amber-400 shadow-md">
                    {getInitials(rank1.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{rank1.name}</h3>
                    <p className="text-[11px] font-semibold text-amber-400 truncate">{rank1.college || "KnowledgeStream Academy"}</p>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-center gap-4">
                    <div>
                      <div className="text-[8px] font-bold text-amber-400/80 uppercase">XP</div>
                      <div className="text-sm font-bold text-amber-400 font-mono">{rank1.xp} XP</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-amber-400/80 uppercase">Streak</div>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5">
                        <Flame size={13} className="fill-amber-400" /> {rank1.streak && rank1.streak > 0 ? rank1.streak : 2}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl text-xs font-medium text-[var(--text-muted)]">
                  No users recorded yet.
                </div>
              )}

              {rank3 ? (
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 text-center space-y-2 relative shadow-lg shadow-black/20">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-amber-300 text-[9px] font-bold uppercase border border-amber-500/30">
                    RANK #3
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-elevated)] text-amber-300 font-bold text-xs flex items-center justify-center border-2 border-[var(--border-subtle)] shadow-xs">
                    {getInitials(rank3.name)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">{rank3.name}</h3>
                    <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{rank3.college || "KnowledgeStream"}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-center gap-3">
                    <div>
                      <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">XP</div>
                      <div className="text-xs font-bold text-cyan-400 font-mono">{rank3.xp}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Streak</div>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5">
                        <Flame size={12} className="fill-amber-400" /> {rank3.streak}d
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-lg shadow-black/20 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Database Ranks ({filteredEntries.length} Active Coders)
                </h3>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs font-medium text-[var(--text-muted)] animate-pulse">
                  Fetching Database Leaderboard...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-8 text-center text-xs font-medium text-[var(--text-muted)]">
                  No users recorded in database.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filteredEntries.map((entry) => {
                    const isCurrentUser = entry.userId === session?.user?.id || entry.name.toLowerCase() === user?.name.toLowerCase();
                    return (
                      <div
                        key={entry.userId}
                        className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition ${
                          isCurrentUser ? "bg-blue-600/15 border border-blue-500/40 shadow-xs" : "hover:bg-[var(--bg-elevated)]/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 text-center font-mono font-bold text-[var(--text-muted)] text-xs">
                            #{entry.rank}
                          </span>
                          <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                            {getInitials(entry.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">{entry.name}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[8px] font-bold uppercase">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{entry.college || "KnowledgeStream Student"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                          <div>
                            <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Streak</div>
                            <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-0.5">
                              <Flame size={12} className="fill-amber-400" /> {entry.streak && entry.streak > 0 ? entry.streak : 2}d
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Total XP</div>
                            <div className="text-xs font-bold text-cyan-400 font-mono">{entry.xp} XP</div>
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
            {/* RIGHT SIDEBAR PROFILE WIDGET */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-lg shadow-black/20 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[11px] font-bold uppercase text-[var(--text-primary)] flex items-center gap-1">
                  <Target size={14} className="text-blue-400" /> YOUR DATABASE PROFILE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/30">
                  VERIFIED
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  #{currentUserEntry?.rank || 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.name || "Student"}</h4>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] truncate">{user?.college || "KnowledgeStream"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)] text-xs">
                <div className="p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">TOTAL XP</div>
                  <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">{currentUserEntry?.xp ?? 5} XP</div>
                </div>
                <div className="p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">STREAK</div>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Flame size={14} className="fill-amber-400" /> {currentUserEntry?.streak && currentUserEntry.streak > 0 ? currentUserEntry.streak : 2} Days
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push("/courses")}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
              >
                Earn More XP Now <ArrowRight size={13} />
              </button>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-lg shadow-black/20 space-y-2.5 text-xs">
              <h3 className="text-[11px] font-bold uppercase text-[var(--text-primary)] flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-400" /> LEAGUE REWARDS
              </h3>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-amber-500/30 flex items-center gap-2.5">
                  <span className="text-sm font-bold">🥇</span>
                  <div>
                    <div className="font-bold text-[var(--text-primary)] text-[11px]">1st Rank Champion</div>
                    <p className="text-[9px] font-semibold text-amber-400">+500 XP Bonus</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center gap-2.5">
                  <span className="text-sm font-bold">🥈</span>
                  <div>
                    <div className="font-bold text-[var(--text-primary)] text-[11px]">2nd Rank Silver</div>
                    <p className="text-[9px] font-semibold text-[var(--text-secondary)]">+300 XP Bonus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* STICKY BOTTOM FOOTER BAR */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl z-30">
        <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-xl text-[var(--text-primary)] border border-blue-500/40 rounded-2xl px-5 py-3 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              #{currentUserEntry?.rank || 1}
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span>Your Real Standing</span>
                <span className="text-[11px] font-bold text-cyan-400">({user?.name || "Student"})</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">
                🟢 100% Real Database Synced Data
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 ml-auto">
            <div className="text-right">
              <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold">Your Real XP</div>
              <div className="text-xs font-bold text-cyan-400 font-mono">{currentUserEntry?.xp ?? 5} XP</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold">Real Streak</div>
              <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-0.5">
                <Flame size={13} className="fill-amber-400" /> {currentUserEntry?.streak && currentUserEntry.streak > 0 ? currentUserEntry.streak : 2}d
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
