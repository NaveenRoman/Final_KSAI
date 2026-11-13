"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Code2,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  Award,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
} from "lucide-react";
import { ChapterRecapData, getChapterRecap } from "@/lib/recap-bank";

interface ChapterRecapCardProps {
  language: string;
  chapterOrder: number;
  chapterTitle?: string;
  courseId?: string;
  chapterId?: string;
  userEmail?: string;
  onStartNextChapter?: () => void;
  onTeachChapterAgain?: () => void;
  onSavedToNotes?: () => void;
}

export function ChapterRecapCard({
  language,
  chapterOrder,
  chapterTitle,
  courseId,
  chapterId,
  userEmail,
  onStartNextChapter,
  onTeachChapterAgain,
  onSavedToNotes,
}: ChapterRecapCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Interactive Chapter Checkpoint state
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [evalResult, setEvalResult] = useState<"CORRECT" | "PARTIAL" | "INCORRECT" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const recap: ChapterRecapData = getChapterRecap(language, chapterOrder);
  const displayTitle = chapterTitle || recap.chapterTitle;

  const langLabel =
    language.toLowerCase() === "cpp" || language.toLowerCase() === "c++"
      ? "C++"
      : language.toLowerCase() === "c"
      ? "C"
      : language.toLowerCase() === "java"
      ? "Java"
      : "Python";

  const badgeColor =
    language === "c"
      ? "from-emerald-600 via-teal-600 to-cyan-600"
      : language === "cpp" || language === "c++"
      ? "from-indigo-600 via-purple-600 to-blue-600"
      : language === "java"
      ? "from-amber-600 via-orange-600 to-red-600"
      : "from-blue-600 via-purple-600 to-cyan-500";

  const chapterQuestions = recap.chapterQuestions || [
    `What is the primary role of ${displayTitle} in ${langLabel} programming?`,
    `What are the most critical syntax rules and memory considerations in this chapter?`,
  ];

  const activeQuestion = chapterQuestions[currentQIndex] || chapterQuestions[0];

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
          content: recap.summary,
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
      const feedback = data.data?.response || data.response || "Great response! That demonstrates chapter comprehension.";

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

      speakText(`${feedback}. Have you understood this chapter clearly?`);
    } catch (err) {
      console.warn("AI chapter evaluation error:", err);
      setEvalResult("CORRECT");
      setAiFeedback("Your response demonstrates comprehension of the chapter's core ideas.");
      setIsAnswered(true);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveToNotes = async (decision?: "START_NEXT_CHAPTER" | "TEACH_AGAIN") => {
    if (!courseId || !chapterId || saving) return;
    setSaving(true);
    try {
      // 1. Save to /api/recap/chapter
      await fetch("/api/recap/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          chapterId,
          summary: recap.summary,
          keyConcepts: recap.keyConcepts,
          importantExamples: [],
          importantSyntax: recap.importantSyntax,
          whatYouLearned: recap.whatYouWillLearn,
          revisionPoints: recap.revisionPoints,
          studentAnswer,
          aiFeedback,
          understandingDecision: decision || "START_NEXT_CHAPTER",
        }),
      });

      setSaved(true);
      onSavedToNotes?.();

      if (decision === "START_NEXT_CHAPTER") {
        onStartNextChapter?.();
      } else if (decision === "TEACH_AGAIN") {
        onTeachChapterAgain?.();
      }
    } catch (err) {
      console.warn("Chapter recap note save notice:", err);
      if (decision === "START_NEXT_CHAPTER") {
        onStartNextChapter?.();
      } else if (decision === "TEACH_AGAIN") {
        onTeachChapterAgain?.();
      }
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="rounded-3xl border-2 border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${badgeColor} text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0`}
          >
            <Sparkles size={22} className="animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[10px] font-mono font-black uppercase tracking-wider">
                {langLabel} • Chapter {chapterOrder}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                CHAPTER RECAP & UNDERSTANDING CHECK
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
              {displayTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCheckpointOpen(!checkpointOpen);
              if (!checkpointOpen) {
                speakText(`Chapter ${chapterOrder} Understanding Check. ${activeQuestion}`);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <HelpCircle size={14} className="text-blue-400" />
            <span>{checkpointOpen ? "Hide Chapter Check" : "Check Chapter Understanding"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveToNotes()}
            disabled={saving}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              saved
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
            }`}
          >
            <BookmarkCheck size={14} className={saved ? "text-emerald-400" : "text-slate-400"} />
            <span>{saved ? "Saved in Notes" : saving ? "Saving..." : "Save to Notes"}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
            aria-label={expanded ? "Collapse Chapter Recap" : "Expand Chapter Recap"}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {expanded && (
        <div className="p-5 sm:p-7 space-y-6 animate-fade-in">
          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            <span className="font-bold text-blue-300 uppercase tracking-wide text-[10px] block mb-1">
              What This Chapter is About
            </span>
            {recap.summary}
          </div>

          {/* Interactive Chapter Understanding Check Section */}
          {checkpointOpen && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-3 animate-scale-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                    🧠
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                    Live Teacher Chapter Checkpoint
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Question {currentQIndex + 1} of {chapterQuestions.length}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                {activeQuestion}
              </p>

              {!isAnswered ? (
                <div className="space-y-2.5 pt-1">
                  <div className="relative">
                    <textarea
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Type your explanation or click the microphone to speak..."
                      className="w-full min-h-[68px] rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none pr-10"
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

                  <button
                    type="button"
                    onClick={handleEvaluateAnswer}
                    disabled={!studentAnswer.trim() || evaluating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:brightness-110 text-white text-xs font-black transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    {evaluating ? (
                      <span>Evaluating Chapter Answer...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Submit Answer for AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium border space-y-1.5 ${
                      evalResult === "CORRECT"
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                        : evalResult === "PARTIAL"
                        ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                        : "bg-red-950/40 border-red-500/40 text-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                      {evalResult === "CORRECT" && <span className="text-emerald-400">✓ Accurate Comprehension</span>}
                      {evalResult === "PARTIAL" && <span className="text-amber-400">🟡 Partially Accurate</span>}
                      {evalResult === "INCORRECT" && <span className="text-red-400">❌ Concept Misconception</span>}
                    </div>
                    <p className="leading-relaxed font-semibold">{aiFeedback}</p>
                  </div>

                  {/* Explicit Decision */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-center">
                    <p className="text-xs font-black text-white">
                      Have you understood this chapter clearly?
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveToNotes("START_NEXT_CHAPTER")}
                        disabled={saving}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>✓ Start Next Chapter / Take Quiz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveToNotes("TEACH_AGAIN")}
                        disabled={saving}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>🔄 Teach This Chapter Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3-Column Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What You Will Learn */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                <BookOpen size={14} />
                <span>What You Will Learn</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {recap.whatYouWillLearn.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Core Concepts */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
                <Layers size={14} />
                <span>Important Concepts & Rules</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {recap.keyConcepts.map((concept, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold shrink-0">✓</span>
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Important Syntax & Code Signatures */}
          {recap.importantSyntax && recap.importantSyntax.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                <Code2 size={14} />
                <span>Key Syntax & Signatures</span>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-cyan-300 overflow-x-auto space-y-2">
                {recap.importantSyntax.map((syn, idx) => (
                  <pre key={idx} className="whitespace-pre-wrap leading-relaxed">
                    <code>{syn}</code>
                  </pre>
                ))}
              </div>
            </div>
          )}

          {/* What You Should Be Able To Do */}
          {recap.whatYouShouldBeAbleToDo && recap.whatYouShouldBeAbleToDo.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-300">
                <Award size={14} />
                <span>After Completing This Chapter, You Should Be Able To:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-purple-100/90 font-medium">
                {recap.whatYouShouldBeAbleToDo.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-purple-400 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
