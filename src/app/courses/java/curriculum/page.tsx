"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { CourseSwitcher } from "@/components/courses/CourseSwitcher";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Clock,
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

export default function JavaCurriculumPage() {
  const router = useRouter();


  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [progresses, setProgresses] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurriculum = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/courses/java/chapters/1");
        const data = await res.json();
        if (res.ok && data.success) {
          setChapters(data.chapters);
          setProgresses(data.progresses);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#09090B]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/courses/java")}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Back to Course Overview</span>
          </button>
        </div>

        <CourseSwitcher currentLanguage="java" />
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
            <Sparkles size={13} /> Java Enterprise Path &bull; 15 Chapters
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Java Course Detailed Curriculum
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

            // Sequential unlock: Chapter 1 unlocked by default; Chapter N requires Chapter N-1 completed with quiz >= 75
            let isUnlocked = false;
            if (ch.orderNumber === 1) {
              isUnlocked = true;
            } else {
              const prevCh = chapters.find((c) => c.orderNumber === ch.orderNumber - 1);
              if (prevCh) {
                const prevProg = progresses.find((p) => p.chapterId === prevCh.id);
                isUnlocked = !!prevProg?.isCompleted && (prevProg?.quizScore ?? 0) >= 75;
              }
            }

            return (
              <div
                key={ch.id}
                onClick={() => router.push(`/courses/java/chapter/${ch.orderNumber}`)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                  !isUnlocked
                    ? "bg-slate-950/40 border-slate-800/40 opacity-70 hover:border-slate-700"
                    : "bg-slate-900/80 border-slate-800/90 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                    !isUnlocked
                      ? "bg-slate-800 text-slate-500 border-slate-700/50"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {!isUnlocked ? <Lock size={16} /> : ch.orderNumber}
                  </div>
                  <div>
                    <h3 className={`text-base font-bold transition-colors ${
                      !isUnlocked ? "text-slate-400" : "text-white group-hover:text-amber-300"
                    }`}>
                      {ch.title}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} /> ~30 mins &bull; Includes Quiz & Code Examples
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 size={14} /> Completed
                    </span>
                  ) : !isUnlocked ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                      <Lock size={12} /> Locked
                    </span>
                  ) : (
                    <button className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 group-hover:bg-amber-300 transition-all flex items-center gap-1">
                      <span>Open Lesson</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
