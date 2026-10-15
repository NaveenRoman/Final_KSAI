"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { safeParseResponse } from "@/lib/safe-json";
import { CourseSwitcher } from "@/components/courses/CourseSwitcher";
import {
  Clock,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  BarChart3,
  Compass,
  ArrowLeft,
  Terminal,
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

export default function COverviewPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("C Language Mastery & System Programming");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(1499);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [progresses, setProgresses] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User resolution
  useEffect(() => {
    if (session?.user) {
      setUser({
        name: session.user.name ?? "Student",
        email: session.user.email ?? "",
        role: (session.user as any).role ?? "Student",
      });
    }
  }, [session]);

  // Fetch course metadata
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/courses/c/chapters/0");
        const parsed = await safeParseResponse(res, "C course");

        if (parsed.ok && parsed.data?.success) {
          setCourseTitle(parsed.data.courseTitle);
          setCourseId(parsed.data.courseId);
          setCoursePrice(parsed.data.coursePrice);
          setIsEnrolled(parsed.data.isEnrolled);
          setChapters(parsed.data.chapters || []);
          setProgresses(parsed.data.progresses || []);
        } else {
          setError(parsed.error || parsed.data?.error || "Failed to load course details.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Network error loading overview data.");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  // Calculate Progress Stats
  const completedChaptersCount = progresses.filter((p) => p.isCompleted).length;
  const totalChaptersCount = chapters.length || 11;
  const progressPercentage = Math.round((completedChaptersCount / totalChaptersCount) * 100);

  // Continue Learning Logic
  const handleContinueLearning = () => {
    const nextChapter = chapters.find((c) => {
      const p = progresses.find((prog) => prog.chapterId === c.id);
      return !p || !p.isCompleted;
    });

    if (nextChapter) {
      router.push(`/courses/c/chapter/${nextChapter.orderNumber}`);
    } else {
      router.push(`/courses/c/chapter/0`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Custom Top Bar */}
      <header className="w-full border-b border-white/10 bg-[#09090D] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            C
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-sm font-extrabold text-white">KnowledgeStream AI &bull; C Course</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CourseSwitcher currentLanguage="c" />
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Workspace Content Area */}
      <main data-lenis-prevent className="flex-1 p-4 sm:p-5 lg:p-6 space-y-4 max-w-5xl mx-auto w-full overflow-hidden h-[calc(100vh-4rem)] flex flex-col justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => router.push("/dashboard")}
            className="hover:text-white transition-colors"
          >
            My Courses
          </button>
          <span>&bull;</span>
          <span className="text-emerald-400 font-mono">C Course Overview</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="text-slate-400 text-xs font-mono">Loading Course Details...</div>
          </div>
        ) : error ? (
          <div className="glass-panel p-10 rounded-3xl border border-red-500/30 text-center space-y-4 max-w-md mx-auto flex-1 flex flex-col justify-center">
            <div className="text-red-400 text-sm font-bold">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all mx-auto"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {/* Hero Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 space-y-4 relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <Terminal size={13} /> C System Programming Path &bull; 11 Chapters
              </div>

              <div className="space-y-2 max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {courseTitle}
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Master low-level system programming, memory management, pointers, data structures, and hardware-close architecture in C with interactive live teaching and assessments.
                </p>
              </div>

              {/* Progress Summary Bar */}
              <div className="pt-2 space-y-2 max-w-md">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-emerald-400" /> Overall Progress
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(3, progressPercentage)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  {completedChaptersCount} of {totalChaptersCount} chapters completed
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleContinueLearning}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:brightness-110 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer"
                >
                  <span>{completedChaptersCount > 0 ? "Resume Learning" : "Start Learning C"}</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  onClick={() => router.push("/courses/c/curriculum")}
                  className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700/80 cursor-pointer"
                >
                  <BookOpen size={15} />
                  <span>View Curriculum</span>
                </button>

                <button
                  onClick={() => router.push("/notes?course=c")}
                  className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700/80 cursor-pointer"
                >
                  <Sparkles size={15} className="text-emerald-400" />
                  <span>C Study Notebook</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Chapters</span>
                <div className="text-xl font-black text-white">11 Chapters</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Completed</span>
                <div className="text-xl font-black text-emerald-400">{completedChaptersCount} Done</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Assessments</span>
                <div className="text-xl font-black text-white">11 Quizzes</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Course Status</span>
                <div className="text-xl font-black text-cyan-400">{isEnrolled ? "Enrolled ✓" : "Preview"}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
