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

export default function CppOverviewPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("C++ Object-Oriented & STL Masterclass");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(1999);
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
        const res = await fetch("/api/courses/cpp/chapters/1");
        const parsed = await safeParseResponse(res, "C++ course");

        if (parsed.ok && parsed.data?.success) {
          setCourseTitle(parsed.data.courseTitle);
          setCourseId(parsed.data.courseId);
          setCoursePrice(parsed.data.coursePrice);
          setIsEnrolled(parsed.data.isEnrolled);
          setChapters(parsed.data.chapters || []);
          setProgresses(parsed.data.progresses || []);
        } else {
          setError(parsed.error || parsed.data?.error || "Failed to load C++ course details.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Network error loading C++ overview data.");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  // Calculate Progress Stats
  const completedChaptersCount = progresses.filter((p) => p.isCompleted).length;
  const totalChaptersCount = chapters.length || 15;
  const progressPercentage = Math.round((completedChaptersCount / totalChaptersCount) * 100);

  // Continue Learning Logic
  const handleContinueLearning = () => {
    const nextChapter = chapters.find((c) => {
      const p = progresses.find((prog) => prog.chapterId === c.id);
      return !p || !p.isCompleted;
    });

    if (nextChapter) {
      router.push(`/courses/cpp/chapter/${nextChapter.orderNumber}`);
    } else {
      router.push(`/courses/cpp/chapter/1`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Custom Top Bar - Identical to Python */}
      <header className="w-full border-b border-white/10 bg-[#09090D] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            KS
          </div>
          <div>
            <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-sm font-extrabold text-white">KnowledgeStream AI &bull; C++ Course</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CourseSwitcher currentLanguage="cpp" />
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Workspace Content Area - Identical to Python */}
      <main data-lenis-prevent className="flex-1 p-4 sm:p-5 lg:p-6 space-y-4 max-w-5xl mx-auto w-full overflow-hidden h-[calc(100vh-4rem)] flex flex-col justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => router.push("/dashboard")}
            className="hover:text-white transition-colors cursor-pointer"
          >
            My Courses
          </button>
          <span>&bull;</span>
          <span className="text-cyan-400 font-mono">C++ Course Overview</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="text-slate-400 text-xs font-mono">Loading Course Details...</div>
          </div>
        ) : error ? (
          <div className="glass-panel p-10 rounded-3xl border border-red-500/30 text-center space-y-4 max-w-md mx-auto flex-1 flex flex-col justify-center">
            <h3 className="text-base font-bold text-white">Error</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
            {/* Course Title and Hero Details */}
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-950/30 via-[#0C0C16] to-purple-950/30 space-y-3 shadow-2xl relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-300 text-[10px] font-semibold border border-blue-500/20">
                  <Sparkles size={11} className="text-cyan-400" /> Premium Path &bull; Modern C++
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {courseTitle}
                </h1>
                <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
                  Master modern C++ systems architecture: Memory Layout, Smart Pointers, RAII, OOP, Vectors, Templates, Exception Guarantees, Multithreading, Move Semantics, Concepts, and Ranges.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Difficulty</div>
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <BarChart3 size={12} /> Intermediate
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Estimated Time</div>
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <Clock size={12} /> 30 Hours Access
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Chapters</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <BookOpen size={12} /> {totalChaptersCount} Total Chapters
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Estimated Time per Chapter</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Clock size={12} /> 15-30 Mins
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Summary Card - Identical to Python */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-stretch py-1">
              <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0A0A10] to-[#0D0D18] flex flex-col justify-between items-center text-center space-y-2.5 shadow-xl md:col-span-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your Progress</h3>
                
                {/* Progress ring */}
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" className="stroke-white/10 fill-none" strokeWidth="6" />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-cyan-400 fill-none transition-all duration-1000 ease-out"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 - (progressPercentage / 100) * (2 * Math.PI * 40)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white font-mono">{progressPercentage}%</span>
                    <span className="text-[8px] text-slate-400 font-mono uppercase">Completed</span>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-cyan-300">
                  {completedChaptersCount} of {totalChaptersCount} Chapters Passed
                </span>
              </div>

              {/* Navigation Actions Card */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0A0A10] to-[#0D0D18] flex flex-col justify-center space-y-4 shadow-xl md:col-span-2">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Compass className="text-cyan-400" size={18} />
                    Ready to Begin?
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Choose between picking up exactly where you left off or jumping to the full curriculum timeline to browse unlocked chapters and quizzes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleContinueLearning}
                    className="py-3 px-5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-90 transition-opacity glow-btn flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 cursor-pointer"
                  >
                    Continue Learning <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => router.push("/courses/cpp/curriculum")}
                    className="py-3 px-5 rounded-xl font-extrabold text-xs text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Go to Curriculum <BookOpen size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

