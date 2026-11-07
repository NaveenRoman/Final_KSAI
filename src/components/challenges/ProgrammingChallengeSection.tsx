"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Code2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Award,
  Terminal as TerminalIcon,
  BookOpen,
  FileCode,
  Lightbulb,
} from "lucide-react";

// Dynamically import Monaco Editor to prevent SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-slate-400 font-mono text-xs">
      Loading Code Editor...
    </div>
  ),
});

interface ChallengeProgressionItem {
  id: string;
  course: string;
  chapterOrder: number;
  programIndex: number;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  objective: string;
  description: string;
  starterCode: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean; weight: number }>;
  isUnlocked: boolean;
  isPassed: boolean;
  score: number;
  hints: string[];
}

interface ProgressionData {
  chapterOrder: number;
  totalChallenges: number;
  passedChallenges: number;
  isChapterQuizPassed: boolean;
  isAllChallengesPassed: boolean;
  challenges: ChallengeProgressionItem[];
}

interface EvaluationResult {
  passed: boolean;
  score: number;
  minPassingScore: number;
  totalTestCases: number;
  passedTestCases: number;
  results: Array<{
    testCaseIndex: number;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    input: string;
    isHidden: boolean;
    executionTimeMs?: number;
    error?: string;
  }>;
  compilerError?: string | null;
  isChapterCodeComplete?: boolean;
  message?: string;
}

interface ProgrammingChallengeSectionProps {
  courseSlug: string;
  chapterOrder: number;
  chapterTitle?: string;
  onAllCompleted?: () => void;
  onBackToChapter?: () => void;
}

export function ProgrammingChallengeSection({
  courseSlug,
  chapterOrder,
  chapterTitle,
  onAllCompleted,
  onBackToChapter,
}: ProgrammingChallengeSectionProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Student code buffer per challenge ID
  const [codeBuffers, setCodeBuffers] = useState<Record<string, string>>({});
  const [evaluating, setEvaluating] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);

  // AI Tutoring & Hints
  const [hintIndex, setHintIndex] = useState(0);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchProgression = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/courses/${courseSlug}/chapters/${chapterOrder}/challenge`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setProgression(data);

        // Initialize code buffers
        const newBuffers: Record<string, string> = {};
        data.challenges.forEach((ch: ChallengeProgressionItem) => {
          newBuffers[ch.id] = ch.starterCode;
        });
        setCodeBuffers((prev) => ({ ...newBuffers, ...prev }));

        // Default to first unlocked & unpassed challenge or 0
        const firstActive = data.challenges.findIndex(
          (c: ChallengeProgressionItem) => c.isUnlocked && !c.isPassed
        );
        if (firstActive >= 0) {
          setActiveIndex(firstActive);
        }
      } else {
        setError(data.error || "Failed to load chapter challenges");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Network error loading challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgression();
  }, [courseSlug, chapterOrder]);

  const activeChallenge = progression?.challenges?.[activeIndex];

  const currentCode = activeChallenge
    ? codeBuffers[activeChallenge.id] ?? activeChallenge.starterCode
    : "";

  const handleCodeChange = (newCode: string) => {
    if (!activeChallenge) return;
    setCodeBuffers((prev) => ({
      ...prev,
      [activeChallenge.id]: newCode,
    }));
  };

  const handleResetCode = () => {
    if (!activeChallenge) return;
    if (confirm("Reset code back to original starter template?")) {
      setCodeBuffers((prev) => ({
        ...prev,
        [activeChallenge.id]: activeChallenge.starterCode,
      }));
      setEvalResult(null);
      setRunOutput(null);
    }
  };

  // Run code against the first public test case input
  const handleRunCode = async () => {
    if (!activeChallenge) return;
    setRunning(true);
    setRunOutput(null);

    const publicTest = activeChallenge.testCases.find((tc) => !tc.isHidden);
    const stdin = publicTest ? publicTest.input : "";

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeChallenge.course,
          code: currentCode,
          stdin,
          challengeId: activeChallenge.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRunOutput(data.output || (data.success ? "Execution completed with no output." : "Execution failed."));
      } else {
        setRunOutput("Server run error. You can proceed with Submit.");
      }
    } catch {
      setRunOutput("Standard execution response. Click Submit for authoritative evaluation.");
    } finally {
      setRunning(false);
    }
  };

  // Submit code for server-authoritative evaluation
  const handleSubmitCode = async () => {
    if (!activeChallenge) return;
    setEvaluating(true);
    setEvalResult(null);
    setRunOutput(null);

    try {
      const res = await fetch(
        `/api/courses/${courseSlug}/chapters/${chapterOrder}/challenge/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: activeChallenge.id,
            code: currentCode,
            language: activeChallenge.course,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalResult(data);

        // If passed, refresh progression so next program unlocks
        if (data.passed) {
          await fetchProgression();
          if (data.isChapterCodeComplete && onAllCompleted) {
            onAllCompleted();
          }
        }
      } else {
        alert(data.error || "Submission failed. Please check your implementation.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Network error during challenge evaluation. Please retry.");
    } finally {
      setEvaluating(false);
    }
  };

  // Request progressive hint or AI debug explanation
  const handleRequestAiHelp = async (type: "HINT" | "DEBUG") => {
    if (!activeChallenge) return;
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/challenge-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: activeChallenge.id,
          code: currentCode,
          error: evalResult?.compilerError || runOutput || "",
          requestType: type,
          hintIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === "HINT") {
          setHintIndex((prev) => prev + 1);
        } else {
          setAiAdvice(data.advice);
          setShowAiModal(true);
        }
      }
    } catch {
      setAiAdvice("Focus on validating input constraints, formatting spaces correctly, and handling edge cases.");
      setShowAiModal(true);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin" />
        <span className="text-xs font-mono text-slate-500">
          Loading Chapter {chapterOrder} Programming Challenges...
        </span>
      </div>
    );
  }

  if (error || !progression || progression.challenges.length === 0) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
        <AlertCircle size={40} className="text-amber-500 mx-auto" />
        <h3 className="text-base font-black text-slate-900">Challenges Notice</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {error || "No programming challenges defined for this chapter."}
        </p>
        {onBackToChapter && (
          <button
            onClick={onBackToChapter}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Back to Chapter {chapterOrder}
          </button>
        )}
      </div>
    );
  }

  // Quiz Gate check: if quiz is not passed, prompt student to pass quiz first
  if (!progression.isChapterQuizPassed) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 rounded-3xl bg-amber-50/80 border border-amber-200 text-amber-950 shadow-xl space-y-5 text-center">
        <Lock size={44} className="text-amber-600 mx-auto" />
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-amber-900">
            Programming Practice Gate Locked
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
            You must pass the <strong>Chapter {chapterOrder} Proctored Quiz</strong> with a score of at least 75% before accessing the programming challenges.
          </p>
        </div>
        <button
          onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}/quiz`)}
          className="px-6 py-3 rounded-2xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition shadow-lg shadow-amber-600/20"
        >
          Take Chapter {chapterOrder} Quiz Now
        </button>
      </div>
    );
  }

  const monacoLang =
    activeChallenge?.course === "cpp"
      ? "cpp"
      : activeChallenge?.course === "c"
      ? "c"
      : activeChallenge?.course === "python"
      ? "python"
      : "java";

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* 1. Header & Multi-Program Sequential Stepper */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                PRACTICE GATE &bull; CHAPTER {chapterOrder}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {courseSlug.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 pt-1">
              Programming Challenges (Sequential Mastery)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-600">
              Mastery: {progression.passedChallenges} / {progression.totalChallenges} Solved
            </span>
            <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (progression.passedChallenges / progression.totalChallenges) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Multi-Program Tabs / Stepper */}
        {progression.challenges.length > 1 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
              Sequential Challenge Track (Pass Program A &rarr; Unlocks Program B)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {progression.challenges.map((ch, idx) => {
                const isActive = idx === activeIndex;
                const isUnlocked = ch.isUnlocked;
                const isPassed = ch.isPassed;

                return (
                  <button
                    key={ch.id}
                    disabled={!isUnlocked}
                    onClick={() => {
                      setActiveIndex(idx);
                      setEvalResult(null);
                      setRunOutput(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer disabled:cursor-not-allowed ${
                      isActive
                        ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-sm"
                        : isPassed
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60"
                        : isUnlocked
                        ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-black shrink-0 ${
                          isPassed
                            ? "bg-emerald-600 text-white"
                            : isActive
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-black truncate">{ch.title}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {isPassed ? `Score: ${ch.score}%` : ch.difficulty}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPassed ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : isUnlocked ? (
                        <Unlock size={14} className="text-blue-500" />
                      ) : (
                        <Lock size={14} className="text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Work Area: Problem Statement (Left) + Code Editor (Right) */}
      {activeChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Problem Description & Requirements (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-900/5 space-y-5">
              
              {/* Challenge Title & Difficulty Pill */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-black uppercase text-blue-600 tracking-wider">
                    PROGRAM {activeChallenge.programIndex + 1} OF {progression.totalChallenges}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {activeChallenge.title}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                    activeChallenge.difficulty === "HARD"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : activeChallenge.difficulty === "MEDIUM"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {activeChallenge.difficulty}
                </span>
              </div>

              {/* Objective */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-950 text-xs space-y-1">
                <span className="font-bold block text-[10px] uppercase font-mono tracking-wider text-blue-700">
                  Learning Objective
                </span>
                <p className="leading-relaxed">{activeChallenge.objective}</p>
              </div>

              {/* Description */}
              <div className="space-y-2 text-xs text-slate-700">
                <span className="font-bold text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                  Problem Description
                </span>
                <p className="leading-relaxed whitespace-pre-line">
                  {activeChallenge.description}
                </p>
              </div>

              {/* Constraints */}
              {activeChallenge.constraints?.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Constraints
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-[11px]">
                    {activeChallenge.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {activeChallenge.examples?.length > 0 && (
                <div className="space-y-3">
                  <span className="font-bold text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Examples
                  </span>
                  <div className="space-y-2.5">
                    {activeChallenge.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5"
                      >
                        <div className="text-slate-500 text-[10px]">Example {i + 1}:</div>
                        <div>
                          <span className="text-slate-400">Input:</span>{" "}
                          <span className="text-slate-900 font-bold">{ex.input || "(none)"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Output:</span>{" "}
                          <span className="text-emerald-700 font-bold">{ex.output}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progressive Hints & AI Explain */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleRequestAiHelp("HINT")}
                  disabled={aiLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lightbulb size={14} className="text-amber-600" />
                  <span>Reveal Hint ({Math.min(hintIndex, activeChallenge.hints.length)}/{activeChallenge.hints.length})</span>
                </button>

                <button
                  onClick={() => handleRequestAiHelp("DEBUG")}
                  disabled={aiLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles size={14} className="text-indigo-600" />
                  <span>AI Explain / Bug Detect</span>
                </button>
              </div>

              {/* Hints Box if revealed */}
              {hintIndex > 0 && activeChallenge.hints?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1.5 animate-fadeIn">
                  <span className="font-bold text-[10px] uppercase font-mono tracking-wider text-amber-700 flex items-center gap-1">
                    <Lightbulb size={12} /> Socratic Hints
                  </span>
                  <ul className="space-y-1 text-[11px] list-disc list-inside">
                    {activeChallenge.hints.slice(0, hintIndex).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Code Editor + Controls + Terminal (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Editor Container */}
            <div className="bg-[#1e1e1e] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
              
              {/* Editor Bar */}
              <div className="px-5 py-3 bg-[#252526] border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileCode size={15} className="text-blue-400" />
                  <span className="text-slate-300 font-mono font-bold">
                    solution.{monacoLang === "python" ? "py" : monacoLang === "java" ? "java" : monacoLang === "c" ? "c" : "cpp"}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                    {activeChallenge.course}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetCode}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Reset to starter template"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="h-[380px] w-full">
                <Editor
                  height="100%"
                  language={monacoLang}
                  theme="vs-dark"
                  value={currentCode}
                  onChange={(val) => handleCodeChange(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "Fira Code, Consolas, monospace",
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    lineNumbers: "on",
                    tabSize: 4,
                  }}
                />
              </div>

              {/* Action Bar */}
              <div className="px-5 py-3.5 bg-[#252526] border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-slate-400">
                  Pass Threshold: <span className="text-emerald-400 font-bold">&ge; 70%</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleRunCode}
                    disabled={running || evaluating}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play size={13} />
                    <span>{running ? "Testing..." : "Test Run"}</span>
                  </button>

                  <button
                    onClick={handleSubmitCode}
                    disabled={evaluating || running}
                    className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
                  >
                    <CheckCircle2 size={15} />
                    <span>{evaluating ? "Evaluating Test Cases..." : "Submit for Evaluation"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Run Output Panel */}
            {runOutput && (
              <div className="bg-[#1e1e1e] rounded-2xl border border-slate-800 p-4 text-xs font-mono space-y-2 animate-fadeIn shadow-lg">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TerminalIcon size={12} className="text-blue-400" /> Test Run Console Output
                </div>
                <pre className="text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {runOutput}
                </pre>
              </div>
            )}

            {/* Evaluation Results Drawer */}
            {evalResult && (
              <div
                className={`p-6 rounded-3xl border bg-white/95 backdrop-blur-xl space-y-5 shadow-2xl animate-fadeIn ${
                  evalResult.passed ? "border-emerald-200" : "border-rose-200"
                }`}
              >
                {/* Result Summary Bar */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                        evalResult.passed
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                      }`}
                    >
                      {evalResult.passed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-mono font-black uppercase tracking-wider block ${
                          evalResult.passed ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {evalResult.passed
                          ? "✓ CHALLENGE PASSED"
                          : `✗ FAILED (< ${evalResult.minPassingScore}% PASS THRESHOLD)`}
                      </span>
                      <h4 className="text-xl font-black text-slate-900">
                        Score: {evalResult.score}%
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      Test Cases
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900">
                      {evalResult.passedTestCases} / {evalResult.totalTestCases} Passed
                    </span>
                  </div>
                </div>

                {/* Compiler / Execution Error Alert */}
                {evalResult.compilerError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-mono space-y-1">
                    <span className="font-bold text-[10px] uppercase block tracking-wider text-rose-700">
                      Compiler / Runtime Error
                    </span>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[11px]">
                      {evalResult.compilerError}
                    </pre>
                  </div>
                )}

                {/* Test Cases Table */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                    Detailed Test Case Analysis
                  </span>
                  <div className="space-y-2">
                    {evalResult.results.map((tr) => (
                      <div
                        key={tr.testCaseIndex}
                        className={`p-3 rounded-2xl border text-xs font-mono space-y-1 ${
                          tr.passed
                            ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-950"
                            : "bg-rose-50/50 border-rose-200/80 text-rose-950"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>
                            Test Case {tr.testCaseIndex + 1} {tr.isHidden ? "(Hidden)" : ""}
                          </span>
                          <span className={tr.passed ? "text-emerald-600" : "text-rose-600"}>
                            {tr.passed ? "✓ Passed" : "✗ Failed"}
                          </span>
                        </div>
                        {!tr.isHidden && (
                          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                            <div>
                              <span className="text-slate-400 block">Expected:</span>
                              <span className="text-slate-800 font-bold">{tr.expectedOutput}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Actual:</span>
                              <span className={tr.passed ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                                {tr.actualOutput}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation after passing */}
                {evalResult.passed && (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {evalResult.isChapterCodeComplete ? (
                      <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between gap-4 shadow-xl shadow-emerald-500/20">
                        <div className="space-y-0.5">
                          <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                            <Award size={16} /> All Chapter {chapterOrder} Challenges Mastered!
                          </div>
                          <div className="text-xs text-emerald-100">
                            Chapter {chapterOrder + 1} is now unlocked and ready.
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder + 1}`)}
                          className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 text-xs font-black hover:bg-emerald-50 transition shadow-md shrink-0 flex items-center gap-1.5"
                        >
                          <span>Proceed to Chapter {chapterOrder + 1}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      activeIndex + 1 < progression.challenges.length && (
                        <button
                          onClick={() => {
                            setActiveIndex(activeIndex + 1);
                            setEvalResult(null);
                            setRunOutput(null);
                          }}
                          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                          <span>Proceed to Next Program (Program {activeIndex + 2})</span>
                          <ChevronRight size={16} />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Debug / Explain Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                <h4 className="text-sm font-black text-slate-900">
                  AI Tutoring &amp; Diagnostic Guidance
                </h4>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line">
              {aiAdvice}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Back to Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
