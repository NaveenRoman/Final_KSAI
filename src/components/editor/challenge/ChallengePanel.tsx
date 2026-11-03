"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useChallenge } from "./ChallengeContext";
import { useEditorTheme } from "../EditorTheme";
import {
  Code2,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Award,
  Terminal,
  RotateCcw,
} from "lucide-react";

export default function ChallengePanel() {
  const router = useRouter();
  const { darkMode } = useEditorTheme();
  const {
    isChallengeMode,
    courseSlug,
    chapterOrder,
    activeChallenge,
    challenges,
    selectChallenge,
    evalResult,
    evaluating,
    testRunning,
    runTestCode,
    submitChallengeCode,
    hintIndex,
    requestAiHelp,
    aiLoading,
    resetCode,
    loading,
    error,
    isChapterQuizPassed,
  } = useChallenge();

  if (!isChallengeMode) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-mono space-y-2">
        <Code2 size={24} className="mx-auto text-slate-500" />
        <p>No active programming challenge.</p>
        <p className="text-[10px] text-slate-500">
          Open a course chapter and click "Programming Challenges Gate" to start.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3 text-xs text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <span>Loading Challenge Specification...</span>
      </div>
    );
  }

  if (error || !activeChallenge) {
    const isAuthError = error?.toLowerCase().includes("authenticated") || error?.toLowerCase().includes("sign in");
    return (
      <div className="p-6 text-center space-y-3">
        <AlertCircle size={32} className="mx-auto text-amber-500" />
        <h4 className="text-sm font-bold text-slate-200">
          {isAuthError ? "Sign In Required" : "Challenge Notice"}
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {isAuthError
            ? "Please sign in to access chapter-specific programming challenges, run tests, and record sequential mastery."
            : error || "No challenge found for this chapter."}
        </p>
        <button
          onClick={() => router.push(isAuthError ? "/login" : `/courses/${courseSlug}/chapter/${chapterOrder}`)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold transition"
        >
          {isAuthError ? "Go to Sign In" : `Return to Chapter ${chapterOrder}`}
        </button>
      </div>
    );
  }

  if (!isChapterQuizPassed) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle size={36} className="mx-auto text-amber-500" />
        <h4 className="text-sm font-bold text-slate-200">Practice Gate Locked</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Please pass the <strong>Chapter {chapterOrder} Quiz</strong> (score &ge; 75%) before attempting the programming challenge.
        </p>
        <button
          onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}/quiz`)}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs text-white font-bold transition"
        >
          Take Chapter Quiz
        </button>
      </div>
    );
  }

  const difficultyColor =
    activeChallenge.difficulty === "HARD"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : activeChallenge.difficulty === "MEDIUM"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Scrollable Problem Specification */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title & Difficulty */}
        <div className="space-y-1.5 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
              Program {activeChallenge.programIndex + 1} of {challenges.length}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${difficultyColor}`}>
              {activeChallenge.difficulty}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-100 leading-snug">
            {activeChallenge.title}
          </h3>
        </div>

        {/* Objective */}
        <div className={`p-3 rounded-2xl border ${
          darkMode ? "bg-blue-950/30 border-blue-500/20 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-900"
        } space-y-1`}>
          <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block tracking-wider">
            Learning Objective
          </span>
          <p className="leading-relaxed">{activeChallenge.objective}</p>
        </div>

        {/* Problem Statement */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
            Problem Description
          </span>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line text-xs">
            {activeChallenge.description}
          </p>
        </div>

        {/* Constraints */}
        {activeChallenge.constraints?.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
              Constraints
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
              {activeChallenge.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Examples */}
        {activeChallenge.examples?.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
              Examples
            </span>
            <div className="space-y-2">
              {activeChallenge.examples.map((ex, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border font-mono text-[11px] space-y-1 ${
                    darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="text-slate-400 text-[10px]">Example {i + 1}:</div>
                  <div>
                    <span className="text-slate-500">Input:</span>{" "}
                    <span className="text-slate-200 font-bold">{ex.input || "(none)"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Output:</span>{" "}
                    <span className="text-emerald-400 font-bold">{ex.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progressive Hints Box */}
        {hintIndex > 0 && activeChallenge.hints?.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-1.5 animate-fadeIn">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1">
              <Lightbulb size={12} /> Socratic Hints ({Math.min(hintIndex, activeChallenge.hints.length)}/{activeChallenge.hints.length})
            </span>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              {activeChallenge.hints.slice(0, hintIndex).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Evaluation Results Card */}
        {evalResult && (
          <div
            className={`p-4 rounded-2xl border space-y-3 animate-fadeIn ${
              evalResult.passed
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-100"
                : "bg-rose-950/40 border-rose-500/30 text-rose-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {evalResult.passed ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <XCircle size={20} className="text-rose-400" />
                )}
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase block">
                    {evalResult.passed ? "Challenge Passed" : "Score Below 70% Threshold"}
                  </span>
                  <span className="text-base font-black">Score: {evalResult.score}%</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-300">
                {evalResult.passedTestCases}/{evalResult.totalTestCases} Tests
              </span>
            </div>

            {/* Compiler Error */}
            {evalResult.compilerError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 font-mono text-[10px] text-rose-300 space-y-1">
                <span className="font-bold text-rose-400 block uppercase">Compiler Diagnostics</span>
                <pre className="overflow-x-auto whitespace-pre-wrap">{evalResult.compilerError}</pre>
              </div>
            )}

            {/* Test Case Breakdown */}
            <div className="space-y-1 pt-1">
              {evalResult.results.map((tr) => (
                <div
                  key={tr.testCaseIndex}
                  className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-mono flex items-center justify-between ${
                    tr.passed
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  }`}
                >
                  <span>Test Case {tr.testCaseIndex + 1} {tr.isHidden ? "(Hidden)" : ""}</span>
                  <span>{tr.passed ? "✓ Passed" : "✗ Failed"}</span>
                </div>
              ))}
            </div>

            {/* Progression Transition Buttons */}
            {evalResult.passed && (
              <div className="pt-2">
                {evalResult.isChapterCodeComplete ? (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase">
                      <Award size={15} /> All Chapter {chapterOrder} Challenges Mastered!
                    </div>
                    <p className="text-[11px] text-emerald-100">
                      Chapter {chapterOrder + 1} is now unlocked and ready.
                    </p>
                    <button
                      onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder + 1}`)}
                      className="w-full py-2 rounded-lg bg-white text-emerald-900 font-black text-xs hover:bg-emerald-50 transition flex items-center justify-center gap-1.5"
                    >
                      <span>Proceed to Chapter {chapterOrder + 1}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  activeChallenge.programIndex + 1 < challenges.length && (
                    <button
                      onClick={() => {
                        const nextProg = challenges[activeChallenge.programIndex + 1];
                        if (nextProg) selectChallenge(nextProg.id);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <span>Proceed to Program {activeChallenge.programIndex + 2}</span>
                      <ChevronRight size={15} />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions inside Panel */}
      <div className={`p-3 border-t shrink-0 flex items-center justify-between gap-2 ${
        darkMode ? "bg-[#11131E] border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
        <button
          onClick={() => requestAiHelp("HINT")}
          disabled={aiLoading}
          className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Reveal progressive hint"
        >
          <Lightbulb size={13} className="text-amber-400" />
          <span>Hint ({Math.min(hintIndex, activeChallenge.hints?.length || 0)}/{activeChallenge.hints?.length || 0})</span>
        </button>

        <button
          onClick={() => requestAiHelp("DEBUG")}
          disabled={aiLoading}
          className="flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Explain bugs with AI"
        >
          <Sparkles size={13} className="text-indigo-400" />
          <span>{aiLoading ? "Consulting..." : "AI Bug Detect"}</span>
        </button>

        <button
          onClick={resetCode}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          title="Reset to starter template"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}
