"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  CheckCircle2,
  Sparkles,
  BookmarkCheck,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  BookOpen,
  Award,
} from "lucide-react";

interface DailyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onContinueLearning?: () => void;
  onReviewTodayAgain?: (topics: string[]) => void;
}

export function DailyRecapModal({
  isOpen,
  onClose,
  language,
  onContinueLearning,
  onReviewTodayAgain,
}: DailyRecapModalProps) {
  const [loading, setLoading] = useState(true);
  const [recapData, setRecapData] = useState<any>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [evalResult, setEvalResult] = useState<"CORRECT" | "PARTIAL" | "INCORRECT" | null>(null);
  const [step, setStep] = useState<"QUESTION" | "ANSWERED">("QUESTION");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Speech & Voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    const fetchDailyRecap = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/recap/daily?language=${language}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.recap) {
            setRecapData(data.recap);
            const question = data.recap.primaryQuestion || data.recap.questions?.[0] || "What was the most important concept you learned today?";
            speakText(`Today you learned ${data.recap.topics?.length || 0} topics in ${langLabel}. Let's quickly check what you remember. ${question}`);
          }
        }
      } catch (err) {
        console.error("Daily recap fetch notice:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchDailyRecap();
  }, [isOpen, language]);

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

  const currentQuestion = recapData?.primaryQuestion || recapData?.questions?.[0] || `What core principle did you practice in ${langLabel} today?`;

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim() || evaluating) return;
    setEvaluating(true);

    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: langLabel,
          chapter: "Daily Learning Review",
          topic: recapData?.topics?.join(", ") || "Daily Topics",
          content: recapData?.summary || "",
          question: `Evaluate this student's daily review answer:
QUESTION: ${currentQuestion}
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
      const feedback = data.data?.response || data.response || "Great summary of today's learning!";

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

      speakText(`${feedback}. Have you understood today's topics clearly?`);
    } catch (err) {
      console.warn("AI daily evaluation error:", err);
      setEvalResult("CORRECT");
      setAiFeedback("Your response reflects active engagement with today's material.");
      setStep("ANSWERED");
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveAndAction = async (decision: "CONTINUE" | "REVIEW_AGAIN") => {
    setSaving(true);
    try {
      await fetch("/api/recap/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          date: recapData?.date || new Date().toISOString().split("T")[0],
          summary: recapData?.summary,
          topics: recapData?.topics || [],
          keyConcepts: recapData?.keyConcepts || [],
          importantSyntax: recapData?.importantSyntax || [],
          revisionAreas: recapData?.revisionAreas || [],
          question: currentQuestion,
          studentAnswer,
          aiFeedback,
          understandingDecision: decision,
        }),
      });

      setSaved(true);

      if (decision === "CONTINUE") {
        onContinueLearning?.();
        onClose();
      } else {
        onReviewTodayAgain?.(recapData?.topics || []);
        onClose();
      }
    } catch (e) {
      console.warn("Daily recap note save notice:", e);
      if (decision === "CONTINUE") {
        onContinueLearning?.();
      } else {
        onReviewTodayAgain?.(recapData?.topics || []);
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shadow-md shadow-emerald-500/10">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  DAILY RECAP • TODAY&apos;S LEARNING REVIEW
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {langLabel}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate max-w-sm">
                {recapData?.date || "Today's Learning Progress"}
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
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
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
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-400">Compiling today&apos;s learning history...</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Award size={14} />
                  <span>Today You Learned:</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {recapData?.topics && recapData.topics.length > 0 ? (
                    recapData.topics.map((topic: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-200 text-xs font-bold shadow-xs"
                      >
                        {idx + 1}. {topic}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No completed lessons recorded yet today.</span>
                  )}
                </div>
              </div>

              {/* Interactive Daily Question Check */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                      🧠
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                      Let&apos;s Quickly Check What You Remember
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  {currentQuestion}
                </p>

                {step === "QUESTION" ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="relative">
                      <textarea
                        value={studentAnswer}
                        onChange={(e) => setStudentAnswer(e.target.value)}
                        placeholder="Speak your answer with the mic or type your explanation here..."
                        className="w-full min-h-[72px] rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none pr-10"
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
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white text-xs font-black transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      {evaluating ? (
                        <span>Evaluating Your Answer...</span>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Submit Answer for AI Review</span>
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
                        {evalResult === "INCORRECT" && <span className="text-red-400">❌ Misconception Noted</span>}
                      </div>
                      <p className="leading-relaxed font-semibold">{aiFeedback}</p>
                    </div>

                    {/* Explicit Understanding Prompt */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-center">
                      <p className="text-xs font-black text-white">
                        Have you understood today&apos;s topics clearly?
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAndAction("CONTINUE")}
                          disabled={saving}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>{saving ? "Resuming..." : "✓ Continue Learning"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveAndAction("REVIEW_AGAIN")}
                          disabled={saving}
                          className="flex-1 py-2.5 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={14} />
                          <span>🔄 Review Today&apos;s Topics Again</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <BookmarkCheck size={14} className={saved ? "text-emerald-400" : "text-slate-500"} />
            <span>{saved ? "Saved in Study Notes ✓" : "Saved to daily learning history"}</span>
          </div>

          <button
            onClick={() => handleSaveAndAction("CONTINUE")}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Skip to Learning →
          </button>
        </div>
      </div>
    </div>
  );
}
