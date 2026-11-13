"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  Play, ShieldCheck, Eye, Bookmark, Sparkles, RefreshCw,
  CheckCircle, HelpCircle, CalendarDays, BookOpen, Layers
} from "lucide-react";
import { useNotification } from "@/components/ui/NotificationContext";
import { PracticeHistoryPanel } from "@/components/practice/PracticeHistoryPanel";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";

type QuizQuestion = {
  id: string;
  question: string;
  type: string;
  options?: any[];
  answer?: any;
  correctAnswer?: any;
  topic?: string | null;
  difficulty?: string;
  estTimeSeconds?: number;
  marks?: number;
  explanation?: string | null;
};

function QuizGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();
  const session = useSession();
  const sessionUser = (session?.data as any)?.user ?? null;
  const isPending = session?.isPending ?? false;

  const [activeTab, setActiveTab] = useState<"builder" | "history">("builder");
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [builderConfig, setBuilderConfig] = useState({ difficulty: "mixed", count: 10, types: ["mcq"] });
  const [retryModeActive, setRetryModeActive] = useState(false);

  useEffect(() => {
    if (!isPending && sessionUser?.email) {
      fetch(`/api/courses/my-courses?email=${encodeURIComponent(sessionUser.email)}`)
        .then((r) => r.json())
        .then((d) => setEnrollments(d.enrollments || []))
        .catch(console.error);

      fetch(`/api/courses`)
        .then((r) => r.json())
        .then((d) => setCourses(d.courses || []))
        .catch(console.error);

      fetch(`/api/practice/history`)
        .then((r) => r.json())
        .then((d) => setHistory(d.history || []))
        .catch(() => setHistory([]));
    }
  }, [isPending, sessionUser]);

  useEffect(() => {
    if (selectedCourse) {
      setChapters(selectedCourse.chapters || []);
      setSelectedChapters([]);
    } else if (courses.length > 0) {
      const firstCourse = courses[0];
      setSelectedCourse(firstCourse);
      setChapters(firstCourse.chapters || []);
      setSelectedChapters([]);
    }
  }, [selectedCourse, courses]);

  // Handle URL query retry param
  useEffect(() => {
    const courseParam = searchParams.get("courseId");
    const retryParam = searchParams.get("retryMode");

    if (courseParam && courses.length > 0) {
      const found = courses.find((c) => c.id === courseParam);
      if (found) {
        setSelectedCourse(found);
        if (retryParam === "wrong") {
          setRetryModeActive(true);
        }
      }
    }
  }, [searchParams, courses]);

  const myPurchasedCourses = useMemo(() => {
    const purchasedIds = (enrollments || []).map((e) => e.courseId);
    const userPurchased = courses.filter((c) => purchasedIds.includes(c.id));
    return userPurchased.length > 0 ? userPurchased : courses;
  }, [courses, enrollments]);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters((prev) => (prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]));
  };

  const generateQuiz = async (overrideRetryMode = false) => {
    if (!selectedCourse) {
      notify("Please select a course before starting your MCQ quiz.", "warning");
      return;
    }
    if (selectedChapters.length === 0) {
      notify("Please select at least 1 chapter to start your MCQ quiz.", "warning");
      return;
    }
    setIsGenerating(true);

    try {
      const activeChapters = selectedChapters;
      const res = await fetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          chapters: activeChapters,
          config: { ...builderConfig, types: ["mcq"] },
          proctored: true, // Mandatory Proctor Mode
          retryMode: overrideRetryMode || retryModeActive ? "wrong" : "standard",
        }),
      });

      const data = await res.json();
      if (res.ok && data.quiz) {
        // Enforce MCQ type filter on generated questions
        const mcqOnlyQuiz = (data.quiz || []).map((q: any) => ({
          ...q,
          type: "mcq",
          options: q.options && q.options.length > 0 ? q.options : ["Option A", "Option B", "Option C", "Option D"]
        }));
        setQuiz(mcqOnlyQuiz);
        setSessionId(data.sessionId || null);
        notify(
          overrideRetryMode || retryModeActive
            ? "Retry MCQ quiz generated targeting your weak topics! (Proctor Mode Active)"
            : "Adaptive MCQ practice quiz generated successfully! (Proctor Mode Active)",
          "success"
        );
      } else {
        notify(data.error || "Failed to generate MCQ quiz.", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Could not generate MCQ quiz. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans antialiased">
      {/* Unified Left Sidebar */}
      <LeftSidebar
        activeTab="AI Quiz Generator"
        fullHeight={true}
      />

      {/* Main Content Workspace - FIXED 100vh SCREEN (NO PAGE SCROLL) */}
      <main className="flex-1 h-full overflow-hidden p-4 sm:p-5 flex flex-col gap-3.5 w-full max-w-[1600px] mx-auto">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)] leading-tight">AI MCQ Quiz Generator 🧠</h1>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">Practice multiple-choice questions on your enrolled course concepts.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1 border border-[var(--border-subtle)]">
              <button
                onClick={() => setActiveTab("builder")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${activeTab === "builder" ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                MCQ Builder
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${activeTab === "history" ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white shadow-xs" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                History ({history.length})
              </button>
            </div>

            <button onClick={() => router.push('/dashboard')} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-black text-[var(--text-secondary)] shadow-xs hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition cursor-pointer">
              Dashboard
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === "history" ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <PracticeHistoryPanel
                history={history}
                onDelete={(id) => {
                  fetch(`/api/practice/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
                    .then((res) => res.json())
                    .then(() => setHistory((current) => current.filter((item) => item.id !== id)))
                    .catch(() => notify('Unable to delete history item.', 'error'));
                }}
              />
            </div>
          ) : !quiz ? (
            <div className="flex-1 flex flex-col gap-3.5 min-h-0 overflow-hidden">
              {/* Step 1: Course Selector Bar (Horizontal Compact Row) */}
              <div className="bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border-subtle)] shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[10px] font-black text-blue-400">
                    STEP 1
                  </span>
                  <span className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5">
                    <BookOpen size={16} className="text-[var(--brand-blue)]" /> Select Enrolled Course:
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-1 justify-start sm:justify-end">
                  {myPurchasedCourses.map((course) => {
                    const isSelected = selectedCourse?.id === course.id;
                    return (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                          isSelected
                            ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white border-transparent shadow-xs"
                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span>{course.title}</span>
                        {isSelected && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-extrabold">Selected</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 & 3 Combined Workspace - Vertical Stack List (Below Below Only) */}
              <div className="flex-1 bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs flex flex-col min-h-0 overflow-hidden">
                {/* List Header Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[10px] font-black text-blue-400">
                      STEP 2
                    </span>
                    <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                      <Layers size={17} className="text-[var(--brand-blue)]" /> Select Concepts &amp; Chapters
                    </h3>
                    <span className="text-[11px] font-extrabold text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg">
                      {selectedChapters.length} of {chapters.length} Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedChapters(chapters.map((c) => c.id))}
                      className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-xs font-black text-blue-400 hover:bg-blue-500/25 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedChapters([])}
                      className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* STACKED VERTICAL LIST (BELOW BELOW ONLY) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 py-3 min-h-0">
                  {chapters.length === 0 ? (
                    <div className="p-8 text-center text-xs font-semibold text-[var(--text-muted)]">Loading course chapters...</div>
                  ) : (
                    chapters.map((ch: any, idx: number) => {
                      const isSelected = selectedChapters.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleChapter(ch.id)}
                          className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-600/15 border-blue-500/40 ring-1 ring-blue-500/30 shadow-2xs"
                              : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 text-[var(--brand-blue)] rounded border-[var(--border-subtle)] bg-[var(--bg-card)] focus:ring-[var(--brand-blue)] cursor-pointer shrink-0"
                            />
                            <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-black text-[var(--brand-blue)] shrink-0">
                              Chapter {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] truncate">
                              {ch.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                isSelected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              {isSelected ? "✓ Active for Quiz" : "Excluded"}
                            </span>
                            <span className="text-xs font-bold text-[var(--brand-cyan)]">MCQ Practice</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom MCQ Quiz Controls Bar - Mandatory Proctor Mode */}
                <div className="pt-3 border-t border-[var(--border-subtle)] shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-black text-[var(--text-secondary)]">
                    <label className="flex items-center gap-2">
                      <span>Difficulty:</span>
                      <select
                        value={builderConfig.difficulty}
                        onChange={(e) => setBuilderConfig((s) => ({ ...s, difficulty: e.target.value }))}
                        className="rounded-xl bg-[var(--bg-secondary)] p-2 text-xs font-bold border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                      >
                        <option value="mixed">Mixed Difficulty</option>
                        <option value="easy">Easy (2 Marks)</option>
                        <option value="medium">Medium (3 Marks)</option>
                        <option value="hard">Hard (5 Marks)</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2">
                      <span>MCQ Count:</span>
                      <input
                        type="number"
                        value={builderConfig.count}
                        min={1}
                        max={50}
                        onChange={(e) => setBuilderConfig((s) => ({ ...s, count: Number(e.target.value) }))}
                        className="w-16 rounded-xl bg-[var(--bg-secondary)] p-2 text-xs font-bold border border-[var(--border-subtle)] text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                      />
                    </label>

                    {/* MANDATORY PROCTOR MODE BADGE (NOT OPTIONAL) */}
                    <div className="flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-extrabold text-xs">
                      <ShieldCheck size={14} className="text-red-400" />
                      <span>Proctor Mode: Mandatory Active (3/3 Violation Chances)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => generateQuiz(false)}
                      disabled={isGenerating || !selectedCourse || selectedChapters.length === 0}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] hover:opacity-90 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Play size={14} />
                      {isGenerating ? "Generating..." : "Start MCQ Quiz"}
                    </button>

                    <button
                      onClick={() => generateQuiz(true)}
                      disabled={isGenerating || !selectedCourse || selectedChapters.length === 0}
                      className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 px-4 py-2.5 text-xs font-black text-amber-300 shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      Retry Weak MCQs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <QuizPlayer
              quiz={quiz}
              sessionId={sessionId}
              onExit={() => {
                setQuiz(null);
                setSessionId(null);
                fetch(`/api/practice/history`)
                  .then((r) => r.json())
                  .then((d) => setHistory(d.history || []))
                  .catch(() => {});
              }}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}

function QuizPlayer({
  quiz,
  sessionId,
  onExit,
}: {
  quiz: QuizQuestion[];
  sessionId: string | null;
  onExit: () => void;
}) {
  const router = useRouter();
  const { notify } = useNotification();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [confidence, setConfidence] = useState<Record<string, boolean>>({});
  const [violations, setViolations] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const totalSeconds = useMemo(() => {
    return quiz.reduce((sum, q) => {
      const qTime = q.difficulty === "hard" ? 90 : 60;
      return sum + qTime;
    }, 0);
  }, [quiz]);

  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const timerRef = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitFinal();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      autosave();
    }, 10000);
    return () => clearInterval(iv);
  }, [answers, confidence, bookmarks]);

  // MANDATORY PROCTOR MODE MONITORING (3/3 CHANCES)
  useEffect(() => {
    const recordViolation = (type: string) => {
      setViolations((current) => {
        const next = current + 1;
        if (next >= 3) {
          notify(`Proctor Limit Reached (3/3): ${type}. Submitting test immediately...`, "error");
          if (!isSubmitting) submitFinal();
        } else {
          notify(`Proctor Warning (${next}/3 chances used): ${type} detected!`, "warning");
        }
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") recordViolation("Tab switch");
    };
    const handleBlur = () => recordViolation("Window blur");
    const handleContext = (e: Event) => {
      e.preventDefault();
      recordViolation("Right click blocked");
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("Copy blocked");
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("Paste blocked");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContext);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContext);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [isSubmitting]);

  const autosave = async () => {
    if (!sessionId) return;
    try {
      await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers,
          confidence,
          bookmarks: Object.keys(bookmarks).filter((k) => bookmarks[k]),
          timeTakenSeconds: Math.floor((Date.now() - startedAt) / 1000),
          finalize: false,
        }),
      });
    } catch {}
  };

  const setAnswerFor = (qId: string, value: any) => {
    setAnswers((s) => ({ ...s, [qId]: value }));
  };

  const submitFinal = async () => {
    if (!sessionId) {
      notify("Session ID missing", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers,
          confidence,
          bookmarks: Object.keys(bookmarks).filter((k) => bookmarks[k]),
          timeTakenSeconds: Math.floor((Date.now() - startedAt) / 1000),
          finalize: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`MCQ Quiz complete! Score: ${data.scorePercent}% (${data.earnedMarks}/${data.totalMarks} Marks)`, "success");
        onExit();
        router.push(`/practice/results/${sessionId}`);
      } else {
        notify(data.error || 'Submission failed', "error");
      }
    } catch {
      notify('Submission error', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const q = quiz[index];
  const options = q.options && q.options.length > 0 ? q.options : ["Option A", "Option B", "Option C", "Option D"];

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 sm:p-6 shadow-xl max-w-4xl mx-auto flex flex-col gap-4 text-[var(--text-primary)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">MCQ Question {index + 1} of {quiz.length}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-500/15 px-3 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/25">MCQ</span>
            <span className="rounded-full bg-[var(--bg-card)] px-3 py-0.5 text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)]">{q.difficulty?.toUpperCase()} ({q.marks ?? 3} Marks)</span>
            <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/25">Time left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* MANDATORY PROCTOR STATUS BADGE (3/3 CHANCES) */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-extrabold text-red-400">
            <Eye size={14} /> Proctor Mandatory ({violations}/3 Violations)
          </span>
          <button
            onClick={() => setBookmarks((b) => ({ ...b, [q.id]: !b[q.id] }))}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${bookmarks[q.id] ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]'}`}
          >
            <Bookmark size={14} /> {bookmarks[q.id] ? 'Bookmarked' : 'Bookmark'}
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] transition-all duration-300" style={{ width: `${((index + 1) / quiz.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
        <p className="text-sm sm:text-base font-black text-[var(--text-primary)] whitespace-pre-wrap">{q.question}</p>
        {q.topic ? <p className="mt-1.5 text-xs font-bold text-[var(--text-muted)]">Concept / Topic: {q.topic}</p> : null}
      </div>

      <div className="space-y-2">
        {options.map((opt: any, i: number) => (
          <label key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${answers[q.id] === i ? 'bg-blue-600/20 text-[var(--text-primary)] border-blue-500 ring-1 ring-blue-500/40 font-bold' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>
            <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswerFor(q.id, i)} className="h-4 w-4 text-[var(--brand-blue)] border-[var(--border-subtle)] bg-[var(--bg-secondary)] focus:ring-[var(--brand-blue)]" />
            <div className="text-xs font-bold">{typeof opt === 'string' ? opt : JSON.stringify(opt)}</div>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <span className="text-xs font-black text-[var(--text-primary)]">Confidence Level:</span>
        <button
          type="button"
          onClick={() => setConfidence((c) => ({ ...c, [q.id]: true }))}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition ${confidence[q.id] === true ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <CheckCircle size={13} /> Confident
        </button>
        <button
          type="button"
          onClick={() => setConfidence((c) => ({ ...c, [q.id]: false }))}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition ${confidence[q.id] === false ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-black' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]'}`}
        >
          <HelpCircle size={13} /> Not Confident
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex gap-2">
          <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition disabled:opacity-50 cursor-pointer">Previous</button>
          <button onClick={() => setIndex((i) => Math.min(quiz.length - 1, i + 1))} disabled={index === quiz.length - 1} className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition disabled:opacity-50 cursor-pointer">Next</button>
        </div>

        <div className="flex gap-2">
          <button onClick={submitFinal} disabled={isSubmitting} className="px-6 py-2 rounded-2xl bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] hover:opacity-90 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer">Submit MCQ Quiz</button>
          <button onClick={() => { notify('Quiz progress saved.', 'info'); onExit(); }} className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition cursor-pointer">Exit</button>
        </div>
      </div>
    </div>
  );
}

export default function QuizGeneratorPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[var(--bg-primary)] flex items-center justify-center text-xs font-mono font-bold text-[var(--text-muted)]">Loading MCQ Quiz Generator...</div>}>
      <QuizGeneratorContent />
    </Suspense>
  );
}
