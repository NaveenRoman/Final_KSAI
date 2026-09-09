"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProctoredExamPlayer, QuizQuestion, ExamResult } from "@/components/quiz/ProctoredExamPlayer";

export default function CppQuizPage() {
  const params = useParams();
  const router = useRouter();

  const chapterParam = (params?.id as string) || "1";
  const currentOrderNum = parseInt(chapterParam.replace(/[^0-9]/g, ""), 10) || 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previousResult, setPreviousResult] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/courses/cpp/chapters/${currentOrderNum}/quiz`);
        const data = await res.json();
        if (res.ok && data.success) {
          setQuestions(data.questions || []);
          if (data.previousResult) {
            setPreviousResult(data.previousResult);
          }
        } else {
          setError(data.error || "Failed to load C++ quiz questions.");
        }
      } catch (err) {
        console.error(err);
        setError("Network error loading C++ quiz.");
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

      const res = await fetch(`/api/courses/cpp/chapters/${currentOrderNum}/quiz/submit`, {
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
        alert(data.error || "Failed to submit C++ exam.");
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Network error submitting C++ exam.");
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div className="text-slate-400 text-xs font-mono">Loading C++ Chapter {currentOrderNum} Exam...</div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-md shadow-2xl">
          <h3 className="text-lg font-black text-white">C++ Assessment Notice</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{error || "No quiz questions available for this chapter."}</p>
          <button
            onClick={() => router.push(`/courses/cpp/chapter/${currentOrderNum}`)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 transition"
          >
            Back to C++ Chapter {currentOrderNum}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProctoredExamPlayer
      courseLanguage="cpp"
      courseTitle="C++ Object-Oriented & STL Mastery"
      chapterOrder={currentOrderNum}
      questions={questions}
      previousResult={previousResult}
      onSubmitQuiz={handleSubmitQuiz}
      onBackToLesson={() => router.push(`/courses/cpp/chapter/${currentOrderNum}`)}
      onStartCodingRound={() => router.push(`/editor?language=cpp&chapter=${currentOrderNum}`)}
      onNextChapter={() => router.push(`/courses/cpp/chapter/${currentOrderNum + 1}`)}
      themeColor="indigo"
    />
  );
}
