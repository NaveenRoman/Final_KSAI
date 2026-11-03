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
  CheckCircle2 
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
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
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
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1 flex-shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-100">
              <Sparkles size={12} /> Learning Path &bull; My Space
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Enrolled Courses 🎓
            </h1>
            <p className="text-slate-500 text-xs font-medium">
              Your registered pathways. Track your subscription validity, purchase date, and remaining days left.
            </p>
          </div>

          {loading ? (
            /* Loading Skeleton */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-3">
              {[1, 2].map((i) => (
                <div key={i} className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-slate-200 rounded-full w-24" />
                    <div className="h-3 bg-slate-200 rounded-full w-10" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-5/6" />
                  </div>
                  <div className="h-16 bg-slate-100 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            /* Empty State */
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white text-center space-y-3 max-w-md mx-auto py-10 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 mx-auto">
                <Compass size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">You haven't enrolled in any courses yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Start your learning journey by browsing our high-quality paths!
                </p>
              </div>
              <button
                onClick={() => router.push("/courses/catalog")}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 transition-opacity inline-flex items-center gap-1 shadow-xs cursor-pointer"
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
                    className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-500/50 hover:shadow-md transition-all space-y-3 shadow-xs flex flex-col justify-between"
                  >
                    {/* Card Header & Title */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase truncate">
                          {c.category} &bull; Enrolled
                        </span>

                        {/* Validity Status Badge */}
                        {validity.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                            <AlertCircle size={11} /> Access Expired
                          </span>
                        ) : validity.isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 animate-pulse">
                            <Clock size={11} /> {validity.daysLeft} Days Left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <ShieldCheck size={11} /> {validity.daysLeft} Days Left
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {c.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug font-medium">
                        {c.description}
                      </p>
                    </div>

                    {/* Subscription Validity Meta Block */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-blue-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Purchased On</p>
                            <p className="font-extrabold text-slate-800">{validity.purchaseDateStr}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-slate-200/80 pl-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Valid Until</p>
                            <p className="font-extrabold text-slate-800">{validity.endDateStr}</p>
                          </div>
                        </div>
                      </div>

                      {/* Validity Time Bar */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold">
                          <span>Validity Bar</span>
                          <span className={validity.isExpired ? "text-rose-500" : validity.isExpiringSoon ? "text-amber-600" : "text-emerald-600"}>
                            {validity.daysLeft} of {validity.totalDays} Days Remaining
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              validity.isExpired
                                ? "bg-rose-500"
                                : validity.isExpiringSoon
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-blue-500 to-emerald-500"
                            }`}
                            style={{ width: `${validity.percentRemaining}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-mono font-semibold">
                        Instructor: {c.instructor || "Codenthra AI"}
                      </span>

                      <button
                        onClick={() => handleStartLearning(c)}
                        disabled={validity.isExpired}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white transition-all flex items-center gap-1 cursor-pointer ${
                          validity.isExpired
                            ? "bg-slate-300 cursor-not-allowed opacity-60"
                            : "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-xs"
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

