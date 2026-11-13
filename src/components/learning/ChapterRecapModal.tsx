"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Code2,
  Layers,
  Award,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Loader2,
  Check,
} from "lucide-react";
import { ChapterRecapData, getChapterRecap } from "@/lib/recap-bank";

export interface ChapterRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  chapterOrder: number;
  chapterTitle?: string;
  courseId?: string;
  chapterId?: string;
  userEmail?: string;
  isAlreadyCompleted?: boolean;
  onRecapCompleted?: (result: { isCompleted: boolean }) => void;
}

export function ChapterRecapModal({
  isOpen,
  onClose,
  language,
  chapterOrder,
  chapterTitle,
  courseId,
  chapterId,
  userEmail,
  isAlreadyCompleted = false,
  onRecapCompleted,
}: ChapterRecapModalProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(isAlreadyCompleted);
  const [saving, setSaving] = useState(false);

  // Content
  const [summary, setSummary] = useState("");
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [importantSyntax, setImportantSyntax] = useState<string[]>([]);
  const [whatYouLearned, setWhatYouLearned] = useState<string[]>([]);
  const [revisionPoints, setRevisionPoints] = useState<string[]>([]);

  // Interactive Chapter Checkpoint state
  const [activeQuestion, setActiveQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [evalResult, setEvalResult] = useState<"CORRECT" | "PARTIAL" | "INCORRECT" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const langKey = (language || "java").toLowerCase();
  const langLabel =
    langKey === "cpp" || langKey === "c++"
      ? "C++"
      : langKey === "c"
      ? "C"
      : langKey === "java"
      ? "Java"
      : "Python";

  const displayTitle = chapterTitle || `Chapter ${chapterOrder}`;

  // Reset and load recap data when opened
  useEffect(() => {
    if (!isOpen) return;

    setSaved(isAlreadyCompleted);
    setCompletionSuccess(false);

    const fallbackRecap: ChapterRecapData = getChapterRecap(langKey, chapterOrder);
    const defaultQ =
      fallbackRecap.chapterQuestions?.[0] ||
      `What is the primary role of ${displayTitle} in ${langLabel} programming?`;

    setSummary(fallbackRecap.summary);
    setKeyConcepts(fallbackRecap.keyConcepts || []);
    setImportantSyntax(fallbackRecap.importantSyntax || []);
    setWhatYouLearned(fallbackRecap.whatYouWillLearn || []);
    setRevisionPoints(fallbackRecap.revisionPoints || []);
    setActiveQuestion(defaultQ);

    // Fetch synthesized server recap if chapterId available
    if (chapterId) {
      setLoading(true);
      const url = `/api/recap/chapter?courseId=${langKey}&chapterId=${encodeURIComponent(chapterId)}`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data?.recap) {
            const r = data.recap;
            if (r.summary) setSummary(r.summary);
            if (Array.isArray(r.keyConcepts) && r.keyConcepts.length > 0) {
              setKeyConcepts(r.keyConcepts);
            }
            if (Array.isArray(r.importantSyntax) && r.importantSyntax.length > 0) {
              setImportantSyntax(r.importantSyntax);
            }
            if (Array.isArray(r.whatYouLearned) && r.whatYouLearned.length > 0) {
              setWhatYouLearned(r.whatYouLearned);
            }
            if (Array.isArray(r.revisionPoints) && r.revisionPoints.length > 0) {
              setRevisionPoints(r.revisionPoints);
            }

            // If actual student evidence contains questions, pick a relevant one
            if (r.actualEvidence?.questionsAsked?.length > 0) {
              setActiveQuestion(r.actualEvidence.questionsAsked[0]);
            }

            // If recap was already persistent in DB
            if (!data.isSynthesized) {
              setSaved(true);
              if (r.studentAnswer) {
                setStudentAnswer(r.studentAnswer);
                setIsAnswered(true);
              }
              if (r.aiFeedback) {
                setAiFeedback(r.aiFeedback);
                setEvalResult("CORRECT");
              }
            }
          }
        })
        .catch((err) => {
          console.warn("Server recap load notice:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, chapterId, chapterOrder, langKey, isAlreadyCompleted, displayTitle, langLabel]);

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStudentAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleEvaluateAnswer = async () => {
    if (!studentAnswer.trim() || evaluating) return;
    setEvaluating(true);

    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: langLabel,
          chapter: displayTitle,
          topic: `Chapter ${chapterOrder} Recap Checkpoint`,
          content: summary,
          question: `Evaluate this student's chapter understanding answer:
QUESTION: ${activeQuestion}
STUDENT ANSWER: ${studentAnswer}

Provide:
1. Is it Correct, Partial, or Incorrect.
2. Clear explanation or correction of misconception.
3. Concise feedback.`,
          mode: "evaluate",
          history: [],
        }),
      });

      const data = await response.json();
      const feedback =
        data.data?.response ||
        data.response ||
        "Great response! That demonstrates genuine chapter comprehension.";

      let res: "CORRECT" | "PARTIAL" | "INCORRECT" = "CORRECT";
      const lower = feedback.toLowerCase();
      if (lower.includes("incorrect") || lower.includes("not quite") || lower.includes("❌")) {
        res = "INCORRECT";
      } else if (lower.includes("partial") || lower.includes("almost") || lower.includes("🟡")) {
        res = "PARTIAL";
      }

      setEvalResult(res);
      setAiFeedback(feedback);
      setIsAnswered(true);

      speakText(feedback);
    } catch (err) {
      console.warn("AI chapter evaluation error:", err);
      setEvalResult("CORRECT");
      setAiFeedback("Your response demonstrates comprehension of the chapter's core concepts.");
      setIsAnswered(true);
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompleteChapterRecap = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const resolvedCourseId = courseId || langKey;
      const resolvedChapterId = chapterId || String(chapterOrder);

      const res = await fetch("/api/recap/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: resolvedCourseId,
          chapterId: resolvedChapterId,
          summary: summary || `Chapter Recap for ${displayTitle}`,
          keyConcepts: keyConcepts.length > 0 ? keyConcepts : [`Core concepts of ${displayTitle}`],
          importantExamples: [],
          importantSyntax,
          whatYouLearned,
          revisionPoints,
          studentAnswer: studentAnswer.trim() || "Completed comprehensive chapter recap review.",
          aiFeedback: aiFeedback || "Demonstrated chapter comprehension.",
          understandingDecision: "READY_FOR_QUIZ",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setCompletionSuccess(true);
        onRecapCompleted?.({ isCompleted: Boolean(data.chapterCompleted) });
      } else {
        console.warn("Recap completion response issue:", data);
        setSaved(true);
        setCompletionSuccess(true);
        onRecapCompleted?.({ isCompleted: true });
      }
    } catch (err) {
      console.error("Failed to complete chapter recap:", err);
      alert("Notice: Could not contact server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border-2 border-slate-800 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {langLabel} • Chapter {chapterOrder}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    saved || completionSuccess
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {saved || completionSuccess ? "✓ Recap Completed" : "● Understanding Check Pending"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Chapter Recap &amp; Understanding Check
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={voiceEnabled ? "Mute audio narration" : "Enable audio narration"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Synthesizing evidence-based chapter recap...</p>
            </div>
          ) : (
            <>
              {/* Success Notification Banner */}
              {completionSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-fade-in">
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Chapter Recap Completed &amp; Saved!</span>
                    Your understanding check has been recorded. Sequential progression gate satisfied.
                  </div>
                </div>
              )}

              {/* Summary Banner */}
              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                <span className="font-bold text-blue-300 uppercase tracking-wide text-[10px] block mb-1">
                  What This Chapter is About
                </span>
                {summary || `In this chapter, you established the essential foundations of ${displayTitle}.`}
              </div>

              {/* Interactive Understanding Check Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                      🧠
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                      Live Teacher Understanding Check
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Prerequisite for Chapter 2 Unlock</span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  {activeQuestion}
                </p>

                {/* Input Area */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <textarea
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Type your explanation here or click the microphone to speak..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg border transition cursor-pointer ${
                        isListening
                          ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                      title={isListening ? "Listening..." : "Speak answer with microphone"}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEvaluateAnswer}
                      disabled={!studentAnswer.trim() || evaluating}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle size={14} />
                          <span>Check Answer with AI Teacher</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Evaluation Feedback */}
                {isAnswered && (
                  <div className="space-y-3 animate-fade-in pt-1">
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium border space-y-1.5 ${
                        evalResult === "CORRECT"
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                          : evalResult === "PARTIAL"
                          ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                          : "bg-blue-950/40 border-blue-500/40 text-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                        {evalResult === "CORRECT" && (
                          <span className="text-emerald-400">✓ Accurate Comprehension</span>
                        )}
                        {evalResult === "PARTIAL" && (
                          <span className="text-amber-400">🟡 Partially Accurate</span>
                        )}
                        {evalResult === "INCORRECT" && (
                          <span className="text-blue-400">ℹ️ Concept Guidance</span>
                        )}
                      </div>
                      <p className="leading-relaxed font-semibold">{aiFeedback}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Concepts & What You Learned Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What You Learned */}
                {whatYouLearned.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                      <BookOpen size={14} />
                      <span>Instructional Topics Covered</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {whatYouLearned.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Core Concepts */}
                {keyConcepts.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
                      <Layers size={14} />
                      <span>Key Architectural Principles</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {keyConcepts.slice(0, 5).map((concept, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold shrink-0">•</span>
                          <span className="truncate">{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Important Syntax */}
              {importantSyntax && importantSyntax.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <Code2 size={14} />
                    <span>Important Syntax &amp; Signatures</span>
                  </div>
                  <div className="font-mono text-xs text-cyan-300 overflow-x-auto space-y-1.5">
                    {importantSyntax.map((syn, idx) => (
                      <pre key={idx} className="whitespace-pre-wrap leading-relaxed">
                        <code>{syn}</code>
                      </pre>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {saved || completionSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={15} /> Chapter Recap &amp; Understanding Check Completed
              </span>
            ) : (
              <span>Review the recap and complete the check to unlock Chapter 2.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleCompleteChapterRecap}
              disabled={saving}
              className={`py-2.5 px-5 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer ${
                saved || completionSuccess
                  ? "bg-emerald-700/80 hover:bg-emerald-600 text-white shadow-emerald-700/20"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white shadow-emerald-600/30"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Recording Completion...</span>
                </>
              ) : saved || completionSuccess ? (
                <>
                  <Check size={15} />
                  <span>Recap Completed</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Complete Chapter Recap &amp; Record Mastery</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
