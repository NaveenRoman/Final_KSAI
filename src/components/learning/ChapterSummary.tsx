"use client";

import React, { useState } from "react";
import {
  Sparkles,
  GraduationCap,
  Bot,
} from "lucide-react";

interface ChapterSummaryProps {
  courseId: string;
  chapterId: string;
  courseSlug: string;
  userEmail: string;
}

interface ChapterSummaryData {
  completedTopics: string[];
  strengths: string[];
  weakConcepts: string[];
  masteryScore: number;
  totalEvents: number;
  summary: string;
}

export default function ChapterSummary({
  courseId,
  chapterId,
  courseSlug,
  userEmail,
}: ChapterSummaryProps) {
  const [summary, setSummary] =
    useState<ChapterSummaryData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const generateSummary = async () => {
    if (!courseId || !chapterId || !userEmail) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(
          courseSlug
        )}/chapters/${encodeURIComponent(
          chapterId
        )}/summary?userEmail=${encodeURIComponent(
          userEmail
        )}&courseId=${encodeURIComponent(
          courseId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const isJson = response.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        throw new Error("Invalid response from chapter summary server.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to generate chapter summary."
        );
      }

      setSummary(data.summary);
    } catch (err: any) {
      console.error(
        "Chapter summary error:",
        err
      );

      setError(
        err?.message ||
          "Unable to generate chapter summary."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/40 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap size={20} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Chapter Summary
              </h2>

              <p className="text-xs text-slate-500">
                Your personalized learning review
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() => void generateSummary()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />

            {loading
              ? "Analyzing..."
              : summary
              ? "Refresh Summary"
              : "Generate Summary"}
          </button>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-10 text-center">

          <div className="w-8 h-8 mx-auto rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />

          <p className="text-xs font-bold text-slate-500 mt-3">
            Analyzing your chapter learning data...
          </p>

        </div>
      )}

      {/* Empty */}
      {!loading && !summary && !error && (
        <div className="p-6 text-center">

          <Sparkles
            size={26}
            className="mx-auto text-indigo-500 mb-2"
          />

          <p className="text-sm font-black text-slate-800">
            Your chapter intelligence is ready.
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Generate your personalized summary to
            see your mastery, strengths and weak concepts.
          </p>

        </div>
      )}

      {/* Summary */}
      {summary && !loading && (
        <div className="p-5 space-y-4">

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <div className="p-3 rounded-2xl bg-white border border-slate-200">
              <div className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                Topics Mastered
              </div>

              <div className="text-xl font-black text-slate-900 mt-1">
                {summary.completedTopics.length}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-indigo-100">
              <div className="text-[9px] uppercase font-black tracking-wider text-indigo-500">
                Mastery
              </div>

              <div className="text-xl font-black text-indigo-600 mt-1">
                {summary.masteryScore}%
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-blue-100">
              <div className="text-[9px] uppercase font-black tracking-wider text-blue-500">
                Learning Events
              </div>

              <div className="text-xl font-black text-slate-900 mt-1">
                {summary.totalEvents}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-emerald-100">
              <div className="text-[9px] uppercase font-black tracking-wider text-emerald-500">
                Status
              </div>

              <div className="text-sm font-black text-emerald-600 mt-2">
                {summary.masteryScore >= 70
                  ? "Ready"
                  : "Review Needed"}
              </div>
            </div>

          </div>

          {/* AI Insight */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">

            <div className="flex items-center gap-2 mb-2">

              <Bot
                size={15}
                className="text-indigo-600"
              />

              <span className="text-[10px] uppercase tracking-wider font-black text-indigo-600">
                AI Chapter Insight
              </span>

            </div>

            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              {summary.summary}
            </p>

          </div>

          {/* Strengths + Weak Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">

              <div className="flex items-center gap-2 mb-3">
                <span>💪</span>

                <h3 className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                  Your Strengths
                </h3>
              </div>

              {summary.strengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">

                  {summary.strengths
                    .slice(0, 8)
                    .map((topic) => (
                      <span
                        key={`strength-${topic}`}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-emerald-700"
                      >
                        {topic}
                      </span>
                    ))}

                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  More practice will create stronger mastery signals.
                </p>
              )}

            </div>

            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-100">

              <div className="flex items-center gap-2 mb-3">
                <span>🔄</span>

                <h3 className="text-xs font-black text-red-700 uppercase tracking-wider">
                  Needs More Practice
                </h3>
              </div>

              {summary.weakConcepts.length > 0 ? (
                <div className="flex flex-wrap gap-2">

                  {summary.weakConcepts
                    .slice(0, 8)
                    .map((topic) => (
                      <span
                        key={`weak-${topic}`}
                        className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[10px] font-bold text-red-700"
                      >
                        {topic}
                      </span>
                    ))}

                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-bold">
                  🎉 No major weak concepts detected.
                </p>
              )}

            </div>

          </div>

          {/* Mastered concepts */}
          {summary.completedTopics.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200">

              <div className="flex items-center justify-between mb-3">

                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  🧠 Concepts You Mastered
                </h3>

                <span className="text-[10px] font-mono font-black text-indigo-600">
                  {summary.completedTopics.length} topics
                </span>

              </div>

              <div className="flex flex-wrap gap-2">

                {summary.completedTopics.map(
                  (topic) => (
                    <span
                      key={`mastered-${topic}`}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700"
                    >
                      ✓ {topic}
                    </span>
                  )
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}