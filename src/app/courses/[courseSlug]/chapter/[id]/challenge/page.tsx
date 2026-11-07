"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgrammingChallengeSection } from "@/components/challenges/ProgrammingChallengeSection";
import { ArrowLeft, BookOpen, Code2 } from "lucide-react";

export default function ChapterChallengePage() {
  const params = useParams();
  const router = useRouter();

  const courseSlug = params?.courseSlug ? String(params.courseSlug).toLowerCase() : "java";
  const chapterIdStr = params?.id ? String(params.id) : "1";
  const chapterOrder = parseInt(chapterIdStr, 10);

  const courseTitle =
    courseSlug === "java"
      ? "Java Enterprise Architecture"
      : courseSlug === "cpp"
      ? "C++ Modern & STL Architecture"
      : courseSlug === "c"
      ? "C Systems & Core Architecture"
      : "Python AI & Data Structures";

  React.useEffect(() => {
    if (courseSlug && !isNaN(chapterOrder)) {
      router.replace(`/editor?course=${courseSlug}&chapter=${chapterOrder}`);
    }
  }, [courseSlug, chapterOrder, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md">
            KS
          </div>
          <div>
            <span className="text-[10px] text-blue-600 font-mono font-bold tracking-wider block uppercase">
              {courseTitle}
            </span>
            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Code2 size={15} className="text-blue-600" />
              Chapter {chapterOrder} &bull; Programming Practice Gate
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}/quiz`)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen size={14} /> Chapter Quiz
          </button>

          <button
            onClick={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}`)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Chapter {chapterOrder}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
        <ProgrammingChallengeSection
          courseSlug={courseSlug}
          chapterOrder={chapterOrder}
          chapterTitle={courseTitle}
          onBackToChapter={() => router.push(`/courses/${courseSlug}/chapter/${chapterOrder}`)}
          onAllCompleted={() => {
            // All challenges completed
          }}
        />
      </main>
    </div>
  );
}
