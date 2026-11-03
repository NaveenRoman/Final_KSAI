"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useChallenge } from "./ChallengeContext";
import { useEditorTheme } from "../EditorTheme";
import {
  Code2,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowLeft,
  Award,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default function ChallengeHeaderBar() {
  const router = useRouter();
  const { darkMode } = useEditorTheme();
  const {
    isChallengeMode,
    courseSlug,
    chapterOrder,
    challenges,
    activeChallengeId,
    selectChallenge,
    passedChallenges,
    totalChallenges,
    isChapterQuizPassed,
  } = useChallenge();

  if (!isChallengeMode) return null;

  const courseDisplayName =
    courseSlug === "java"
      ? "Java Enterprise"
      : courseSlug === "cpp"
      ? "C++ STL & OOP"
      : courseSlug === "c"
      ? "C Systems"
      : "Python AI";

  return (
    <div
      className={`h-12 px-4 border-b flex items-center justify-between text-xs select-none shrink-0 transition-colors ${
        darkMode
          ? "bg-[#11131E] border-white/10 text-white"
          : "bg-white border-slate-200 text-slate-800"
      }`}
    >
      {/* Left: Course & Chapter Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}`)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            darkMode
              ? "bg-white/5 hover:bg-white/10 text-slate-300"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
          title={`Back to Chapter ${chapterOrder}`}
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Chapter {chapterOrder}</span>
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-1.5 truncate">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
            {courseDisplayName}
          </span>
          <span className="font-extrabold text-xs hidden md:inline truncate">
            Chapter {chapterOrder} Practice Gate
          </span>
        </div>
      </div>

      {/* Center: Multi-Program Sequential Stepper */}
      {challenges.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {challenges.map((ch, idx) => {
            const isActive = ch.id === activeChallengeId;
            const isPassed = ch.isPassed;
            const isUnlocked = ch.isUnlocked;

            return (
              <button
                key={ch.id}
                disabled={!isUnlocked}
                onClick={() => selectChallenge(ch.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : isPassed
                    ? darkMode
                      ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : isUnlocked
                    ? darkMode
                      ? "bg-white/5 hover:bg-white/10 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    : "opacity-40 text-slate-400"
                }`}
                title={ch.title}
              >
                <span>
                  Program {idx + 1}
                  {challenges.length > 1 ? ` (${String.fromCharCode(65 + idx)})` : ""}
                </span>
                {isPassed ? (
                  <CheckCircle2 size={12} className={isActive ? "text-white" : "text-emerald-500"} />
                ) : isUnlocked ? (
                  <Unlock size={11} className={isActive ? "text-white" : "text-blue-400"} />
                ) : (
                  <Lock size={11} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Solved Progress Counter */}
      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
        <span className="text-slate-400 hidden sm:inline">
          Solved: {passedChallenges}/{totalChallenges}
        </span>
        <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
            style={{
              width: `${
                totalChallenges > 0
                  ? Math.round((passedChallenges / totalChallenges) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
