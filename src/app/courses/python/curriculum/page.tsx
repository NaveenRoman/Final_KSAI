"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
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

export default function PythonCurriculumPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;
  const isPending = sessionData?.isPending ?? false;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("Python AI & Data Structures Architecture");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(2499);
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
      const res = await fetch("/api/courses/python/chapters/0");
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
    const name = user?.name || "Student";
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
          alert("🎉 Course purchased successfully! All chapters are now unlocked.");
          await loadCurriculumData();
        } else {
          alert(enrollData.error || "Enrollment failed.");
        }
      } else {
        const options = {
          key: data.key,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "KnowledgeStream AI",
          description: courseTitle,
          order_id: data.order.id,
          handler: async function (response: any) {
            const enrollRes = await fetch("/api/courses/enroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userEmail: email,
                courseId: courseId,
                paidAmount: coursePrice,
                paymentId: response.razorpay_payment_id,
              }),
            });
            const enrollData = await enrollRes.json();
            if (enrollData.success) {
              alert("🎉 Course purchased successfully! All chapters are now unlocked.");
              await loadCurriculumData();
            } else {
              alert(enrollData.error || "Enrollment failed.");
            }
          },
          prefill: {
            name: name,
            email: email,
          },
        };
        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          alert("Razorpay SDK is loading. Try again.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to complete payment.");
    } finally {
      setBuying(false);
    }
  };

  // Lock State Logic: Strict sequential chapter unlocking
  const isChapterUnlocked = (order: number) => {
    if (order === 0) return true; // Chapter 0 is always unlocked
    if (order === 1) return true; // Chapter 1 is unlocked by default

    // Check if enrolled for chapters > 0
    if (order > 0 && !isEnrolled) return false;

    // Check previous chapter completion state (all topics + recap + quiz >= 75%)
    const prevChapter = chapters.find((c) => c.orderNumber === order - 1);
    if (!prevChapter) return false;

    const prevProgress = progresses.find((p) => p.chapterId === prevChapter.id);
    const prevCompleted = !!prevProgress?.isCompleted && (prevProgress?.quizScore ?? 0) >= 75;

    return prevCompleted;
  };

  // Progress summary
  const completedChaptersCount = progresses.filter((p) => p.isCompleted).length;
  const totalChaptersCount = chapters.length || 11;
  const progressPercentage = Math.round((completedChaptersCount / totalChaptersCount) * 100);

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Custom Top Bar */}
      <header className="w-full border-b border-white/10 bg-[#09090D] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            KS
          </div>
          <div>
            <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-sm font-extrabold text-white">KnowledgeStream AI &bull; Python Course</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
             onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Workspace Content Area */}
      <main data-lenis-prevent className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:text-white transition-colors"
            >
              My Courses
            </button>
            <span>&bull;</span>
            <button
              onClick={() => router.push("/courses/python")}
              className="hover:text-white transition-colors"
            >
              Course
            </button>
            <span>&bull;</span>
            <span className="text-cyan-400 font-mono">Curriculum</span>
          </div>

          <button
            onClick={() => router.push("/courses/python")}
            className="px-4 py-2 rounded-xl glass-panel text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 hover:border-cyan-400/50 transition-all"
          >
            <ArrowLeft size={13} /> Back to Course Overview
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="text-slate-400 text-xs font-mono">Loading Curriculum...</div>
          </div>
        ) : error ? (
          <div className="glass-panel p-10 rounded-3xl border border-red-500/30 text-center space-y-4 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Error</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={loadCurriculumData}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Header curriculum title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <GraduationCap className="text-cyan-400" size={24} />
                  Curriculum Syllabus
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Python AI Course &bull; {completedChaptersCount} of {totalChaptersCount} Chapters Passed ({progressPercentage}%)
                </p>
              </div>

              {/* Circular Mini Progress Ring / Buy banner */}
              {!isEnrolled && (
                <button
                  onClick={handleBuyCourse}
                  disabled={buying}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-xl shadow-blue-500/10"
                >
                  <Sparkles size={14} className="animate-pulse" />
                  {buying ? "Processing..." : `Subscribe to Unlock All (₹${coursePrice})`}
                </button>
              )}
            </div>

            {/* Vertical list of chapters */}
            <div className="space-y-4">
              {chapters.map((chapter) => {
                const unlocked = isChapterUnlocked(chapter.orderNumber);
                const isCompleted = !!progresses.find((p) => p.chapterId === chapter.id)?.isCompleted;
                const active = chapter.orderNumber === completedChaptersCount;

                let cardStyle = "glass-panel border-white/10 bg-[#09090D] hover:border-cyan-500/50 hover:bg-white/5";
                let lockIcon = <Unlock size={16} className="text-cyan-400" />;
                let statusLabel = "Active & Unlocked";

                if (isCompleted) {
                  cardStyle = "glass-panel border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-500/50 hover:bg-emerald-950/10";
                  lockIcon = <CheckCircle2 size={18} className="text-emerald-400" />;
                  statusLabel = "Completed";
                } else if (!unlocked) {
                  cardStyle = "bg-white/5 border-white/5 opacity-60 cursor-not-allowed";
                  lockIcon = <Lock size={16} className="text-slate-500" />;
                  
                  if (!isEnrolled && chapter.orderNumber > 0) {
                    statusLabel = "Locked: Subscribe to unlock all remaining chapters";
                  } else {
                    statusLabel = `Locked: Complete Chapter ${chapter.orderNumber - 1} to unlock`;
                  }
                }

                // Determine metadata
                const lessonCount = "1 Lesson Notes";
                let assesmentLabel = "No Assessment";
                if (chapter.orderNumber === 0) assesmentLabel = "12 Quiz Questions";
                else if (chapter.orderNumber === 1) assesmentLabel = "14 Quiz Questions";
                else if (chapter.orderNumber >= 2) assesmentLabel = "15 Quiz Questions";

                return (
                  <div
                    key={chapter.id}
                    onClick={() => {
                      if (unlocked) {
                        router.push(`/courses/python/chapter/${chapter.orderNumber}`);
                      } else if (!isEnrolled && chapter.orderNumber > 0) {
                        alert("🔒 This chapter is locked. Please subscribe to unlock access.");
                      } else {
                        alert(`🔒 This chapter is locked. Complete Chapter ${chapter.orderNumber - 1} quiz to unlock.`);
                      }
                    }}
                    className={`w-full p-5 rounded-3xl border text-left flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer ${cardStyle}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0 p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        {lockIcon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-cyan-300 uppercase tracking-wider">
                            Chapter {chapter.orderNumber}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            &bull; {lessonCount} {assesmentLabel !== "No Assessment" ? ` &bull; ${assesmentLabel}` : ""}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white leading-snug">
                          {chapter.title.replace(/^Chapter \d+:\s*/, "").replace(/^Topic \d+:\s*/, "")}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono leading-relaxed">
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    {unlocked && (
                      <div className="flex items-center justify-end shrink-0 md:pl-0 pl-14">
                        <button className="px-4 py-2 rounded-xl text-[11px] font-extrabold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 transition-opacity">
                          {isCompleted ? "Review Lesson" : active ? "Start Lesson" : "Go to Lesson"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
