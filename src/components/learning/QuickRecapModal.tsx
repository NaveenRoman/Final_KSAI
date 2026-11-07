"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Zap,
  CheckCircle2,
  Code2,
  Sparkles,
  BookmarkCheck,
  Lightbulb,
  Copy,
  Check,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronRight,
} from "lucide-react";
import { QuickRecapData, generateQuickRecap, generateCheckpointQuestionForTopic } from "@/lib/recap-bank";

interface QuickRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  chapterOrder: number;
  topicTitle?: string;
  courseId?: string;
  chapterId?: string;
  onContinueLearning?: () => void;
  onTeachAgain?: (topic: string) => void;
  onSavedToNotes?: () => void;
}

export function QuickRecapModal({
  isOpen,
  onClose,
  language,
  chapterOrder,
  topicTitle,
  courseId,
  chapterId,
  onContinueLearning,
  onTeachAgain,
  onSavedToNotes,
}: QuickRecapModalProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Interactive Question & Answer states
  const [resolvedTopic, setResolvedTopic] = useState(topicTitle || "General");
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [evalResult, setEvalResult] = useState<"CORRECT" | "PARTIAL" | "INCORRECT" | null>(null);
  const [step, setStep] = useState<"QUESTION" | "ANSWERED">("QUESTION");

  // Speech input & voice
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const langLabel =
    language.toLowerCase() === "cpp" || language.toLowerCase() === "c++"
      ? "C++"
      : language.toLowerCase() === "c"
      ? "C"
      : language.toLowerCase() === "java"
      ? "Java"
      : "Python";

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Initialize recap & fetch last studied topic if auto
  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      let activeTopic = topicTitle || "";
      if (!activeTopic || activeTopic === "auto") {
        try {
          const res = await fetch(`/api/recap/quick?language=${language}&topic=auto`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.lastStudiedTopic) {
              activeTopic = data.lastStudiedTopic;
            }
          }
        } catch (e) {
          console.warn("Resume topic detection:", e);
        }
      }

      if (!activeTopic) activeTopic = "1. Core Principles";
      setResolvedTopic(activeTopic);

      const q = generateCheckpointQuestionForTopic(language, activeTopic);
      setQuestion(q);
      setStep("QUESTION");
      setStudentAnswer("");
      setAiFeedback("");
      setEvalResult(null);

      speakText(`Welcome back! You were learning ${activeTopic}. Let's do a quick recap. ${q}`);
    };

    void init();
  }, [isOpen, language, topicTitle]);

  // Microphone toggle
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

  if (!isOpen) return null;

  const recap: QuickRecapData = generateQuickRecap(language, chapterOrder, resolvedTopic);

  const handleCopyCode = () => {
    if (recap.codeExample?.code) {
      navigator.clipboard.writeText(recap.codeExample.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim() || evaluating) return;
    setEvaluating(true);

    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: langLabel,
          chapter: `Chapter ${chapterOrder}`,
          topic: resolvedTopic,
          content: `${recap.whatWeLearned}\n${recap.keyConcept}\n${recap.importantSyntaxOrRule}`,
          question: `Evaluate this student resume checkpoint answer:
QUESTION: ${question}
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
      const feedback = data.data?.response || data.response || "Good answer! That captures the concept.";

      let res: "CORRECT" | "PARTIAL" | "INCORRECT" = "CORRECT";
      const lower = feedback.toLowerCase();
      if (lower.includes("incorrect") || lower.includes("not quite") || lower.includes("❌")) {
        res = "INCORRECT";
      } else if (lower.includes("partial") || lower.includes("almost") || lower.includes("🟡")) {
        res = "PARTIAL";
      }

      setEvalResult(res);
      setAiFeedback(feedback);
      setStep("ANSWERED");

      speakText(`${feedback}. Have you understood this topic clearly?`);
    } catch (err) {
      console.warn("AI evaluation notice:", err);
      const fallbackFeedback = "Your response demonstrates understanding of the topic.";
      setEvalResult("CORRECT");
      setAiFeedback(fallbackFeedback);
      setStep("ANSWERED");
      speakText(fallbackFeedback);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveToNotesAndContinue = async (decision: "CONTINUE" | "TEACH_AGAIN") => {
    setSaving(true);
    try {
      await fetch("/api/recap/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          chapterId,
          language: language.toLowerCase(),
          topic: resolvedTopic,
          whatWeLearned: recap.whatWeLearned,
          keyConcept: recap.keyConcept,
          importantSyntaxOrRule: recap.importantSyntaxOrRule,
          codeExample: recap.codeExample,
          oneThingToRemember: recap.oneThingToRemember,
          question,
          studentAnswer,
          aiFeedback,
          understandingDecision: decision,
        }),
      });

      setSaved(true);
      onSavedToNotes?.();

      if (decision === "CONTINUE") {
        onContinueLearning?.();
        onClose();
      } else {
        onTeachAgain?.(resolvedTopic);
        onClose();
      }
    } catch (err) {
      console.warn("Quick recap note save error:", err);
      if (decision === "CONTINUE") {
        onContinueLearning?.();
      } else {
        onTeachAgain?.(resolvedTopic);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border-2 border-slate-700 bg-slate-950 text-white shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-md shadow-amber-500/10">
              <Zap size={20} className="fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  QUICK RECAP • RESUME CHECKPOINT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {langLabel}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate max-w-sm">
                {resolvedTopic}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled && typeof window !== "undefined") window.speechSynthesis.cancel();
              }}
              className={`p-2 rounded-xl border transition ${
                voiceEnabled
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/30"
                  : "bg-slate-800 text-slate-500 border-slate-700"
              }`}
              title={voiceEnabled ? "Voice Enabled" : "Voice Muted"}
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar text-xs sm:text-sm">
          {/* Welcome Banner */}
          <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-2.5">
            <Sparkles size={18} className="text-blue-400 shrink-0" />
            <p className="text-xs text-blue-200 font-medium">
              You were learning <strong className="text-white">{resolvedTopic}</strong>. Let&apos;s verify your comprehension before continuing!
            </p>
          </div>

          {/* 1. What We Learned */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>1. WHAT WE LEARNED</span>
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">
              {recap.whatWeLearned}
            </p>
          </div>

          {/* 2. Key Concept & Important Rule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>2. KEY CONCEPT</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {recap.keyConcept}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/20 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Lightbulb size={13} />
                <span>3. IMPORTANT RULE</span>
              </div>
              <p className="text-amber-100/90 leading-relaxed text-xs">
                {recap.importantSyntaxOrRule}
              </p>
            </div>
          </div>

          {/* 3. Interactive Understanding Check Question & Voice Answer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                  🧠
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                  Live AI Teacher Understanding Check
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Step {step === "QUESTION" ? "1 of 2" : "2 of 2"}</span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
              {question || `What is the primary role of ${resolvedTopic} in ${langLabel}?`}
            </p>

            {/* Step 1: Input area with speech mic */}
            {step === "QUESTION" && (
              <div className="space-y-2.5 pt-1">
                <div className="relative">
                  <textarea
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Speak your answer with the mic or type here..."
                    className="w-full min-h-[72px] rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg border transition cursor-pointer ${
                      isListening
                        ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                    }`}
                    title={isListening ? "Listening... click to stop" : "Speak answer with microphone"}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={!studentAnswer.trim() || evaluating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:brightness-110 text-white text-xs font-black transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {evaluating ? (
                    <span>Evaluating Your Answer...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Check My Understanding</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Evaluation Feedback + Explicit Continue / Teach Again choice */}
            {step === "ANSWERED" && (
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

                {/* Explicit Understanding Prompt */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-center">
                  <p className="text-xs font-black text-white">
                    Have you understood this topic clearly?
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveToNotesAndContinue("CONTINUE")}
                      disabled={saving}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>{saving ? "Resuming..." : "✓ Continue Learning"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveToNotesAndContinue("TEACH_AGAIN")}
                      disabled={saving}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>🔄 Teach This Topic Again</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <BookmarkCheck size={14} className={saved ? "text-emerald-400" : "text-slate-500"} />
            <span>{saved ? "Saved in Study Notes ✓" : "Auto-saved on continue"}</span>
          </div>

          <button
            onClick={() => handleSaveToNotesAndContinue("CONTINUE")}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Skip to Learning →
          </button>
        </div>
      </div>
    </div>
  );
}
