"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Play,
  Sparkles,
  Code2,
} from "lucide-react";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  explanation?: string;
  section?: string;
}

export interface QuizBreakdownItem {
  questionId: number;
  question: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  explanation?: string;
  section?: string;
  correct: boolean;
}

export interface ExamResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  breakdown?: QuizBreakdownItem[];
  timeTakenString?: string;
}

interface ProctoredExamPlayerProps {
  courseLanguage: string;
  courseTitle: string;
  chapterOrder: number;
  questions: QuizQuestion[];
  previousResult?: {
    hasTaken: boolean;
    score: number;
    passed: boolean;
    attempts: number;
  } | null;
  onSubmitQuiz: (answers: Record<number, number>, timeTakenMs: number, warningsCount: number) => Promise<ExamResult | null>;
  onBackToLesson: () => void;
  onNextChapter?: () => void;
  onStartCodingRound?: () => void;
  minPassingScore?: number;
  themeColor?: "amber" | "indigo" | "emerald" | "blue" | "purple";
}

export function ProctoredExamPlayer({
  courseLanguage,
  courseTitle,
  chapterOrder,
  questions,
  previousResult,
  onSubmitQuiz,
  onBackToLesson,
  onNextChapter,
  onStartCodingRound,
  minPassingScore = 75,
  themeColor = "blue",
}: ProctoredExamPlayerProps) {
  const router = useRouter();

  // State Machine: "START" -> "EXAM" -> "RESULT"
  const [examState, setExamState] = useState<"START" | "EXAM" | "RESULT">("START");

  // Exam Answers & Question State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  // Proctoring & Timer State
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(15 * 60); // 15 mins default
  const [startTime, setStartTime] = useState<number>(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [warningAlertMessage, setWarningAlertMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed counters
  const totalQuestions = questions.length;
  const attemptedCount = Object.keys(selectedAnswers).length;
  const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
  const currentQuestion = questions[currentIndex];

  // Start Proctored Exam
  const handleStartExam = () => {
    setExamState("EXAM");
    setStartTime(Date.now());
    setTimeRemainingSeconds(Math.max(300, totalQuestions * 90)); // 1.5 mins per question
    setWarningsCount(0);
    setWarningAlertMessage(null);
  };

  // Countdown Timer Logic
  useEffect(() => {
    if (examState !== "EXAM") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit("Timer expired! Exam auto-submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState]);

  // Tab Switch & Visibility Change Detection (Proctoring Engine)
  useEffect(() => {
    if (examState !== "EXAM") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerProctoringWarning("Tab switch / Window minimization detected!");
      }
    };

    const handleWindowBlur = () => {
      triggerProctoringWarning("Browser focus lost!");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [examState, warningsCount]);

  const triggerProctoringWarning = (reason: string) => {
    setWarningsCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount >= 3) {
        handleAutoSubmit("Maximum tab-switch warnings (3/3) exceeded! Exam auto-submitted by AI Proctor.");
      } else {
        setWarningAlertMessage(
          `⚠️ PROCTORING ALERT (${newCount}/3 Warnings): ${reason} Please remain on this exam window. Exceeding 3 warnings will automatically submit your exam!`
        );
      }
      return newCount;
    });
  };

  // Auto-Submit wrapper
  const handleAutoSubmit = async (reasonMsg: string) => {
    if (submitting || examState === "RESULT") return;
    alert(reasonMsg);
    await triggerSubmit();
  };

  // Trigger Submit
  const triggerSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const durationMs = startTime > 0 ? Date.now() - startTime : 0;
    try {
      const res = await onSubmitQuiz(selectedAnswers, durationMs, warningsCount);
      if (res) {
        setExamResult(res);
        setExamState("RESULT");
      }
    } catch (err) {
      console.error("Exam submission failed:", err);
      alert("Submission error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Format MM:SS
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDurationStr = (ms: number) => {
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // -------------------------------------------------------------
  // 1. SCREEN: PRE-EXAM LAUNCHER & INSTRUCTIONS (WHITE GLASS MODE)
  // -------------------------------------------------------------
  if (examState === "START") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-blue-600 selection:text-white">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-blue-950/5 animate-fadeIn">
          {/* Header Badge */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
                <ShieldAlert size={22} />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-blue-600 block">
                  AI PROCTORED EXAM ENVIRONMENT
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  Chapter {chapterOrder} Assessment
                </h1>
              </div>
            </div>
            <button
              onClick={onBackToLesson}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          {/* Exam Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Total Questions</span>
              <div className="text-lg font-black text-slate-900 font-mono">{totalQuestions} MCQs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Time Limit</span>
              <div className="text-lg font-black text-blue-600 font-mono">
                {Math.round((totalQuestions * 90) / 60)} Mins
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Passing Score</span>
              <div className="text-lg font-black text-emerald-600 font-mono">{minPassingScore}%</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Proctoring</span>
              <div className="text-xs font-black text-rose-600 flex items-center gap-1 mt-1">
                <ShieldAlert size={13} /> Strict Lock
              </div>
            </div>
          </div>

          {/* Instructions List */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-2.5 text-xs text-slate-700">
            <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-blue-600" /> Exam Rules &amp; Anti-Cheating Policy:
            </h4>
            <ul className="space-y-2 leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold shrink-0">&bull;</span>
                <span><strong>Proctoring Mode:</strong> Tab switching or minimizing browser windows is strictly tracked. Exceeding 3 warnings will auto-submit your exam.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold shrink-0">&bull;</span>
                <span><strong>Question Navigation:</strong> Use the interactive question palette grid to move between questions, mark answers, or jump back.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold shrink-0">&bull;</span>
                <span><strong>Countdown Timer:</strong> The exam will automatically submit when the timer reaches 00:00.</span>
              </li>
            </ul>
          </div>

          {/* Previous Attempt & Fast Track Status Card */}
          {previousResult && previousResult.hasTaken && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    ✓
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 block">
                      Quiz Record Found
                    </span>
                    <h4 className="text-sm font-black text-slate-900">
                      {previousResult.passed
                        ? `🎉 Exam Passed (Score: ${previousResult.score}%)`
                        : `⚠️ Attempted (Best Score: ${previousResult.score}%)`}
                    </h4>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-xs font-mono font-bold shadow-2xs">
                  Attempts: <strong>{previousResult.attempts || 1}</strong>
                </div>
              </div>

              {/* Fast-Track Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    if (onStartCodingRound) {
                      onStartCodingRound();
                    } else {
                      router.push(`/editor?language=${courseLanguage.toLowerCase()}&chapter=${chapterOrder}`);
                    }
                  }}
                  className="w-full py-3.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Code2 size={16} />
                  <span>Skip Quiz &amp; Proceed to Chapter {chapterOrder} Coding Round</span>
                  <ArrowRight size={16} />
                </button>

                {onNextChapter && (
                  <button
                    onClick={onNextChapter}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Skip Quiz &amp; Go to Chapter {chapterOrder + 1}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Start / Retake Exam Button */}
          <button
            onClick={handleStartExam}
            className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
              previousResult && previousResult.hasTaken
                ? "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/10 border border-slate-700"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/25"
            }`}
          >
            {previousResult && previousResult.hasTaken ? (
              <>
                <RotateCcw size={18} />
                <span>Retake Chapter Exam (Optional)</span>
              </>
            ) : (
              <>
                <Play size={18} className="fill-current" />
                <span>Start Chapter Exam (Proctoring Mode)</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. SCREEN: ACTIVE PROCTORED EXAM PLAYER (WHITE GLASS MODE)
  // -------------------------------------------------------------
  if (examState === "EXAM") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Top Proctoring Header Bar */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md shadow-slate-900/5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="text-[10px] font-mono font-black text-blue-600 uppercase tracking-wider block">
                🛡️ Exam Proctoring Active
              </span>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                {courseTitle} &bull; Chapter {chapterOrder}
              </h2>
            </div>
          </div>

          {/* Proctoring Warning Badge & Timer */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Warning Count */}
            <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border shadow-xs ${
              warningsCount > 0
                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              <ShieldAlert size={14} className={warningsCount > 0 ? "text-rose-600" : "text-slate-500"} />
              <span>Warnings: <strong className={warningsCount > 0 ? "text-rose-700 font-extrabold" : "text-slate-900"}>{warningsCount} / 3</strong></span>
            </div>

            {/* Timer */}
            <div className={`px-3.5 py-1 rounded-xl text-sm font-mono font-black flex items-center gap-1.5 border shadow-xs ${
              timeRemainingSeconds < 120
                ? "bg-rose-50 text-rose-700 border-rose-200 animate-bounce"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              <Clock size={16} />
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>
          </div>
        </header>

        {/* Tab Switch Warning Alert Banner */}
        {warningAlertMessage && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-rose-900 text-xs font-bold flex items-center justify-between gap-4 animate-fadeIn shrink-0 z-40 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{warningAlertMessage}</span>
            </div>
            <button
              onClick={() => setWarningAlertMessage(null)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] cursor-pointer shrink-0 shadow-xs"
            >
              I Understand &bull; Dismiss
            </button>
          </div>
        )}

        {/* Exam Palette & Main Content Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Focused Single Question Card */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Question Card */}
            {currentQuestion && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white/90 border border-slate-200/80 backdrop-blur-xl space-y-6 shadow-xl shadow-blue-950/5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-mono font-bold">
                  <span className="text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={14} /> Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                    {currentQuestion.section || `Chapter ${chapterOrder} Core`}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-relaxed">
                  {currentQuestion.question}
                </h3>

                {/* Option Choices */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {currentQuestion.options.map((optionText, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === optIdx;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          setSelectedAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: optIdx,
                          }));
                        }}
                        className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/90 border-2 border-blue-600 text-blue-950 font-bold shadow-md ring-2 ring-blue-500/20"
                            : "bg-slate-50/70 border-2 border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 text-slate-800 transition-all shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-600"
                          }`}>
                            {["A", "B", "C", "D"][optIdx]}
                          </span>
                          <span>{optionText}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-5 py-3 rounded-2xl font-bold text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ChevronLeft size={16} /> Previous Question
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-6 py-3 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  Next Question <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={triggerSubmit}
                  disabled={submitting}
                  className="px-7 py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? "Submitting Exam..." : "Submit Final Exam"}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Real Exam Palette Overview & Counters */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Palette Summary Card */}
            <div className="p-5 rounded-3xl bg-white/90 border border-slate-200/80 backdrop-blur-xl space-y-4 shadow-xl shadow-blue-950/5">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Eye size={14} className="text-blue-600" /> Exam Palette &amp; Status
              </h4>

              {/* Counters */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-0.5">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-wider block">Attempted</span>
                  <div className="text-xl font-black font-mono leading-none">{attemptedCount}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-0.5">
                  <span className="text-[9px] uppercase font-mono font-bold tracking-wider block">Unattempted</span>
                  <div className="text-xl font-black font-mono leading-none">{unattemptedCount}</div>
                </div>
              </div>

              {/* Interactive Question Grid Palette */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">
                  Question Navigation Grid ({attemptedCount}/{totalQuestions} Answered)
                </span>
                
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {questions.map((q, qIdx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isCurrent = qIdx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(qIdx)}
                        className={`h-10 rounded-xl font-mono text-xs font-black transition-all border flex items-center justify-center cursor-pointer relative ${
                          isCurrent
                            ? "bg-blue-600 text-white border-2 border-blue-700 ring-4 ring-blue-200 font-black shadow-md scale-105 z-10"
                            : isAnswered
                            ? "bg-emerald-500 text-white border border-emerald-600 font-black shadow-xs hover:bg-emerald-600"
                            : "bg-slate-100 text-slate-700 border border-slate-200/80 font-bold hover:bg-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {qIdx + 1}
                        {isAnswered && !isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1 right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Submit Exam Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={triggerSubmit}
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl font-black text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {submitting ? "Submitting..." : "Submit Exam Now"}
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. SCREEN: EXAM EVALUATION & DETAILED RESULTS (WHITE GLASS MODE)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md">
            KS
          </div>
          <div>
            <span className="text-[10px] text-blue-600 font-mono font-bold tracking-wider block">EXAM EVALUATION</span>
            <span className="text-sm font-extrabold text-slate-900">{courseTitle} &bull; Chapter {chapterOrder}</span>
          </div>
        </div>
        <button
          onClick={onBackToLesson}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ArrowLeft size={14} /> Back to Lesson
        </button>
      </header>

      {/* Main Body Results */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 animate-fadeIn">
        {examResult && (
          <div className="space-y-8">
            
            {/* Score Header Card */}
            <div className={`p-6 sm:p-8 rounded-3xl border bg-white/90 backdrop-blur-xl text-center space-y-6 shadow-2xl shadow-blue-950/5 ${
              examResult.passed ? "border-emerald-200" : "border-rose-200"
            }`}>
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border shadow-xs ${
                examResult.passed
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-rose-50 border-rose-200 text-rose-600"
              }`}>
                <Award size={42} />
              </div>

              <div className="space-y-2">
                <span className={`text-xs font-mono font-bold uppercase tracking-widest px-3.5 py-1 rounded-full border shadow-xs ${
                  examResult.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {examResult.passed ? "🎉 Chapter Exam Passed!" : `⚠️ Exam Failed (Score Below ${minPassingScore}%)`}
                </span>

                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 pt-1">
                  Score: {examResult.score}%
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {examResult.passed
                    ? `Outstanding work! You scored ${examResult.score}% (${examResult.correctCount} of ${examResult.totalCount} correct) and unlocked Chapter ${chapterOrder + 1}.`
                    : `You scored ${examResult.score}% (${examResult.correctCount} of ${examResult.totalCount} correct). Review the weak areas identified below and retake the exam to unlock the next chapter.`}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[9px] text-slate-500 uppercase font-mono font-bold">Accuracy</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{examResult.correctCount}/{examResult.totalCount}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[9px] text-slate-500 uppercase font-mono font-bold">Time Taken</div>
                  <div className="text-sm font-bold text-blue-600 font-mono mt-1">
                    {examResult.timeTakenString || formatDurationStr(Date.now() - startTime)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[9px] text-slate-500 uppercase font-mono font-bold">Warnings</div>
                  <div className="text-sm font-bold text-rose-600 font-mono mt-1">{warningsCount}/3 Tab Switch</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setExamState("START");
                    setSelectedAnswers({});
                    setExamResult(null);
                  }}
                  className="px-6 py-3 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={16} /> Retake Proctored Exam
                </button>

                {examResult.passed && (
                  <>
                    <button
                      onClick={() => {
                        if (onStartCodingRound) {
                          onStartCodingRound();
                        } else {
                          router.push(`/editor?language=${courseLanguage.toLowerCase()}&chapter=${chapterOrder}`);
                        }
                      }}
                      className="px-6 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
                    >
                      <Code2 size={16} />
                      <span>Proceed to Chapter {chapterOrder} Coding Round</span>
                      <ArrowRight size={16} />
                    </button>

                    {onNextChapter && (
                      <button
                        onClick={onNextChapter}
                        className="px-5 py-3 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <span>Next Chapter ({chapterOrder + 1})</span> <ArrowRight size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Question Breakdown List */}
            {examResult.breakdown && Array.isArray(examResult.breakdown) && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white/90 border border-slate-200/80 backdrop-blur-xl space-y-4 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600" /> Detailed Question Analysis &amp; Explanations
                </h3>

                <div className="space-y-3 pt-2">
                  {examResult.breakdown.map((item, bIdx) => (
                    <div
                      key={bIdx}
                      className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-2.5 ${
                        item.correct
                          ? "bg-emerald-50/50 border-emerald-200/80 text-slate-800"
                          : "bg-rose-50/50 border-rose-200/80 text-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 font-bold text-sm">
                        <span className="text-slate-900">{bIdx + 1}. {item.question}</span>
                        {item.correct ? (
                          <span className="flex items-center gap-1 text-emerald-600 shrink-0 font-mono text-xs font-extrabold">
                            <CheckCircle2 size={16} /> Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-600 shrink-0 font-mono text-xs font-extrabold">
                            <XCircle size={16} /> Incorrect
                          </span>
                        )}
                      </div>

                      <div className="pl-3 space-y-1.5 text-xs border-l-2 border-slate-200">
                        <div>Your Answer: <strong className={item.correct ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{item.options[item.userAnswer] || "Not Attempted"}</strong></div>
                        {item.explanation && (
                          <div className="text-slate-600 text-[11px] pt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                            💡 <strong>{item.correct ? "Concept Note:" : "Learning Guidance & Concept Hint:"}</strong> {item.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prominent Bottom Action Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/90 border border-slate-200/80 backdrop-blur-xl space-y-5 shadow-2xl shadow-blue-950/5 text-center">
              <div className="space-y-1">
                <h3 className="text-base sm:text-xl font-black text-slate-900">
                  {examResult.passed ? "🎉 Congratulations! Ready for the Coding Round?" : "💪 Concept Review Complete — Ready to Retake?"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {examResult.passed
                    ? `You passed Chapter ${chapterOrder} Exam! Enter the interactive IDE workspace to solve hands-on coding challenges for this chapter.`
                    : `Review the concept guidance notes above and retake the assessment to score ${minPassingScore}% or higher.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setExamState("START");
                    setSelectedAnswers({});
                    setExamResult(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-6 py-3.5 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <RotateCcw size={16} /> Retake Proctored Exam
                </button>

                {examResult.passed && (
                  <>
                    <button
                      onClick={() => {
                        if (onStartCodingRound) {
                          onStartCodingRound();
                        } else {
                          router.push(`/editor?language=${courseLanguage.toLowerCase()}&chapter=${chapterOrder}`);
                        }
                      }}
                      className="px-8 py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2.5 cursor-pointer shadow-xl shadow-blue-600/25 active:scale-[0.99]"
                    >
                      <Code2 size={18} />
                      <span>Proceed to Chapter {chapterOrder} Coding Round</span>
                      <ArrowRight size={18} />
                    </button>

                    {onNextChapter && (
                      <button
                        onClick={onNextChapter}
                        className="px-6 py-3.5 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <span>Next Chapter ({chapterOrder + 1})</span> <ArrowRight size={16} />
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={onBackToLesson}
                  className="px-6 py-3.5 rounded-2xl font-bold text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ArrowLeft size={16} /> Back to Chapter Lesson
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
