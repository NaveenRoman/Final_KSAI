"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightAIPanel } from "@/components/dashboard/RightAIPanel";
import {
  BookOpen,
  ArrowRight,
  Compass,
  Sparkles,
  Star,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Menu
} from "lucide-react";

export default function MyCoursesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [activeTab, setActiveTab] = useState("Courses");
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!isPending) {
      if (session?.user) {
        const currentUser = {
          id: (session.user as any).id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: (session.user as any).role ?? "Student",
        };
        setUser(currentUser);

        fetch(`/api/courses/my-courses?email=${currentUser.email}`)
          .then((res) => res.json())
          .then((data) => {
            if (active && data.enrollments) {
              setEnrollments(data.enrollments);
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
            const currentUser = {
              id: data.user.id,
              name: data.user.name ?? "",
              email: data.user.email ?? "",
              role: data.user.role ?? "Student",
            };
            setUser(currentUser);
            fetch(`/api/courses/my-courses?email=${currentUser.email}`)
              .then((res) => res.json())
              .then((d) => {
                if (active && d.enrollments) setEnrollments(d.enrollments);
                if (active) setLoading(false);
              })
              .catch(() => {
                if (active) setLoading(false);
              });
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

  const handleStartLearning = (course: any) => {
    const lang = (course.language || "").toLowerCase().trim();
    if (lang === "cpp" || lang === "c++") {
      router.push("/courses/cpp");
    } else if (lang === "c") {
      router.push("/courses/c");
    } else if (lang === "java") {
      router.push("/courses/java");
    } else if (lang === "python") {
      router.push("/courses/python");
    } else {
      const titleLower = (course.title || "").toLowerCase();
      if (titleLower.includes("c++") || titleLower.includes("cpp")) {
        router.push("/courses/cpp");
      } else if (titleLower.includes("c programming") || titleLower === "c") {
        router.push("/courses/c");
      } else if (titleLower.includes("java")) {
        router.push("/courses/java");
      } else {
        router.push("/courses/python");
      }
    }
  };

  const getValidityDetails = (createdAtStr: string, validityDaysInput: number = 90) => {
    const purchaseDate = new Date(createdAtStr);
    const validityDays = validityDaysInput || 90;
    const endDate = new Date(purchaseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const formattedPurchase = purchaseDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const formattedEnd = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const percentRemaining = Math.min(100, Math.max(0, (daysLeft / validityDays) * 100));

    return {
      purchaseDateStr: formattedPurchase,
      endDateStr: formattedEnd,
      daysLeft,
      totalDays: validityDays,
      percentRemaining,
      isExpired: daysLeft === 0,
      isExpiringSoon: daysLeft > 0 && daysLeft <= 15,
    };
  };

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <LeftSidebar
        activeTab="Courses"
        onTabChange={handleTabChange}
        userProfile={user || undefined}
        isLight={false}
        fullHeight={true}
      />

      {/* Center Main Workspace Content Area */}
      <main data-lenis-prevent className="flex-1 overflow-y-auto h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Welcome Header */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-lg shadow-black/20 space-y-1 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              {/* Mobile Global Navigation Toggle */}
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
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 text-[11px] font-semibold border border-blue-500/30">
                  <Sparkles size={12} /> Learning Path &bull; My Space
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  My Enrolled Courses 🎓
                </h1>
                <p className="text-[var(--text-muted)] text-xs font-medium">
                  Your registered pathways. Track your subscription validity, purchase date, and remaining days left.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-[var(--bg-elevated)] rounded-full w-24" />
                    <div className="h-3 bg-[var(--bg-elevated)] rounded-full w-10" />
                  </div>
                  <div className="h-5 bg-[var(--bg-elevated)] rounded w-3/4" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-3 bg-[var(--bg-elevated)] rounded w-5/6" />
                  </div>
                  <div className="h-16 bg-[var(--bg-elevated)] rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            /* Empty State */
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-center space-y-3 max-w-md mx-auto py-10 shadow-xl shadow-black/20">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <Compass size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--text-primary)]">You haven&apos;t enrolled in any courses yet</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                  Start your learning journey by browsing our high-quality paths!
                </p>
              </div>
              <button
                onClick={() => router.push("/courses/catalog")}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all inline-flex items-center gap-1 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Browse Available Courses <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            /* Enrolled Courses Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrollments.map((item) => {
                const c = item.course;
                if (!c) return null;

                const validity = getValidityDetails(item.createdAt, c.validityDays || 90);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-blue-500/50 hover:shadow-xl transition-all space-y-3 shadow-lg shadow-black/20 flex flex-col justify-between"
                  >
                    {/* Card Header & Title */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/30 uppercase truncate">
                          {c.category} &bull; Enrolled
                        </span>

                        {/* Validity Status Badge */}
                        {validity.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                            <AlertCircle size={11} /> Access Expired
                          </span>
                        ) : validity.isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 animate-pulse">
                            <Clock size={11} /> {validity.daysLeft} Days Left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                            <ShieldCheck size={11} /> {validity.daysLeft} Days Left
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                        {c.title}
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-snug font-medium">
                        {c.description}
                      </p>
                    </div>

                    {/* Subscription Validity Meta Block */}
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-cyan-400 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Purchased On</p>
                            <p className="font-bold text-[var(--text-primary)]">{validity.purchaseDateStr}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-2">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Valid Until</p>
                            <p className="font-bold text-[var(--text-primary)]">{validity.endDateStr}</p>
                          </div>
                        </div>
                      </div>

                      {/* Validity Time Bar */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] font-bold">
                          <span>Validity Bar</span>
                          <span className={validity.isExpired ? "text-rose-400" : validity.isExpiringSoon ? "text-amber-400" : "text-emerald-400"}>
                            {validity.daysLeft} of {validity.totalDays} Days Remaining
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              validity.isExpired
                                ? "bg-rose-500"
                                : validity.isExpiringSoon
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-blue-500 to-cyan-400"
                            }`}
                            style={{ width: `${validity.percentRemaining}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[9px] text-[var(--text-muted)] font-mono font-medium">
                        Instructor: {c.instructor || "Codenthra AI"}
                      </span>

                      <button
                        onClick={() => handleStartLearning(c)}
                        disabled={validity.isExpired}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1 cursor-pointer ${
                          validity.isExpired
                            ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed opacity-60"
                            : "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-md shadow-blue-500/15"
                        }`}
                      >
                        {validity.isExpired ? "Access Expired" : "Continue Learning"} <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Copilot Panel */}
        <RightAIPanel />
    </div>
  );
}
