"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Check,
  Filter,
  HelpCircle,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Zap,
  BookMarked,
  AlertCircle,
  FileText,
} from "lucide-react";

type Note = {
  id: string;
  courseId: string;
  chapterId: string;
  topicId?: string | null;
  subtopic?: string | null;
  topic: string;
  title: string;
  type: string;
  content: string;
  metadata?: string | null;
  importance: number;
  isPinned: boolean;
  pageNumber: number;
  sequenceOrder: number;
  createdAt: string;
  updatedAt: string;

  course?: {
    id: string;
    title: string;
    language: string;
  };

  chapter?: {
    id: string;
    title: string;
    orderNumber: number;
  };
};

type NotebookPageResponse = {
  success: boolean;
  course: {
    id: string;
    title: string;
    language: string;
  };
  pageNumber: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  totalUnitsOnPage: number;
  chaptersOnPage: Array<{
    id: string;
    title: string;
    orderNumber: number;
    topics: string[];
  }>;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
  error?: string;
};

const SUPPORTED_COURSES = [
  {
    id: "python",
    title: "Python AI & Data Structures",
    language: "python",
    label: "Python",
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "java",
    title: "Java Enterprise Architecture",
    language: "java",
    label: "Java",
    color: "from-amber-600 to-orange-700",
  },
  {
    id: "c",
    title: "C Systems Programming",
    language: "c",
    label: "C",
    color: "from-slate-700 to-slate-900",
  },
  {
    id: "cpp",
    title: "C++ High-Performance Architecture",
    language: "cpp",
    label: "C++",
    color: "from-cyan-600 to-blue-700",
  },
];

function NotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCourseParam =
    searchParams.get("course") ||
    searchParams.get("language") ||
    searchParams.get("courseId") ||
    "";

  const initialPageParam = parseInt(searchParams.get("page") || "1", 10);

  const [activeCourse, setActiveCourse] = useState<string>(() => {
    if (initialCourseParam) {
      const clean = initialCourseParam.toLowerCase().trim();
      return clean === "c++" ? "cpp" : clean;
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_notes_course");
      if (saved) return saved;
    }
    return "python";
  });

  const [currentPage, setCurrentPage] = useState<number>(initialPageParam || 1);
  const [pageData, setPageData] = useState<NotebookPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Synchronize URL parameters
  useEffect(() => {
    if (initialCourseParam) {
      const clean = initialCourseParam.toLowerCase().trim();
      const normalized = clean === "c++" ? "cpp" : clean;
      if (normalized !== activeCourse) {
        setActiveCourse(normalized);
        setCurrentPage(1);
      }
    }
  }, [initialCourseParam]);

  async function loadPage(courseToLoad: string, pageToLoad: number) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/notes?course=${encodeURIComponent(courseToLoad)}&page=${pageToLoad}&mode=page`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load notebook page.");
      }

      setPageData(data);
      setCurrentPage(data.pageNumber || pageToLoad);
    } catch (err) {
      console.error("Notebook page loading error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load your study notebook."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage(activeCourse, currentPage);
  }, [activeCourse, currentPage]);

  const handleCourseChange = (newCourse: string) => {
    const clean = newCourse.toLowerCase().trim();
    const normalized = clean === "c++" ? "cpp" : clean;
    setActiveCourse(normalized);
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_notes_course", normalized);
    }
    router.replace(`/notes?course=${encodeURIComponent(normalized)}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (pageData && newPage > pageData.totalPages)) return;
    setCurrentPage(newPage);
    router.replace(`/notes?course=${encodeURIComponent(activeCourse)}&page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentCourseObj =
    SUPPORTED_COURSES.find(
      (c) => c.language === activeCourse || c.id === activeCourse
    ) || {
      id: activeCourse,
      title: `${activeCourse.toUpperCase()} Architecture`,
      language: activeCourse,
      label: activeCourse.toUpperCase(),
      color: "from-blue-600 to-indigo-700",
    };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  async function deleteNote(id: string) {
    const confirmed = window.confirm(
      "Remove this learning unit from your notebook? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete note.");
      }
      // Reload current page
      loadPage(activeCourse, currentPage);
    } catch (err) {
      console.error("Delete note error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete note.");
    } finally {
      setDeletingId(null);
    }
  }

  // Filter notes on current page by search query
  const filteredNotes = useMemo(() => {
    if (!pageData?.notes) return [];
    if (!searchQuery.trim()) return pageData.notes;
    const q = searchQuery.toLowerCase().trim();
    return pageData.notes.filter(
      (n) =>
        n.topic.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [pageData?.notes, searchQuery]);

  return (
    <main className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-20">
      {/* Top Application Header */}
      <header className="h-[72px] bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition shadow-xs text-slate-700"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentCourseObj.color} text-white flex items-center justify-center shadow-md`}
            >
              <BookMarked size={20} />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-600">
                {currentCourseObj.label} Notebook • KnowledgeStream AI
              </p>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                {currentCourseObj.label} Student Notebook
              </h1>
            </div>
          </div>
        </div>

        {/* Search within notebook */}
        <div className="hidden md:flex items-center w-[280px] lg:w-[320px] h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 gap-2 focus-within:border-blue-500 focus-within:bg-white transition shadow-xs">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, questions, code..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Course Bar & Page Summary Controls */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          {/* Course Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {SUPPORTED_COURSES.map((c) => {
              const isActive = activeCourse === c.language;
              return (
                <button
                  key={c.language}
                  onClick={() => handleCourseChange(c.language)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <BookOpen size={13} className={isActive ? "text-blue-400" : "text-slate-400"} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Page Jump & Metadata */}
          {pageData && pageData.totalPages > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Page {pageData.pageNumber} of {pageData.totalPages}
              </span>
              {pageData.totalPages > 1 && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Jump:</span>
                  <select
                    value={currentPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {Array.from({ length: pageData.totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Physical A4 Notebook Viewport */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        {loading ? (
          <div className="py-32 text-center">
            <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">
              Opening {currentCourseObj.label} Notebook • Page {currentPage}...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <AlertCircle size={24} className="mx-auto mb-2 text-red-600" />
            <p className="font-bold mb-1">Unable to Load Notebook</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : !pageData || pageData.notes.length === 0 ? (
          /* Empty Notebook State */
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Your {currentCourseObj.label} Notebook is Fresh
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              As you study {currentCourseObj.label} topics with LiveTeacher, every concept,
              checkpoint evaluation, and code example appends chronologically into this notebook.
            </p>
            <button
              onClick={() =>
                router.push(
                  `/courses/${activeCourse === "cpp" || activeCourse === "java" ? activeCourse : "python"}/chapter/1`
                )
              }
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              Begin {currentCourseObj.label} Lesson 1 →
            </button>
          </div>
        ) : (
          /* REAL PHYSICAL A4 NOTEBOOK SHEET */
          <div className="bg-[#FCFCFD] border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden transition relative">
            {/* Authentic Top Binder / Notebook Spine Accent */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

            {/* Notebook Sheet Header */}
            <div className="border-b border-slate-200 px-6 sm:px-10 py-5 bg-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-600">
                    {currentCourseObj.label.toUpperCase()} COURSE NOTEBOOK
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {pageData.chaptersOnPage.length > 0
                      ? pageData.chaptersOnPage.map((c) => c.title).join(", ")
                      : "General Concepts"}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase mt-0.5">
                  Page {pageData.pageNumber} • Chronological Learning Log
                </h2>
              </div>

              {/* Physical A4 Page Badge */}
              <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl shadow-xs">
                <FileText size={13} className="text-blue-400" />
                <span className="text-xs font-mono font-black tracking-wider">
                  A4 • PAGE {pageData.pageNumber} / {pageData.totalPages}
                </span>
              </div>
            </div>

            {/* Ruled Notebook Sheet Content */}
            <div className="p-6 sm:p-10 space-y-10 min-h-[750px]">
              {filteredNotes.map((note, noteIdx) => {
                let meta: any = null;
                if (note.metadata) {
                  try {
                    meta = typeof note.metadata === "string" ? JSON.parse(note.metadata) : note.metadata;
                  } catch {
                    meta = null;
                  }
                }

                const whatAITaught = meta?.whatAITaught;
                const studentQuestions = meta?.studentInteraction?.studentQuestions || meta?.studentQuestions || [];
                const check = meta?.understandingCheck || meta?.teacherQuestions?.[0];
                const strengths = meta?.learningSignals?.strengths || meta?.importantPoints || [];
                const needsSupport = meta?.learningSignals?.needsSupport || [];
                const codeBlocks = whatAITaught?.codeExamples || whatAITaught?.examples || meta?.codeSnippets || meta?.examples || [];

                return (
                  <article
                    key={note.id}
                    className="border border-slate-200/80 bg-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 hover:border-slate-300 transition"
                  >
                    {/* Unit Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold shadow-xs">
                          {note.sequenceOrder || noteIdx + 1}
                        </span>
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            LEARNING UNIT #{note.sequenceOrder || noteIdx + 1} • {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                            {note.topic || note.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {note.chapter && (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-mono font-bold uppercase">
                            Ch {note.chapter.orderNumber}
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-mono font-black uppercase flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Mastered
                        </span>
                        <button
                          onClick={() => deleteNote(note.id)}
                          disabled={deletingId === note.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* What AI Taught (Concept & Core Explanation) */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-blue-600" />
                        <span>WHAT AI TAUGHT • CORE CONCEPTS</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap rounded-xl bg-slate-50/80 p-4 border border-slate-100 font-medium">
                        {whatAITaught?.explanation || meta?.whatILearned || note.content}
                      </div>
                    </div>

                    {/* Key Takeaways */}
                    {whatAITaught?.importantPoints && whatAITaught.importantPoints.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-slate-600" />
                          <span>KEY TAKEAWAYS & PRINCIPLES</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {whatAITaught.importantPoints.map((pt: string, ptIdx: number) => (
                            <div
                              key={ptIdx}
                              className="rounded-xl bg-blue-50/60 border border-blue-200/70 p-3 text-xs font-medium text-blue-950 flex items-start gap-2"
                            >
                              <span className="text-blue-600 font-bold shrink-0">•</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Code & Syntax Examples */}
                    {codeBlocks && codeBlocks.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Code2 size={13} className="text-indigo-600" />
                          <span>CODE & SYNTAX EXAMPLES</span>
                        </div>
                        {codeBlocks.map((block: any, cbIdx: number) => {
                          const codeId = `${note.id}-${cbIdx}`;
                          return (
                            <div
                              key={cbIdx}
                              className="relative rounded-xl bg-slate-950 text-cyan-300 p-4 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800"
                            >
                              <button
                                type="button"
                                onClick={() => copyToClipboard(block.code, codeId)}
                                className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                                title="Copy code"
                              >
                                {copiedCodeId === codeId ? (
                                  <Check size={13} className="text-emerald-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                              <div className="text-[10px] text-slate-400 font-sans mb-1 font-bold uppercase tracking-wider">
                                {block.title || block.lang || activeCourse}
                              </div>
                              <code>{block.code}</code>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Student Interaction & Clarifications */}
                    {studentQuestions && studentQuestions.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <HelpCircle size={13} className="text-emerald-600" />
                          <span>MY QUESTIONS & AI CLARIFICATIONS</span>
                        </div>
                        <div className="space-y-2">
                          {studentQuestions.map((sq: any, sqIdx: number) => (
                            <div
                              key={sqIdx}
                              className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1 text-xs"
                            >
                              <p className="font-bold text-emerald-950">
                                <span className="font-black uppercase text-[10px] text-emerald-700 mr-1.5">Q:</span>
                                {sq.question}
                              </p>
                              <p className="text-emerald-900 pl-4 border-l-2 border-emerald-300 leading-relaxed whitespace-pre-wrap">
                                <span className="font-black uppercase text-[10px] text-emerald-700 mr-1.5">AI:</span>
                                {sq.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Understanding Check & Checkpoint Evaluation */}
                    {check && (
                      <div className="space-y-2 rounded-xl bg-indigo-50/60 border border-indigo-200/80 p-4">
                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Zap size={13} className="text-indigo-600" />
                            <span>UNDERSTANDING CHECK • CHECKPOINT</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[10px] font-bold">
                            Score: {check.score ?? 85}%
                          </span>
                        </div>
                        <div className="text-xs space-y-1.5 pt-1">
                          <p className="font-bold text-indigo-950">
                            <span className="text-indigo-600 mr-1">Teacher:</span> {check.question || check.aiQuestion}
                          </p>
                          {(check.answer || check.studentActualAnswer) && (
                            <p className="text-indigo-900 pl-3 border-l-2 border-indigo-300">
                              <span className="font-bold">My Answer:</span> {check.answer || check.studentActualAnswer}
                            </p>
                          )}
                          {(check.feedback || check.evaluation) && (
                            <p className="text-indigo-800 text-[11px] pt-1">
                              <span className="font-bold">Evaluation:</span> {check.feedback || check.evaluation}
                            </p>
                          )}
                          {check.misconception && (
                            <p className="text-amber-800 text-[11px] bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                              <span className="font-bold">Clarification:</span> {check.misconception}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Real Learning Signals (Strengths & Needs Support) */}
                    {((strengths && strengths.length > 0) || (needsSupport && needsSupport.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {strengths.slice(0, 3).map((st: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Strength: {st}
                          </span>
                        ))}
                        {needsSupport.slice(0, 2).map((ns: string, nIdx: number) => (
                          <span
                            key={nIdx}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Review: {ns}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Notebook Sheet Footer Navigation (Physical Notebook Pagination) */}
            <div className="border-t border-slate-200 px-6 sm:px-10 py-5 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pageData.hasPrevious}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs ${
                  pageData.hasPrevious
                    ? "bg-white border border-slate-200 text-slate-800 hover:bg-slate-100"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                }`}
              >
                <ChevronLeft size={16} />
                <span>Previous Page</span>
              </button>

              <div className="text-center">
                <p className="text-xs font-mono font-black text-slate-900">
                  PAGE {pageData.pageNumber} OF {pageData.totalPages}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {pageData.totalUnitsOnPage} {pageData.totalUnitsOnPage === 1 ? "unit" : "units"} on this page • Sequential append
                </p>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pageData.hasNext}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs ${
                  pageData.hasNext
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                }`}
              >
                <span>Next Page</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
          <Loader2 size={36} className="text-blue-600 animate-spin" />
        </div>
      }
    >
      <NotesContent />
    </Suspense>
  );
}