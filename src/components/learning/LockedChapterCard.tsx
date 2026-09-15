"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, BookOpen, CheckCircle2, XCircle, Award, Sparkles } from "lucide-react";

export interface LockedChapterProps {
  courseSlug: string;
  courseTitle?: string;
  chapterOrder: number;
  chapterTitle?: string;
  previousChapter?: {
    orderNumber: number;
    title: string;
    isCompleted: boolean;
    requirements?: {
      topicsCompleted: boolean;
      totalTopics: number;
      completedTopicsCount: number;
      chapterRecapCompleted: boolean;
      quizPassed: boolean;
      quizScore: number;
      minPassingScore: number;
    };
  };
  message?: string;
  onRetry?: () => void;
}

export function LockedChapterCard({
  courseSlug,
  courseTitle,
  chapterOrder,
  chapterTitle,
  previousChapter,
  message,
  onRetry,
}: LockedChapterProps) {
  const router = useRouter();
  const prevOrder = previousChapter?.orderNumber ?? (chapterOrder > 0 ? chapterOrder - 1 : 0);
  const reqs = previousChapter?.requirements;

  const topicsDone = reqs?.topicsCompleted ?? false;
  const recapDone = reqs?.chapterRecapCompleted ?? false;
  const quizDone = reqs?.quizPassed ?? false;
  const quizScore = reqs?.quizScore ?? 0;
  const totalTopics = reqs?.totalTopics ?? 0;
  const completedTopics = reqs?.completedTopicsCount ?? 0;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900/95 border border-amber-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center animate-fade-in relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/5">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        {/* Title and message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Lock size={12} /> Sequential Progression Protected
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Chapter {chapterOrder} is Locked
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {message ||
              `Complete Chapter ${prevOrder} and pass its required assessment to unlock Chapter ${chapterOrder}.`}
          </p>
        </div>

        {/* Requirements Checklist Card */}
        {previousChapter && (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-left space-y-3.5 shadow-inner">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>Chapter {prevOrder} Completion Gates</span>
              <span className="text-amber-400 font-normal">All 3 Required</span>
            </div>

            <div className="space-y-2.5">
              {/* Gate A: Topics */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  {topicsDone ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-200">
                    Instructional Lessons & Practice
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    topicsDone
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {totalTopics > 0 ? `${completedTopics}/${totalTopics}` : topicsDone ? "Complete" : "Pending"}
                </span>
              </div>

              {/* Gate B: Recap */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  {recapDone ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-200">
                    Chapter Recap & Understanding Check
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    recapDone
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {recapDone ? "Complete" : "Pending"}
                </span>
              </div>

              {/* Gate C: Quiz */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  {quizDone ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-rose-400 shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-200 block">
                      Chapter Assessment (Quiz)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Minimum Passing Score: 75%
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    quizDone
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {quizScore > 0 ? `${quizScore}%` : "Not Taken"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Primary Action */}
          {topicsDone && recapDone && !quizDone ? (
            <button
              onClick={() => router.push(`/courses/${courseSlug}/chapter/${prevOrder}/quiz`)}
              className="py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Award size={15} /> Take Chapter {prevOrder} Quiz
            </button>
          ) : (
            <button
              onClick={() => router.push(`/courses/${courseSlug}/chapter/${prevOrder}`)}
              className="py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <ArrowLeft size={15} /> Resume Chapter {prevOrder}
            </button>
          )}

          {/* Secondary Action: Curriculum */}
          <button
            onClick={() => router.push(`/courses/${courseSlug}/curriculum`)}
            className="py-3 px-4 rounded-xl font-bold text-xs text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen size={15} /> Curriculum Syllabus
          </button>
        </div>
      </div>
    </div>
  );
}
