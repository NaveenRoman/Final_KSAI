"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProctoredExamPlayer, QuizQuestion, ExamResult } from "@/components/quiz/ProctoredExamPlayer";

export default function JavaQuizPage() {
  const params = useParams();
  const router = useRouter();

  const chapterParam = (params?.id as string) || "1";
  const currentOrderNum = parseInt(chapterParam.replace(/[^0-9]/g, ""), 10) || 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedProgression, setLockedProgression] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previousResult, setPreviousResult] = useState<any>(null);
  const [nextChapterUnlocked, setNextChapterUnlocked] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      try {
        const res = await fetch(`/api/courses/java/chapters/${currentOrderNum}/quiz`);
        const data = await res.json();
        if (res.ok && data.success) {
          setQuestions(data.questions || []);
          if (data.previousResult) {
            setPreviousResult(data.previousResult);
          }
        } else {
          setError(data.error || "Failed to load Java quiz questions.");
          if (res.status === 403 || data.locked) {
            setIsLocked(true);
            setLockedProgression(data.currentChapterProgression || data.quizEligibility || null);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Network error loading Java quiz.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [currentOrderNum]);

  const handleSubmitQuiz = async (
    answers: Record<number, number>,
    timeTakenMs: number,
    warningsCount: number
  ): Promise<ExamResult | null> => {
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, selectedIdx]) => ({
        questionId: parseInt(qId, 10),
        selectedOption: selectedIdx,
      }));

      const res = await fetch(`/api/courses/java/chapters/${currentOrderNum}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: formattedAnswers,
          timeTakenMs,
          warningsCount,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const resultData = data.result || data;
        if (data.nextChapter?.isUnlocked) {
          setNextChapterUnlocked(true);
        }
        return {
          score: resultData.score ?? 0,
          passed: resultData.passed ?? false,
          correctCount: resultData.correctCount ?? 0,
          totalCount: resultData.totalCount ?? questions.length,
          breakdown: resultData.breakdown || [],
        };
      } else {
        alert(data.error || "Failed to submit Java exam.");
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Network error submitting Java exam.");
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#080D1A)] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
        <div className="text-slate-400 text-xs font-mono">Loading Java Chapter {currentOrderNum} Exam...</div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#080D1A)] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-xl w-full bg-[var(--bg-card,#111C30)] border border-[var(--border-subtle,rgba(148,163,184,0.16))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
            <span className="text-2xl">🔒</span>
          </div>

          <div className="text-center space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              PREREQUISITE REQUIRED
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Chapter {currentOrderNum} Assessment Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {error || "Please complete and master all chapter topics before taking the Chapter Assessment Quiz."}
            </p>
          </div>

          {/* Topic Checklist */}
          {lockedProgression?.topics && lockedProgression.topics.length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary,#0D1425)] border border-[var(--border-subtle,rgba(148,163,184,0.12))] space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Chapter Topics Checklist ({lockedProgression.masteredTopicsCount || 0}/{lockedProgression.totalTopicsCount || lockedProgression.topics.length} Mastered)
              </span>
              <div className="space-y-1.5">
                {lockedProgression.topics.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                    <span className="truncate text-slate-300 font-medium pr-2">{t.title}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      t.isMastered
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : t.status === "LEARNING"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                    }`}>
                      {t.isMastered ? "Mastered ✓" : t.status === "LEARNING" ? "Learning" : "Locked 🔒"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => router.push(`/courses/java/chapter/${currentOrderNum}`)}
              className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              ← Back to Java Chapter {currentOrderNum} Lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#080D1A)] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="p-8 rounded-3xl bg-[var(--bg-card,#111C30)] border border-[var(--border-subtle,rgba(148,163,184,0.16))] text-center space-y-4 max-w-md shadow-2xl">
          <h3 className="text-lg font-black text-white">Java Assessment Notice</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{error || "No quiz questions available for this chapter."}</p>
          <button
            onClick={() => router.push(`/courses/java/chapter/${currentOrderNum}`)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 transition cursor-pointer"
          >
            Back to Java Chapter {currentOrderNum}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProctoredExamPlayer
      courseLanguage="java"
      courseTitle="Java Enterprise & Object-Oriented Architecture"
      chapterOrder={currentOrderNum}
      questions={questions}
      previousResult={previousResult}
      onSubmitQuiz={handleSubmitQuiz}
      onBackToLesson={() => router.push(`/courses/java/chapter/${currentOrderNum}`)}
      onStartCodingRound={() => router.push(`/editor?language=java&chapter=${currentOrderNum}`)}
      onNextChapter={() => router.push(`/courses/java/chapter/${currentOrderNum + 1}`)}
      nextChapterUnlocked={nextChapterUnlocked}
      themeColor="amber"
    />
  );
}
