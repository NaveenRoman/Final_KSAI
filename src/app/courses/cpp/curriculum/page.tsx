"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { CourseSwitcher } from "@/components/courses/CourseSwitcher";
import {
  Lock,
  Unlock,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface ChapterItem {
  id: string;
  title: string;
  orderNumber: number;
}

interface ProgressItem {
  chapterId: string;
  isCompleted: boolean;
  quizScore: number;
}

export default function CppCurriculumPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;
  const isPending = sessionData?.isPending ?? false;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("C++ High Performance System Architecture");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(1999);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [buying, setBuying] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [progresses, setProgresses] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User resolution
  useEffect(() => {
    if (!isPending && session?.user) {
      setUser({
        name: session.user.name ?? "Student",
        email: session.user.email ?? "",
        role: (session.user as any).role ?? "Student",
      });
    }
  }, [session, isPending]);

  // Load curriculum details
  const loadCurriculumData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses/cpp/chapters/1");
      const data = await res.json();

      if (res.ok && data.success) {
        setCourseTitle(data.courseTitle);
        setCourseId(data.courseId);
        setCoursePrice(data.coursePrice);
        setIsEnrolled(data.isEnrolled);
        setUserEmail(data.userEmail || "student@gmail.com");
        setChapters(data.chapters);
        setProgresses(data.progresses);
      } else {
        setError(data.error || "Failed to load curriculum details.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading curriculum data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculumData();
  }, []);

  // Purchase enrollment fallback
  const handleBuyCourse = async () => {
    if (!courseId) return;
    const email = user?.email || userEmail || "student@gmail.com";
    setBuying(true);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: coursePrice,
          currency: "INR",
          courseId: courseId,
          userEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Order creation failed.");
        setBuying(false);
        return;
      }

      const { isMock } = data;

      if (isMock) {
        alert("🔧 Local Dev Mode: Simulating Razorpay Payment Gateway. Click OK to confirm purchase.");

        const enrollRes = await fetch("/api/courses/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: email,
            courseId: courseId,
            paidAmount: coursePrice,
            paymentId: `pay_mock_${Date.now()}`,
          }),
        });

        const enrollData = await enrollRes.json();
        if (enrollData.success) {
          alert("🎉 C++ Course purchased successfully! All chapters are now unlocked.");
          await loadCurriculumData();
        } else {
          alert(enrollData.error || "Enrollment failed.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Payment processing error. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#09090B]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/courses/cpp")}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Back to Course Overview</span>
          </button>
        </div>

        <CourseSwitcher currentLanguage="cpp" />
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
            <Sparkles size={13} /> C++ Mastery &bull; 15 Chapters
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            C++ Course Detailed Curriculum
          </h1>
          <p className="text-slate-400 text-sm">
            Select any chapter below to dive straight into its interactive markdown lesson, code snippets, diagrams, and quiz assessments.
          </p>
        </div>

        {/* Chapters Detailed List */}
        <div className="space-y-4">
          {chapters.map((ch) => {
            const prog = progresses.find((p) => p.chapterId === ch.id);
            const isCompleted = prog?.isCompleted;

            // Strict sequential lock: Chapter 1 unlocked by default; Chapter N requires Chapter N-1 complete with quiz >= 75
            let isLocked = false;
            if (ch.orderNumber > 1 && !isEnrolled) {
              isLocked = true;
            } else if (ch.orderNumber >= 2) {
              const prevCh = chapters.find((c) => c.orderNumber === ch.orderNumber - 1);
              if (prevCh) {
                const prevProg = progresses.find((p) => p.chapterId === prevCh.id);
                const prevCompleted = !!prevProg?.isCompleted && (prevProg?.quizScore ?? 0) >= 75;
                if (!prevCompleted) isLocked = true;
              }
            }

            return (
              <div
                key={ch.id}
                onClick={() => {
                  if (isLocked) {
                    handleBuyCourse();
                  } else {
                    router.push(`/courses/cpp/chapter/${ch.orderNumber}`);
                  }
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                  isLocked
                    ? "bg-slate-950/40 border-slate-800/40 opacity-75 hover:border-slate-700"
                    : isCompleted
                    ? "bg-indigo-950/10 border-indigo-500/30 hover:border-indigo-500/60"
                    : "bg-slate-900/80 border-slate-800/90 hover:border-indigo-500/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isLocked
                        ? "bg-slate-800 text-slate-500"
                        : isCompleted
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-slate-800 text-indigo-400"
                    }`}
                  >
                    {isLocked ? <Lock size={16} /> : isCompleted ? <CheckCircle2 size={18} /> : ch.orderNumber}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Chapter {ch.orderNumber}
                      </span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                          Completed
                        </span>
                      )}
                      {isLocked && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                          Locked (Subscribe to Access)
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {ch.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLocked) {
                        handleBuyCourse();
                      } else {
                        router.push(`/courses/cpp/chapter/${ch.orderNumber}`);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isLocked
                        ? "bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock size={13} />
                        <span>Unlock Chapter</span>
                      </>
                    ) : (
                      <>
                        <BookOpen size={13} />
                        <span>{isCompleted ? "Review Chapter" : "Start Learning"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
