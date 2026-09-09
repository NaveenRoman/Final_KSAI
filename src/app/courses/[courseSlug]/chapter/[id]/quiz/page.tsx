"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProctoredExamPlayer, QuizQuestion, ExamResult } from "@/components/quiz/ProctoredExamPlayer";

export default function CourseQuizPage() {
  const params = useParams();
  const router = useRouter();

  const courseSlug = params?.courseSlug ? String(params.courseSlug).toLowerCase() : "python";
  const chapterIdStr = params?.id ? String(params.id) : "0";
  const chapterOrder = parseInt(chapterIdStr, 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previousResult, setPreviousResult] = useState<any>(null);

  const courseTitle =
    courseSlug === "java"
      ? "Java Enterprise & Object-Oriented Architecture"
      : courseSlug === "cpp"
      ? "C++ Object-Oriented & STL Mastery"
      : courseSlug === "c"
      ? "C Language Mastery & System Programming"
      : "Python AI & Data Structures Architecture";

  const themeColor =
    courseSlug === "java"
      ? "amber"
      : courseSlug === "cpp"
      ? "indigo"
      : courseSlug === "c"
      ? "emerald"
      : "blue";

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/courses/${courseSlug}/chapters/${chapterOrder}/quiz`);
        const data = await res.json();
        if (res.ok && data.success) {
          setQuestions(data.questions || []);
          if (data.previousResult) {
            setPreviousResult(data.previousResult);
          }
        } else {
          setError(data.error || `Failed to load ${courseSlug.toUpperCase()} quiz questions.`);
        }
      } catch (err) {
        console.error(err);
        setError(`Network error loading ${courseSlug.toUpperCase()} quiz.`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [courseSlug, chapterOrder]);

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

      const res = await fetch(`/api/courses/${courseSlug}/chapters/${chapterOrder}/quiz/submit`, {
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
        return {
          score: resultData.score ?? 0,
          passed: resultData.passed ?? false,
          correctCount: resultData.correctCount ?? 0,
          totalCount: resultData.totalCount ?? questions.length,
          breakdown: resultData.breakdown || [],
        };
      } else {
        alert(data.error || `Failed to submit ${courseSlug.toUpperCase()} exam.`);
        return null;
      }
    } catch (err) {
      console.error(err);
      alert(`Network error submitting ${courseSlug.toUpperCase()} exam.`);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
        <div className="text-slate-400 text-xs font-mono">Loading Chapter {chapterOrder} Proctored Exam...</div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-md shadow-2xl">
          <h3 className="text-lg font-black text-white">Assessment Notice</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{error || "No quiz questions available for this chapter."}</p>
          <button
            onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}`)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 transition"
          >
            Back to Chapter {chapterOrder}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProctoredExamPlayer
      courseLanguage={courseSlug}
      courseTitle={courseTitle}
      chapterOrder={chapterOrder}
      questions={questions}
      previousResult={previousResult}
      onSubmitQuiz={handleSubmitQuiz}
      onBackToLesson={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}`)}
      onStartCodingRound={() => router.push(`/editor?language=${courseSlug}&chapter=${chapterOrder}`)}
      onNextChapter={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder + 1}`)}
      themeColor={themeColor as any}
    />
  );
}
