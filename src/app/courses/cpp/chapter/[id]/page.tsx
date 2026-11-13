"use client";

import React, { useState, useEffect, useRef } from "react";
import LiveTeacher, { LiveTeacherHandle } from "@/components/learning/LiveTeacher";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { renderMarkdown } from "@/lib/markdown";
import { QuickRecapModal } from "@/components/learning/QuickRecapModal";
import { VisionAttachment } from "@/components/learning/VisionAttachment";
import { CourseSwitcher } from "@/components/courses/CourseSwitcher";
import { CheckpointEvaluation, parseCheckpointEvaluation } from "@/types/teaching-types";
import {
  extractLessonTitles as parseLessonTitles,
  getFirstUncompletedLesson,
  isLessonUnlocked,
} from "@/lib/curriculum-parser";
import {
  AlertCircle,
  Award,
  Clock,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Bot,
  FileText,
  MessageSquare,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ChapterLearningAnalysis } from "@/lib/adaptive/types";
import { LockedChapterCard } from "@/components/learning/LockedChapterCard";
import { ChapterRecapModal } from "@/components/learning/ChapterRecapModal";

interface ChapterItem {
  id: string;
  title: string;
  orderNumber: number;
}

interface ProgressItem {
  chapterId: string;
  isCompleted: boolean;
  quizScore: number;
}

type LearningStatus =
  | "NOT_STARTED"
  | "LEARNING"
  | "PRACTICED"
  | "NEEDS_REVIEW"
  | "MASTERED";

interface LessonProgress {
  lesson: string;
  status: LearningStatus;
  score: number;
  attempts: number;
  questionsAsked: number;
  correctAnswers: number;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

function stripMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/[#*`>_\-]/g, "")
    .replace(/\[!NOTE\]/gi, "Note:")
    .replace(/\[!TIP\]/gi, "Tip:")
    .replace(/\[!IMPORTANT\]/gi, "Important:")
    .replace(/\[!WARNING\]/gi, "Warning:")
    .replace(/\[!CAUTION\]/gi, "Caution:")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/\|.*?\|/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/graph (TD|LR)[\s\S]*?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLessonTitles(content: string, order?: number): string[] {
  return parseLessonTitles(content, order);
}

function findLessonIndex(lessons: string[], current: string | null | undefined): number {
  if (!current || !lessons || lessons.length === 0) return -1;
  const exact = lessons.indexOf(current);
  if (exact !== -1) return exact;

  const normCurrent = current.trim().toLowerCase();
  const caseMatch = lessons.findIndex((l) => l.trim().toLowerCase() === normCurrent);
  if (caseMatch !== -1) return caseMatch;

  const cleanCurrent = current.replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "").trim().toLowerCase();
  if (cleanCurrent) {
    const cleanMatch = lessons.findIndex((l) => {
      const cl = l.replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "").trim().toLowerCase();
      return cl === cleanCurrent || cl.includes(cleanCurrent) || cleanCurrent.includes(cl);
    });
    if (cleanMatch !== -1) return cleanMatch;
  }
  return -1;
}

const safeJson = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
};

export default function CppChapterPage() {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lessonContentRef = useRef<HTMLElement | null>(null);
  const liveTeacherRef = useRef<LiveTeacherHandle | null>(null);
  const topicChatMapRef = useRef<Record<string, Array<{ question: string; answer: string }>>>({});

  const router = useRouter();
  const params = useParams();
  const chapterIdStr = params?.id ? String(params.id) : "1";
  const chapterOrder = parseInt(chapterIdStr, 10) || 1;

  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;
  const isPending = sessionData?.isPending ?? false;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("C++ Object-Oriented Mastery");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(50);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [buying, setBuying] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [currentChapter, setCurrentChapter] = useState<{
    id: string;
    title: string;
    orderNumber: number;
    content: string;
    estimatedTime: string;
    difficulty: string;
  } | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [progresses, setProgresses] = useState<ProgressItem[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Recap Modal
  const [quickRecapOpen, setQuickRecapOpen] = useState(false);
  const [quickRecapTopic, setQuickRecapTopic] = useState("");
  const [chapterRecapOpen, setChapterRecapOpen] = useState(false);
  const [chapterRecapDone, setChapterRecapDone] = useState(false);

  // Floating panels & Chat state
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileAssistantOpen, setMobileAssistantOpen] = useState(false);
  const [isMentorSpeaking, setIsMentorSpeaking] = useState(false);
  const mentorSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mime: string;
    fileName: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; image?: string; fileName?: string }>
  >([
    {
      sender: "ai",
      text: "Hi! Ask me any questions or doubts about C++ OOP, memory, templates, or modern C++ syntax, or upload a diagram/code screenshot.",
    },
  ]);

  const [chatLoading, setChatLoading] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [autoResumeTopic, setAutoResumeTopic] = useState<string | undefined>(undefined);
  const [chapterAnalysis, setChapterAnalysis] = useState<ChapterLearningAnalysis | null>(null);
  const [shouldAutoChapterRecap, setShouldAutoChapterRecap] = useState(false);
  const [lockedInfo, setLockedInfo] = useState<any>(null);

  const isCompleted = progresses.some((p) => p.chapterId === currentChapter?.id && p.isCompleted);

  const getLessonStatus = (lesson: string): LearningStatus => {
    return lessonProgress[lesson]?.status || "NOT_STARTED";
  };

  const getLessonStatusLabel = (lesson: string): string => {
    const status = getLessonStatus(lesson);
    switch (status) {
      case "MASTERED":
        return "Mastered";
      case "LEARNING":
        return "Learning";
      case "PRACTICED":
        return "Practiced";
      case "NEEDS_REVIEW":
        return "Needs Review";
      default:
        return "Not Started";
    }
  };

  const isTopicUnlocked = (topicIndex: number, allTopics: string[]) => {
    if (topicIndex === 0) return true;
    for (let i = 0; i < topicIndex; i++) {
      const prevTopic = allTopics[i];
      if (prevTopic === "Quiz Assessment") continue;
      const prevStatus = lessonProgress[prevTopic]?.status;
      if (prevStatus !== "MASTERED" && prevStatus !== "PRACTICED") {
        return false;
      }
    }
    return true;
  };

  const isQuizUnlocked = (allTopics: string[]) => {
    const topicsOnly = allTopics.filter((t) => t !== "Quiz Assessment");
    return topicsOnly.every((s) => {
      const st = lessonProgress[s]?.status;
      return st === "MASTERED" || st === "PRACTICED";
    });
  };

  const speakMentorResponse = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_`#]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsMentorSpeaking(true);
    utterance.onend = () => setIsMentorSpeaking(false);
    utterance.onerror = () => setIsMentorSpeaking(false);
    mentorSpeechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopMentorSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsMentorSpeaking(false);
  };

  const markLessonLearning = () => {
    if (!currentLesson) return;
    const current = lessonProgress[currentLesson];
    if (!current || current.status === "NOT_STARTED") {
      setLessonProgress((prev) => ({
        ...prev,
        [currentLesson]: {
          lesson: currentLesson,
          status: "LEARNING",
          score: 0,
          attempts: 0,
          questionsAsked: 1,
          correctAnswers: 0,
        },
      }));
      void saveLessonProgress(currentLesson, {
        status: "LEARNING",
        questionsAsked: 1,
      });
    }
  };

  // AI Live Teaching Integration
  const explainLiveTeacherUnit = async (
    content: string,
    title: string,
    learningMemory?: string
  ): Promise<string> => {
    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C++",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: title,
          content,
          learning_memory: learningMemory || "",
          question: `
You are a live interactive teacher explaining this C++ unit.
TOPIC: ${title}
CONTENT: ${content}

Teach this C++ section step-by-step:
1. Core idea in simple terms.
2. Why it matters in C++ software design.
3. One small practical code example.
4. Key takeaway for C++ developers.
Concise classroom voice.
`,
          mode: "live-teaching",
          history: [],
        }),
      });

      let data = await safeJson(response);
      if (!response.ok || !data?.success) {
        try {
          const fallbackRes = await fetch("/api/teach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course: "C++",
              chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
              topic: title,
              content,
              learning_memory: learningMemory || "",
              question: `
You are a live interactive teacher explaining this C++ unit.
TOPIC: ${title}
CONTENT: ${content}

Teach this C++ section step-by-step:
1. Core idea in simple terms.
2. Why it matters in C++ software design.
3. One small practical code example.
4. Key takeaway for C++ developers.
Concise classroom voice.
`,
              mode: "live-teaching",
              history: [],
            }),
          });
          const fbData = await safeJson(fallbackRes);
          if (fbData?.success) data = fbData;
        } catch {}
      }

      if (data?.success) {
        return data.data?.response || data.response || "Let's understand this C++ concept step by step.";
      }
      return "Let's understand this C++ concept step by step. Focus on syntax rules, types, and object-oriented principles.";
    } catch (error) {
      console.error("Live Teacher AI error:", error);
      return "Let's understand this C++ concept step by step. Focus on syntax rules, types, and object-oriented principles.";
    }
  };

  const reteachLiveTeacherSection = async (
    content: string,
    title: string,
    adaptiveContext?: string,
    attemptNumber: number = 2,
    previousAnswer?: string
  ): Promise<string> => {
    try {
      let reteachInstruction = "";
      if (attemptNumber === 2) {
        reteachInstruction = `Explain this concept in simpler language with shorter sentences and a clear everyday real-world analogy. Avoid complex jargon. Connect the analogy directly to the core idea.`;
      } else if (attemptNumber === 3) {
        reteachInstruction = `Explain this concept in very simple terms with a concrete, 2-line practical code example and a step-by-step trace. Make it impossible to misunderstand.`;
      } else {
        reteachInstruction = `Provide the simplest possible direct explanation addressing the specific misunderstanding. Focus directly on: ${adaptiveContext || "the core principle"}. Keep it concise and crystal clear.`;
      }

      if (adaptiveContext) {
        reteachInstruction += `\nStudent context: ${adaptiveContext}`;
      }
      if (previousAnswer) {
        reteachInstruction += `\nStudent's previous answer was: "${previousAnswer}". Gently correct this without shaming.`;
      }

      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C++",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: title,
          content,
          question: reteachInstruction,
          mode: "reteach",
          history: [],
        }),
      });

      let data = await safeJson(response);
      if (!response.ok || !data?.success) {
        try {
          const fallbackRes = await fetch("/api/teach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course: "C++",
              chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
              topic: title,
              content,
              question: reteachInstruction,
              mode: "reteach",
              history: [],
            }),
          });
          const fbData = await safeJson(fallbackRes);
          if (fbData?.success) data = fbData;
        } catch {}
      }

      if (data?.success) {
        return data.data?.response || data.response || "Let's look at this concept with a simpler analogy.";
      }
      return "Let's break this down even simpler: think of it step by step from first principles.";
    } catch (error) {
      console.error("Live Teacher Reteach error:", error);
      return "Let's break this down even simpler: think of it step by step from first principles.";
    }
  };

  const evaluateCheckpointAnswer = async (
    question: string,
    answer: string
  ): Promise<CheckpointEvaluation> => {
    try {
      const adaptiveRes = await fetch("/api/adaptive/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "cpp",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          chapterId: currentChapter?.id || "general",
          topic: currentLesson || "C++ Concept",
          question,
          studentAnswer: answer,
          topicContent: getLessonContent(),
          userEmail,
          recordEvidence: true,
        }),
      });

      if (adaptiveRes.ok) {
        const data = await safeJson(adaptiveRes);
        if (data?.success && data?.evaluation) {
          const ev = data.evaluation;
          return {
            score: ev.score,
            result: ev.correct ? (ev.score >= 90 ? "CORRECT" : "GOOD") : (ev.score >= 50 ? "PARTIAL" : "INCORRECT"),
            appreciation: ev.appreciation,
            whatWasCorrect: ev.whatWasCorrect,
            whatIsMissing: ev.whatIsMissing,
            explanation: ev.explanation,
            example: ev.example || "",
            needsFollowUp: ev.needsFollowUp,
            followUpQuestion: ev.followUpQuestion || "",
            understood: ev.correct,
            feedback: `${ev.appreciation} ${ev.whatWasCorrect ? `What you got right: ${ev.whatWasCorrect} ` : ""}${ev.whatIsMissing ? `What needs attention: ${ev.whatIsMissing}` : ""}`.trim(),
            misconceptions: ev.misconceptions || [],
            missingConcepts: ev.missingConcepts || [],
            reason: ev.reason,
            understandingLevel: ev.understandingLevel,
            recommendedDifficulty: ev.recommendedDifficulty,
          };
        }
      }
    } catch (err) {
      console.warn("Adaptive evaluate route notice, falling back to teach engine:", err);
    }

    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C++",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: currentLesson || "C++ Concept",
          content: getLessonContent(),
          question: `
QUESTION:
${question}

STUDENT ANSWER:
${answer}
`,
          mode: "evaluate",
          history: [],
        }),
      });

      let data = await safeJson(response);
      if (!response.ok || !data?.success) {
        try {
          const fallbackRes = await fetch("/api/teach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course: "C++",
              chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
              topic: currentLesson || "C++ Concept",
              content: getLessonContent(),
              question: `
QUESTION:
${question}

STUDENT ANSWER:
${answer}
`,
              mode: "evaluate",
              history: [],
            }),
          });
          const fbData = await safeJson(fallbackRes);
          if (fbData?.success) data = fbData;
        } catch {}
      }

      const rawText = data?.data?.response || data?.response || "";
      return parseCheckpointEvaluation(rawText, question, answer);
    } catch (error) {
      console.error("Checkpoint evaluation error:", error);
      return parseCheckpointEvaluation("", question, answer);
    }
  };

  const handleTeachingRequest = async (
    question: string,
    mode: string = "chat",
    imagePayload?: { base64: string; mime: string; fileName: string } | null
  ) => {
    const activeImage = imagePayload !== undefined ? imagePayload : attachedImage;
    if ((!question.trim() && !activeImage) || chatLoading) return;
    if (!currentChapter) return;

    liveTeacherRef.current?.pause();
    markLessonLearning();

    if (currentLesson) {
      const current = lessonProgress[currentLesson];
      const questionsAsked = (current?.questionsAsked ?? 0) + 1;
      setLessonProgress((prev) => ({
        ...prev,
        [currentLesson]: {
          ...(prev[currentLesson] || {
            lesson: currentLesson,
            status: "LEARNING",
            score: 0,
            attempts: 0,
            questionsAsked: 0,
            correctAnswers: 0,
          }),
          questionsAsked,
        },
      }));
      void saveLessonProgress(currentLesson, { questionsAsked });
    }

    const promptText = question.trim() || (activeImage ? "Explain this C++ diagram / code screenshot" : "Explain this topic");

    const userMessage = {
      sender: "user" as const,
      text: promptText,
      image: activeImage?.base64,
      fileName: activeImage?.fileName,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setAttachedImage(null);
    setChatLoading(true);

    const effectiveMode = activeImage ? "vision" : mode;

    try {
      const response = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C++",
          chapter: currentChapter.title,
          topic: currentLesson || currentChapter.title,
          content: getLessonContent(),
          question: `
Student request:
${promptText}

Learning progress:
Completed lessons:
${completedLessons.length > 0 ? completedLessons.join("\n") : "None"}

Current lesson:
${currentLesson || "Not selected"}

Remaining lessons:
${getLessons()
  .filter((lesson) => !completedLessons.includes(lesson))
  .join("\n")}
`,
          mode: effectiveMode,
          image: activeImage?.base64,
          imageMimeType: activeImage?.mime,
          history: chatMessages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Teaching request failed.");
      }

      const aiResponse = data.data?.response ?? data.response ?? "";
      if (!aiResponse) throw new Error("Codenthra AI returned an empty response.");

      setChatMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);

      // Record in Knowledge Graph
      if (userEmail) {
        void fetch("/api/knowledge-graph/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail,
            course: "cpp",
            chapterId: currentChapter.id,
            topic: currentLesson || currentChapter.title,
            source: activeImage ? "VISION" : "NOTE",
            score: 85,
            summary: promptText,
            visualReference: activeImage?.fileName,
          }),
        }).catch((e) => console.error("Knowledge Graph evidence error:", e));
      }

      const activeLessonKey = currentLesson || currentChapter?.title || "General";
      if (!topicChatMapRef.current[activeLessonKey]) {
        topicChatMapRef.current[activeLessonKey] = [];
      }
      topicChatMapRef.current[activeLessonKey].push({ question: promptText, answer: aiResponse });

      if (mode !== "chat") {
        speakMentorResponse(aiResponse);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ I couldn't connect to the teaching engine right now. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getLessons = () => {
    if (currentChapter?.content) {
      const extracted = extractLessonTitles(currentChapter.content, chapterOrder);
      if (extracted.length > 0) return extracted;
    }
    return [];
  };

  const getLessonContent = () => {
    if (!currentChapter?.content) return "";
    const lesson = currentLesson;
    if (!lesson) return currentChapter.content;

    const content = currentChapter.content;
    let startIndex = content.toLowerCase().indexOf(lesson.toLowerCase());

    if (startIndex === -1) {
      const norm = lesson.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();
      startIndex = content.toLowerCase().indexOf(norm);
    }

    if (startIndex === -1) return content;

    const lessons = getLessons();
    const lessonIndex = lessons.indexOf(lesson);
    if (lessonIndex === -1 || lessonIndex === lessons.length - 1) {
      return content.slice(startIndex);
    }

    const nextLesson = lessons[lessonIndex + 1];
    let endIndex = content.toLowerCase().indexOf(nextLesson.toLowerCase(), startIndex + lesson.length);
    if (endIndex === -1) {
      const normNext = nextLesson.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();
      endIndex = content.toLowerCase().indexOf(normNext, startIndex + lesson.length);
    }

    if (endIndex === -1 || endIndex <= startIndex) return content.slice(startIndex);
    return content.slice(startIndex, endIndex);
  };

  const loadLessonProgress = async () => {
    if (!currentChapter?.id || !userEmail) return;
    try {
      const response = await fetch(
        `/api/courses/cpp/chapters/${currentChapter.id}/lesson-progress?userEmail=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!response.ok) return;
      const data = await safeJson(response);
      if (!data || !data.success) return;

      const progressMap: Record<string, LessonProgress> = {};
      for (const item of data.progress || []) {
        progressMap[item.lesson] = {
          lesson: item.lesson,
          status: item.status as LearningStatus,
          score: item.lastScore ?? 0,
          attempts: item.attempts ?? 0,
          questionsAsked: 0,
          correctAnswers: item.correctAnswers ?? 0,
        };
      }
      setLessonProgress(progressMap);
      const mastered = Object.values(progressMap)
        .filter((item) => item.status === "MASTERED" || item.status === "PRACTICED")
        .map((item) => item.lesson);
      setCompletedLessons(mastered);

      const lessons = getLessons();
      if (lessons.length === 0) return;

      // Curriculum-first resume logic:
      // Always resume at the FIRST uncompleted lesson in sequential curriculum order.
      const firstUncompleted = lessons.find(
        (l) => progressMap[l]?.status !== "MASTERED" && progressMap[l]?.status !== "PRACTICED"
      );
      const resumeLesson = firstUncompleted || lessons[lessons.length - 1] || lessons[0];

      if (resumeLesson && lessons.includes(resumeLesson)) {
        setCurrentLesson(resumeLesson);
        setCurrentLessonIndex(lessons.indexOf(resumeLesson));
      }

      // Call adaptive resume state API to determine genuine last meaningful topic & chapter completion
      try {
        const resumeRes = await fetch("/api/adaptive/resume-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course: "CPP",
            chapterId: currentChapter.id,
            chapterTitle: currentChapter.title,
            lessons,
            userEmail,
          }),
        });

        if (resumeRes.ok) {
          const resumeData = await resumeRes.json();
          if (resumeData.success) {
            if (resumeData.chapterAnalysis) {
              setChapterAnalysis(resumeData.chapterAnalysis);
            }

            if (resumeData.shouldChapterRecap) {
              const chapterRecapKey = `ksai_chapter_recap_${userEmail}_cpp_${currentChapter.id}`;
              const chapterRecapDone = typeof window !== "undefined" && sessionStorage.getItem(chapterRecapKey) === "done";
              if (!chapterRecapDone) {
                setShouldAutoChapterRecap(true);
              }
            } else if (resumeData.shouldQuickRecap && resumeData.lastMeaningfulTopic) {
              const recapTopic = resumeData.lastMeaningfulTopic;
              const recapKey = `ksai_quick_recap_${userEmail}_cpp_${currentChapter.id}_${recapTopic}`;
              const recapAlreadyDone = typeof window !== "undefined" && sessionStorage.getItem(recapKey) === "done";
              if (!recapAlreadyDone) {
                setAutoResumeTopic(recapTopic);
              }
            }
          }
        }
      } catch (resumeErr) {
        console.warn("Adaptive resume state check notice:", resumeErr);
      }
    } catch (e) {
      console.error("Lesson progress load error:", e);
    }
  };

  const saveLessonProgress = async (
    lesson: string,
    updates: Partial<LessonProgress>
  ) => {
    if (!currentChapter?.id || !userEmail || !lesson) return;

    if (typeof window !== "undefined") {
      localStorage.setItem(`ksai_last_lesson_${userEmail}_cpp_${currentChapter.id}`, lesson);
    }

    try {
      const current = lessonProgress[lesson];
      const payload = {
        userEmail,
        lesson,
        status: updates.status ?? current?.status ?? "LEARNING",
        attempts: updates.attempts ?? current?.attempts ?? 0,
        correctAnswers: updates.correctAnswers ?? current?.correctAnswers ?? 0,
        totalQuestions: updates.questionsAsked ?? current?.questionsAsked ?? 0,
        lastScore: updates.score ?? current?.score ?? 0,
      };

      await fetch(`/api/courses/cpp/chapters/${currentChapter.id}/lesson-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Lesson progress save error:", e);
    }
  };

  // Expandable chapters state in sidebar
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({
    [chapterOrder]: true,
  });

  const toggleChapterExpand = (order: number) => {
    setExpandedChapters((prev) => ({ ...prev, [order]: !prev[order] }));
  };

  // User session
  useEffect(() => {
    if (!isPending && session?.user) {
      setUser({
        name: session.user.name ?? "Student",
        email: session.user.email ?? "",
        role: (session.user as any).role ?? "Student",
      });
    }
  }, [session, isPending]);

  useEffect(() => {
    if (user?.email) setUserEmail(user.email);
  }, [user]);

  // Load Chapter & Course Data
  const loadPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userParam = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : "";
      const res = await fetch(`/api/courses/cpp/chapters/${chapterOrder}${userParam}`);
      if (!res.ok) {
        let errData: any = null;
        try {
          errData = await res.json();
        } catch {}

        if (res.status === 403 || errData?.locked) {
          setLockedInfo(
            errData || {
              locked: true,
              orderNumber: chapterOrder,
              message: `Chapter ${chapterOrder} is locked. Complete Chapter ${chapterOrder - 1} and pass its required assessment to continue.`,
            }
          );
          setLoading(false);
          return;
        }

        throw new Error(`Failed to load C++ chapter ${chapterOrder}`);
      }

      const data = await res.json();
      if (!data.success) {
        if (data.locked) {
          setLockedInfo(data);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to load chapter.");
      }

      setLockedInfo(null);

      const chapterObj = data.currentChapter || data.chapter;
      setCurrentChapter(chapterObj);
      setCourseId(data.courseId || data.course?.id || "");
      setCourseTitle(data.courseTitle || data.course?.title || "C++ Object-Oriented Mastery");
      setCoursePrice(data.coursePrice ?? data.course?.price ?? 50);
      setIsEnrolled(data.isEnrolled ?? true);
      setUserEmail(data.userEmail || userEmail || "student@gmail.com");
      setChapters(data.chapters || []);
      setProgresses(data.progresses || []);
      setQuizQuestions(data.quizQuestions || []);

      if (data.requirements?.chapterRecapCompleted || data.chapterRecapCompleted) {
        setChapterRecapDone(true);
      } else {
        const email = data.userEmail || userEmail;
        const recapKey = `ksai_chapter_recap_${email}_cpp_${chapterObj?.id}`;
        if (typeof window !== "undefined" && sessionStorage.getItem(recapKey) === "done") {
          setChapterRecapDone(true);
        }
      }
    } catch (e: any) {
      console.error("Error loading C++ chapter:", e);
      setError("Network error loading chapter.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [chapterOrder]);

  useEffect(() => {
    const sections = getLessons();
    if (sections.length > 0 && !currentLesson) {
      setCurrentLesson(sections[0]);
      setCurrentLessonIndex(0);
    }
  }, [chapterOrder, currentLesson, currentChapter]);

  useEffect(() => {
    if (currentChapter?.id && userEmail) {
      loadLessonProgress();
    }
  }, [currentChapter?.id, userEmail]);

  const handleMarkChapterComplete = async () => {
    if (!currentChapter?.id) return;
    try {
      setCompleting(true);
      await fetch(`/api/courses/cpp/chapters/${chapterOrder}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: currentChapter.id,
          userEmail,
        }),
      });
      setProgresses((prev) =>
        prev.map((p) => (p.chapterId === currentChapter.id ? { ...p, isCompleted: true } : p))
      );
    } catch (e) {
      console.error("Chapter complete error:", e);
    } finally {
      setCompleting(false);
    }
  };

  const renderCppAssistantContent = (isMobile = false) => (
    <div className={`w-full h-full flex flex-col ${isMobile ? "p-3 sm:p-4" : "p-4"} gap-4 overflow-hidden bg-slate-50`}>
      {/* MY LEARNING NOTES */}
      <button
        type="button"
        onClick={() => {
          if (isMobile) setMobileAssistantOpen(false);
          router.push("/notes?course=cpp");
        }}
        className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-xs p-4 hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
            <BookOpen size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-slate-800">
              My Learning Notes
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Open your notes
            </p>
          </div>

          <ChevronRight
            size={16}
            className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </button>

      {/* CODENTHRA AI / ASK AI MENTOR */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mentor Header */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                <Bot size={19} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Ask AI
                </h3>
                <p className="text-[10px] text-slate-500">
                  Ask anything about this lesson
                </p>
              </div>
            </div>
            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileAssistantOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white/60 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRightPanelExpanded(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition cursor-pointer"
                title="Collapse Panel"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {isMentorSpeaking && (
            <div className="mt-3 px-3 py-1.5 bg-blue-100/60 rounded-xl border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                AI Teacher is speaking...
              </div>
              <button
                type="button"
                onClick={stopMentorSpeaking}
                className="text-[10px] font-bold text-slate-600 hover:text-red-600"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Scroll Area */}
        <div
          ref={chatScrollRef}
          className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
        >
          {/* Teaching Conversation */}
          <div className="p-4 space-y-3">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-md"
                  }`}
                >
                  {message.image && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 bg-slate-900 flex items-center justify-center max-h-36">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.image}
                        alt="Attached visual"
                        className="max-h-36 w-auto object-contain"
                      />
                    </div>
                  )}
                  {message.text}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600 animate-spin" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {!chatLoading && (
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  liveTeacherRef.current?.resume();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                ▶ Resume Live Teacher
              </button>
            </div>
          )}

          {/* Learning Actions */}
          <div className="p-4 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              How can I help you?
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleTeachingRequest(
                    "Explain this C++ topic in a simple way.",
                    "explain"
                  )
                }
                disabled={chatLoading}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                💡 Explain this topic
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTeachingRequest(
                    "Give me a simple C++ example of this topic.",
                    "example"
                  )
                }
                disabled={chatLoading}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                📝 Give me an example
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTeachingRequest(
                    "Show me this C++ concept visually. Use a simple flow, diagram, or structured explanation if appropriate.",
                    "visual"
                  )
                }
                disabled={chatLoading}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                🎨 Show me visually
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTeachingRequest(
                    "Ask me one question about this C++ topic to check my understanding. Do not give me the answer immediately.",
                    "question"
                  )
                }
                disabled={chatLoading}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                ❓ Ask me a question
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTeachingRequest(
                    "I'm confused about this C++ topic. Explain it differently using simpler intuition and a small example.",
                    "confused"
                  )
                }
                disabled={chatLoading}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                🤔 I'm confused
              </button>
            </div>

            {/* Current Learning Context */}
            <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={13} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                  Currently Learning
                </span>
              </div>

              <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                {currentLesson || currentChapter?.title || `Chapter ${chapterOrder}`}
              </p>

              {currentLesson && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      getLessonStatus(currentLesson) === "MASTERED"
                        ? "bg-emerald-500"
                        : getLessonStatus(currentLesson) === "LEARNING"
                        ? "bg-amber-500"
                        : getLessonStatus(currentLesson) === "PRACTICED"
                        ? "bg-blue-500"
                        : getLessonStatus(currentLesson) === "NEEDS_REVIEW"
                        ? "bg-red-500"
                        : "bg-slate-300"
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {getLessonStatusLabel(currentLesson)}
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Lesson progress</span>
                <span className="font-bold text-blue-600">
                  {completedLessons.length}/{getLessons().length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ask Mentor Input Form */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 shrink-0 space-y-2">
          <VisionAttachment
            onImageSelected={(b64, mime, fName) =>
              setAttachedImage({ base64: b64, mime, fileName: fName })
            }
            onImageRemoved={() => setAttachedImage(null)}
            currentImage={attachedImage?.base64}
            disabled={chatLoading}
            onQuickPrompt={(prompt) => {
              setChatInput(prompt);
              void handleTeachingRequest(prompt, "vision", attachedImage);
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTeachingRequest(chatInput, attachedImage ? "vision" : "chat", attachedImage);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={attachedImage ? "Ask about attached C++ diagram / code screenshot..." : "Ask about this lesson..."}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />

            <button
              type="submit"
              disabled={(!chatInput.trim() && !attachedImage) || chatLoading}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-sm shrink-0 disabled:opacity-50 cursor-pointer"
              title="Ask AI"
            >
              <Send size={13} />
            </button>
          </form>

          <p className="text-[9px] text-slate-400 text-center">
            Codenthra AI uses this lesson and visual context.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-cyan-500 selection:text-black overflow-hidden h-screen">
      {/* Custom Top Bar */}
      <header className="w-full border-b border-slate-200 bg-white px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between sticky top-0 z-40 h-14 sm:h-16 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Chapter Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Open Chapters"
            aria-label="Open Course Chapters"
          >
            <GraduationCap size={18} className="text-indigo-600" />
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-xs sm:text-sm shadow-md shrink-0">
            C++
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-indigo-600 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate block max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              <span className="hidden sm:inline">KnowledgeStream AI &bull; </span>C++ Course
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile AI Assistant Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileAssistantOpen(true)}
            className="md:hidden p-2 rounded-xl text-purple-600 hover:bg-purple-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Open AI Mentor & Notes"
            aria-label="Open AI Mentor and Notes"
          >
            <Bot size={18} />
          </button>

          <button
            onClick={() => router.push("/notes?course=cpp")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 hover:bg-blue-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <CourseSwitcher currentLanguage="cpp" currentChapter={chapterOrder} className="hidden xl:inline-flex" />

          <button
            onClick={() => router.push("/dashboard")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1 sm:gap-1.5 min-h-[36px]"
          >
            <ArrowLeft size={13} /> <span className="hidden xs:inline">Dashboard</span>
          </button>
        </div>
      </header>

      {/* Mobile Persistent Course Navigation Bar */}
      <nav
        aria-label="Mobile Course Navigation"
        className="md:hidden w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 py-2 shrink-0 z-30 shadow-xs pl-safe pr-safe"
      >
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          {/* Chapters Control */}
          <button
            type="button"
            onClick={() => {
              setMobileAssistantOpen(false);
              setMobileDrawerOpen((prev) => !prev);
            }}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              mobileDrawerOpen
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
            }`}
            aria-label="Course Chapters"
            aria-expanded={mobileDrawerOpen}
          >
            <GraduationCap
              size={18}
              className={mobileDrawerOpen ? "text-indigo-600" : "text-indigo-600"}
            />
            <span>Chapters</span>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md">
              {chapterOrder}
            </span>
          </button>

          {/* AI Mentor Control */}
          <button
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              setMobileAssistantOpen((prev) => !prev);
            }}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              mobileAssistantOpen
                ? "bg-purple-50 border-purple-300 text-purple-700 shadow-xs ring-2 ring-purple-500/20"
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
            }`}
            aria-label="AI Mentor and Notes"
            aria-expanded={mobileAssistantOpen}
          >
            <Bot
              size={18}
              className={mobileAssistantOpen ? "text-purple-600" : "text-purple-600"}
            />
            <span>AI Mentor</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </button>
        </div>
      </nav>

      {/* Mobile Chapter Overlay Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-[85vw] max-w-xs h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Course Chapters</h3>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">C++ Curriculum</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close chapters drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Chapters List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {chapters.map((ch) => {
                const active = ch.orderNumber === chapterOrder;
                const isExpanded = active || !!expandedChapters[ch.orderNumber];
                const pageIcon = <FileText size={15} className={active ? "text-indigo-600" : "text-slate-400"} />;

                return (
                  <div key={ch.id} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        toggleChapterExpand(ch.orderNumber);
                        setMobileDrawerOpen(false);
                        router.push(`/courses/cpp/chapter/${ch.orderNumber}`);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all min-h-[48px] cursor-pointer ${
                        active
                          ? "bg-indigo-50/70 border-indigo-200 shadow-xs"
                          : "bg-slate-50/50 hover:bg-slate-100/70 border-slate-200/80"
                      }`}
                    >
                      <div className="shrink-0">{pageIcon}</div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider font-mono text-indigo-600">
                          CHAPTER {ch.orderNumber}
                        </div>
                        <div className={`text-xs font-bold truncate leading-snug ${active ? "text-slate-900" : "text-slate-700"}`}>
                          {ch.title.replace(/^Chapter \d+:\s*/, "").replace(/^Topic \d+:\s*/, "")}
                        </div>
                      </div>
                      {!active && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-auto" />}
                      {active && <ChevronUp size={14} className="text-indigo-600 shrink-0 ml-auto" />}
                    </button>

                    {/* Expandable nested sections outline */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 py-1 space-y-2 border-l-2 border-indigo-100 ml-4">
                        {getLessons().map((sec, secIdx, arr) => {
                          const isQuiz = sec === "Quiz Assessment";
                          const status = isQuiz ? "NOT_STARTED" : getLessonStatus(sec);
                          const isUnlocked = isQuiz ? isQuizUnlocked(arr) : isTopicUnlocked(secIdx, arr);

                          return (
                            <button
                              key={secIdx}
                              type="button"
                              onClick={() => {
                                if (!isUnlocked) {
                                  if (isQuiz) {
                                    alert("🔒 Complete and master all chapter topics with your AI Teacher before taking the Chapter Assessment Quiz.");
                                  } else {
                                    alert(`🔒 Topic is locked. Please master "${arr[secIdx - 1]}" first.`);
                                  }
                                  return;
                                }

                                setMobileDrawerOpen(false);
                                if (isQuiz) {
                                  router.push(`/courses/cpp/chapter/${ch.orderNumber}/quiz`);
                                  return;
                                }

                                setCurrentLesson(sec);
                                setCurrentLessonIndex(secIdx);
                              }}
                              className={`w-full text-left text-xs leading-relaxed flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all min-h-[36px] cursor-pointer ${
                                !isUnlocked
                                  ? "opacity-50 cursor-not-allowed text-slate-400"
                                  : isQuiz
                                  ? "text-purple-600 font-bold hover:bg-purple-50"
                                  : currentLesson === sec
                                  ? "text-indigo-700 bg-indigo-50/80 font-bold"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              {!isUnlocked ? (
                                <Lock size={12} className="text-slate-400 shrink-0" />
                              ) : (
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    status === "MASTERED"
                                      ? "bg-emerald-500"
                                      : status === "PRACTICED"
                                      ? "bg-blue-500"
                                      : status === "LEARNING"
                                      ? "bg-amber-500"
                                      : status === "NEEDS_REVIEW"
                                      ? "bg-red-500"
                                      : isQuiz
                                      ? "bg-purple-500"
                                      : "bg-slate-300"
                                  }`}
                                />
                              )}
                              <span className="truncate flex-1">{sec}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Course Switcher inside Chapter Drawer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Switch Course Track</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "c", label: "C", href: "/courses/c/chapter/0" },
                  { id: "cpp", label: "C++", href: "/courses/cpp/chapter/0" },
                  { id: "java", label: "Java", href: "/courses/java/chapter/0" },
                  { id: "python", label: "Python", href: "/courses/python/chapter/0" },
                ].map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      router.push(track.href);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold text-center transition-all min-h-[40px] cursor-pointer ${
                      track.id === "cpp"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Assistant Overlay Drawer */}
      {mobileAssistantOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileAssistantOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-[90vw] max-w-sm h-full bg-slate-50 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {renderCppAssistantContent(true)}
          </div>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Side: Chapter Navigation Sidebar */}
        <aside
          data-lenis-prevent
          className={`hidden md:flex border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex-col custom-scrollbar transition-all duration-300 ${
            leftSidebarExpanded ? "w-80" : "w-14"
          }`}
        >
          <div
            className={`p-4 border-b border-slate-200 bg-slate-50/50 flex items-center shrink-0 ${
              leftSidebarExpanded ? "justify-between" : "justify-center"
            }`}
          >
            {leftSidebarExpanded && (
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-600" />
                Course Chapters
              </h3>
            )}
            <button
              onClick={() => setLeftSidebarExpanded(!leftSidebarExpanded)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-all"
              title={leftSidebarExpanded ? "Collapse Chapters Sidebar" : "Expand Chapters Sidebar"}
            >
              {leftSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <div className={`flex-1 p-3 space-y-2.5 ${!leftSidebarExpanded ? "flex flex-col items-center" : ""}`}>
            {chapters.map((ch) => {
              const active = ch.orderNumber === chapterOrder;
              const isExpanded = active || !!expandedChapters[ch.orderNumber];
              const pageIcon = <FileText size={15} className={active ? "text-blue-600" : "text-slate-400"} />;

              if (!leftSidebarExpanded) {
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      router.push(`/courses/cpp/chapter/${ch.orderNumber}`);
                    }}
                    title={`Chapter ${ch.orderNumber}: ${ch.title}`}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                      active
                        ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-600"
                    }`}
                  >
                    {pageIcon}
                  </button>
                );
              }

              return (
                <div key={ch.id} className="space-y-1.5">
                  <button
                    onClick={() => {
                      toggleChapterExpand(ch.orderNumber);
                      router.push(`/courses/cpp/chapter/${ch.orderNumber}`);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      active
                        ? "bg-blue-50/50 border-blue-200 shadow-sm"
                        : "bg-slate-50/50 hover:bg-slate-100/70 border-slate-200/80"
                    }`}
                  >
                    <div className="shrink-0">{pageIcon}</div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wider font-mono text-blue-600">
                        CHAPTER {ch.orderNumber}
                      </div>
                      <div className={`text-sm font-bold truncate leading-snug ${active ? "text-slate-900" : "text-slate-700"}`}>
                        {ch.title.replace(/^Chapter \d+:\s*/, "").replace(/^Topic \d+:\s*/, "")}
                      </div>
                    </div>
                    {!active && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-auto" />}
                    {active && <ChevronUp size={14} className="text-blue-600 shrink-0 ml-auto" />}
                  </button>

                  {/* Expandable nested sections outline */}
                  {isExpanded && (
                    <div className="pl-9 pr-2 py-1 space-y-2 border-l border-slate-200 ml-5">
                      {getLessons().map((sec, secIdx, arr) => {
                        const isQuiz = sec === "Quiz Assessment";
                        const status = isQuiz ? "NOT_STARTED" : getLessonStatus(sec);
                        const isUnlocked = isQuiz ? isQuizUnlocked(arr) : isTopicUnlocked(secIdx, arr);

                        return (
                          <button
                            key={secIdx}
                            onClick={() => {
                              if (!isUnlocked) {
                                if (isQuiz) {
                                  alert("🔒 Complete and master all chapter topics with your AI Teacher before taking the Chapter Assessment Quiz.");
                                } else {
                                  alert(`🔒 Topic is locked. Please master "${arr[secIdx - 1]}" first.`);
                                }
                                return;
                              }

                              if (isQuiz) {
                                router.push(`/courses/cpp/chapter/${ch.orderNumber}/quiz`);
                                return;
                              }

                              setCurrentLesson(sec);
                              setCurrentLessonIndex(secIdx);
                            }}
                            className={`w-full text-left text-[11px] leading-relaxed flex items-center gap-1.5 py-0.5 transition-all ${
                              !isUnlocked
                                ? "opacity-50 cursor-not-allowed text-slate-400"
                                : isQuiz
                                ? "text-purple-600 font-bold hover:underline"
                                : currentLesson === sec
                                ? "text-blue-600 font-bold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {!isUnlocked ? (
                              <Lock size={11} className="text-slate-400 shrink-0" />
                            ) : (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  status === "MASTERED"
                                    ? "bg-emerald-500"
                                    : status === "PRACTICED"
                                    ? "bg-blue-500"
                                    : status === "LEARNING"
                                    ? "bg-amber-500"
                                    : status === "NEEDS_REVIEW"
                                    ? "bg-red-500"
                                    : isQuiz
                                    ? "bg-purple-500"
                                    : "bg-slate-300"
                                }`}
                              />
                            )}
                            <span className="truncate flex-1">{sec}</span>
                            {!isQuiz && (
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                {isUnlocked ? getLessonStatusLabel(sec) : "Locked"}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Quiz link in sidebar */}
                      <button
                        onClick={() => router.push(`/courses/cpp/chapter/${chapterOrder}/quiz`)}
                        className="w-full text-left text-[11px] leading-relaxed flex items-center gap-1.5 py-0.5 transition-all text-purple-600 font-bold hover:underline"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="truncate flex-1">Quiz Assessment</span>
                        <Sparkles size={12} className="text-purple-600 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Side: Chapter Notes Area */}
        <main data-lenis-prevent className="flex-1 p-3 xs:p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden w-full bg-slate-50 custom-scrollbar">
          {/* Mobile In-Page Chapter Selector Card */}
          <div className="md:hidden flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <GraduationCap size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-indigo-600 block uppercase">Current Chapter {chapterOrder}</span>
                <span className="text-xs font-black text-slate-800 truncate block">{currentChapter?.title || "Lesson"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 shrink-0 min-h-[38px] cursor-pointer"
            >
              <span>Chapters</span>
              <ChevronRight size={14} />
            </button>
          </div>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-sm text-slate-500 max-w-6xl mx-auto w-full">
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:text-slate-800 transition-colors"
            >
              My Courses
            </button>
            <ChevronRight size={10} className="text-slate-400 animate-none" />
            <button
              onClick={() => router.push("/courses/cpp")}
              className="hover:text-slate-800 transition-colors"
            >
              Course
            </button>
            <ChevronRight size={10} className="text-slate-400 animate-none" />
            <button
              onClick={() => router.push("/courses/cpp/curriculum")}
              className="hover:text-slate-800 transition-colors"
            >
              Curriculum
            </button>
            <ChevronRight size={10} className="text-slate-400 animate-none" />
            <span className="text-blue-600 font-bold font-mono">Chapter {chapterOrder}</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
              <div className="text-slate-400 text-sm font-mono">Initializing Learning Chapter...</div>
            </div>
          ) : lockedInfo ? (
            <LockedChapterCard
              courseSlug="cpp"
              courseTitle="C++ Object-Oriented Mastery"
              chapterOrder={chapterOrder}
              chapterTitle={lockedInfo.chapterTitle}
              previousChapter={lockedInfo.previousChapter}
              message={lockedInfo.message}
              onRetry={loadPageData}
            />
          ) : error ? (
            <div className="bg-white p-10 rounded-2xl border border-red-200 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <AlertCircle size={24} className="text-red-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Error Loading Chapter</h3>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={loadPageData}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                Retry Request
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto w-full pb-16 animate-fade-in">
              {/* Live AI Teacher Component */}
              <LiveTeacher
                ref={liveTeacherRef}
                contentRef={lessonContentRef}
                chapterTitle={currentChapter?.title || "C++ Chapter"}
                chapterContent={currentChapter?.content || ""}
                course="CPP"
                courseId={courseId}
                chapterId={currentChapter?.id || ""}
                userEmail={userEmail}
                activeTopic={currentLesson || undefined}
                autoResumeTopic={autoResumeTopic}
                chapterAnalysis={chapterAnalysis}
                shouldAutoChapterRecap={shouldAutoChapterRecap}
                allTopics={getLessons()}
                onActiveTopicChange={(topic) => {
                  setCurrentLesson((prev) => (prev === topic ? prev : topic));
                  const lessons = getLessons();
                  const idx = findLessonIndex(lessons, topic);
                  if (idx >= 0) setCurrentLessonIndex(idx);
                }}
                isFinalTopic={
                  getLessons().length > 0 &&
                  (
                    getLessons().indexOf(currentLesson || "") === getLessons().length - 1 ||
                    findLessonIndex(getLessons(), currentLesson) === getLessons().length - 1
                  )
                }
                onNextTopic={() => {
                  const lessons = getLessons();
                  let idx = findLessonIndex(lessons, currentLesson);
                  if (idx === -1 && currentLessonIndex >= 0 && currentLessonIndex < lessons.length) {
                    idx = currentLessonIndex;
                  }

                  if (idx >= 0 && idx < lessons.length - 1) {
                    const next = lessons[idx + 1];
                    const current = lessons[idx] || currentLesson;

                    // 1. Mark current lesson completed
                    if (current) {
                      setCompletedLessons((prev) => (prev.includes(current) ? prev : [...prev, current]));
                      setLessonProgress((prev) => ({
                        ...prev,
                        [current]: {
                          ...(prev[current] || {
                            lesson: current,
                            score: 90,
                            attempts: 1,
                            questionsAsked: 1,
                            correctAnswers: 1,
                          }),
                          status: "MASTERED",
                        },
                      }));
                      void saveLessonProgress(current, { status: "MASTERED" });
                    }

                    // 2. Set next active lesson
                    setCurrentLesson(next);
                    setCurrentLessonIndex(idx + 1);

                    // 3. Mark next lesson as LEARNING
                    setLessonProgress((prev) => ({
                      ...prev,
                      [next]: {
                        ...(prev[next] || {
                          lesson: next,
                          score: 0,
                          attempts: 0,
                          questionsAsked: 0,
                          correctAnswers: 0,
                        }),
                        status: "LEARNING",
                      },
                    }));
                    void saveLessonProgress(next, { status: "LEARNING" });

                    // 4. Smooth scroll to the target heading in textbook
                    setTimeout(() => {
                      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
                      const targetEl = headings.find((h) => {
                        const txt = h.textContent?.trim().toLowerCase() || "";
                        const nextClean = next.replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "").trim().toLowerCase();
                        return txt.includes(next.toLowerCase()) || (nextClean && txt.includes(nextClean));
                      });
                      targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  } else if (idx >= lessons.length - 1) {
                    void handleMarkChapterComplete();
                    router.push(`/courses/cpp/chapter/${chapterOrder}/quiz`);
                  }
                }}
                onChapterComplete={() => {
                  void handleMarkChapterComplete();
                }}
                onExplain={explainLiveTeacherUnit}
                onReteach={reteachLiveTeacherSection}
                onEvaluateCheckpoint={evaluateCheckpointAnswer}
                onLessonComplete={(title: string, performance, sessionData) => {
                  const lessons = getLessons();
                  const matchedIdx = findLessonIndex(lessons, title) !== -1
                    ? findLessonIndex(lessons, title)
                    : findLessonIndex(lessons, currentLesson);
                  const lesson = matchedIdx >= 0 ? lessons[matchedIdx] : (currentLesson || title);

                  if (!lesson) return;

                  const calculatedStatus =
                    performance?.understanding === "Strong"
                      ? "MASTERED"
                      : performance?.understanding === "Good"
                      ? "PRACTICED"
                      : performance?.understanding === "Needs Practice"
                      ? "NEEDS_REVIEW"
                      : "MASTERED";

                  setLessonProgress((prev) => ({
                    ...prev,
                    [lesson]: {
                      ...(prev[lesson] || {
                        lesson,
                        status: "NOT_STARTED",
                        score: 0,
                        attempts: 0,
                        questionsAsked: 0,
                        correctAnswers: 0,
                      }),
                      status: calculatedStatus,
                      attempts: performance?.attempts || 1,
                      correctAnswers: performance?.isCorrect ? 1 : 0,
                    },
                  }));

                  setCompletedLessons((prev) => (prev.includes(lesson) ? prev : [...prev, lesson]));

                  void saveLessonProgress(lesson, {
                    status: calculatedStatus,
                    attempts: performance?.attempts || 1,
                    correctAnswers: performance?.isCorrect ? 1 : 0,
                  });

                  // 📝 Persist Completed Topic Note to Learning Notebook
                  const topicStudentChats =
                    topicChatMapRef.current[title] || topicChatMapRef.current[lesson] || [];

                  const markdownSections: string[] = [
                    `# ${lesson}`,
                    ``,
                    `**Course**: C++ Mastery`,
                    `**Status**: ✓ Completed`,
                    ``,
                    `---`,
                    ``,
                    `### WHAT I LEARNED`,
                    sessionData?.whatILearned || `Mastered key concepts in ${lesson}.`,
                    ``,
                    `---`,
                    ``,
                    `### CORE CONCEPTS`,
                    ...(sessionData?.coreConcepts && sessionData.coreConcepts.length > 0
                      ? sessionData.coreConcepts.map((c) => `• ${c}`)
                      : [`• Core principles covered in ${lesson}`]),
                    ``,
                    `---`,
                    ``,
                    `### IMPORTANT POINTS`,
                    ...(sessionData?.importantPoints && sessionData.importantPoints.length > 0
                      ? sessionData.importantPoints.map((p) => `• ${p}`)
                      : [`• Demonstrated understanding of ${lesson}`]),
                    ``,
                  ];

                  if (sessionData?.teacherQuestions && sessionData.teacherQuestions.length > 0) {
                    markdownSections.push(
                      `---`,
                      ``,
                      `### CHECKPOINT EVALUATIONS`,
                      ...sessionData.teacherQuestions.map((tq) => {
                        const parts = [
                          `#### TEACHER QUESTION`,
                          tq.question,
                          ``,
                          `#### MY ANSWER`,
                          tq.answer || "Answer provided",
                          ``,
                          `#### AI EVALUATION`,
                          `Understanding: ${tq.score ?? 85}% • ${tq.result || "Evaluated"}`,
                          tq.feedback || "",
                          ``,
                        ];
                        if (tq.whatWasCorrect) {
                          parts.push(`#### WHAT I GOT RIGHT`, tq.whatWasCorrect, ``);
                        }
                        if (tq.whatIsMissing) {
                          parts.push(`#### WHAT I NEED TO IMPROVE`, tq.whatIsMissing, ``);
                        }
                        return parts.join("\n");
                      }),
                      ``
                    );
                  }

                  if (topicStudentChats.length > 0) {
                    markdownSections.push(
                      `---`,
                      ``,
                      `### MY QUESTIONS (Ask AI)`,
                      ...topicStudentChats.map((sq) => `**Q**: ${sq.question}\n\n**A**: ${sq.answer}\n`),
                      ``
                    );
                  }

                  const markdownContent = markdownSections.join("\n");

                  void fetch("/api/notes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      courseId,
                      chapterId: currentChapter?.id,
                      topic: lesson,
                      title: lesson,
                      type: "NOTEBOOK",
                      content: markdownContent,
                      metadata: {
                        language: "cpp",
                        courseTitle: "C++ Mastery",
                        chapterTitle: currentChapter?.title,
                        chapterOrder,
                        whatILearned: sessionData?.whatILearned,
                        coreConcepts: sessionData?.coreConcepts,
                        importantPoints: sessionData?.importantPoints,
                        teacherQuestions: sessionData?.teacherQuestions,
                        studentQuestions: topicStudentChats,
                        codeSnippets: sessionData?.codeSnippets || sessionData?.examples,
                        examples: sessionData?.examples,
                        diagram: sessionData?.diagram,
                      },
                      importance: performance?.understanding === "Strong" ? 3 : 2,
                    }),
                  });
                }}
              />

              {/* Lesson Body Card */}
              {currentChapter && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 shadow-sm relative">
                  {/* Chapter Metadata Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        {currentChapter.difficulty || "Beginner"} &bull; Chapter {chapterOrder} Notes
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                        {currentChapter.title}
                      </h2>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold flex items-center gap-1.5 text-slate-600">
                      <Clock size={14} className="text-blue-600" />
                      <span>{currentChapter.estimatedTime || "15 mins"}</span>
                    </div>
                  </div>

                  {/* Render Markdown Notes */}
                  <article
                    ref={lessonContentRef}
                    className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm"
                  >
                    {renderMarkdown(currentChapter.content)}
                  </article>

                  {/* Chapter Completion Gates & Actions */}
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Award size={13} className="text-blue-600" />
                          <span>Chapter {chapterOrder} Completion Requirements</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                              chapterRecapDone
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {chapterRecapDone ? <CheckCircle2 size={13} /> : <Sparkles size={13} className="animate-pulse" />}
                            Recap &amp; Check: {chapterRecapDone ? "Completed" : "Pending"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                              (progresses.find((p) => p.chapterId === currentChapter?.id)?.quizScore ?? 0) >= 75
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {(progresses.find((p) => p.chapterId === currentChapter?.id)?.quizScore ?? 0) >= 75 ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <HelpCircle size={13} />
                            )}
                            Quiz Assessment: {(progresses.find((p) => p.chapterId === currentChapter?.id)?.quizScore ?? 0) > 0 ? `${progresses.find((p) => p.chapterId === currentChapter?.id)?.quizScore}%` : "Not Taken"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Start Chapter Recap Button */}
                        <button
                          type="button"
                          onClick={() => setChapterRecapOpen(true)}
                          className={`px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-h-[44px] ${
                            chapterRecapDone
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                              : "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:brightness-110 text-white shadow-indigo-500/20"
                          }`}
                        >
                          <Sparkles size={15} className={chapterRecapDone ? "text-slate-500" : "animate-pulse"} />
                          <span>{chapterRecapDone ? "Review Chapter Recap" : "Start Chapter Recap"}</span>
                        </button>

                        {/* Quiz Button */}
                        {quizQuestions.length > 0 ? (
                          isQuizUnlocked(getLessons()) ? (
                            <button
                              onClick={() => router.push(`/courses/cpp/chapter/${chapterOrder}/quiz`)}
                              className="px-5 py-3 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-h-[44px]"
                            >
                              <HelpCircle size={15} /> Take Chapter Assessment Quiz
                            </button>
                          ) : (
                            <button
                              onClick={() => alert("🔒 Please complete and master all chapter topics with your AI Teacher before taking the Chapter Assessment Quiz.")}
                              className="px-5 py-3 rounded-xl font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition flex items-center justify-center gap-1.5 cursor-not-allowed min-h-[44px]"
                              title="Complete and master all chapter topics to unlock the quiz"
                            >
                              <Lock size={15} className="text-slate-400" /> Chapter Assessment Locked
                            </button>
                          )
                        ) : (
                          <button
                            onClick={handleMarkChapterComplete}
                            disabled={completing}
                            className="px-5 py-3 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 disabled:opacity-55 transition-opacity flex items-center justify-center gap-1.5 shadow-sm cursor-pointer min-h-[44px]"
                          >
                            <CheckCircle2 size={15} /> {completing ? "Completing..." : "Mark Chapter Complete"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sequential Unlock Feedback Banner */}
                    {chapterRecapDone && isCompleted && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>All Chapter {chapterOrder} requirements satisfied! Next chapter is unlocked.</span>
                        </div>
                        <button
                          onClick={() => router.push(`/courses/cpp/chapter/${chapterOrder + 1}`)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shrink-0 cursor-pointer"
                        >
                          Proceed to Chapter {chapterOrder + 1} &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Learning Assistant Panel */}
        <aside
          data-lenis-prevent
          className={`hidden md:flex h-full border-l border-slate-200 flex-col shrink-0 transition-all duration-300 select-none overflow-hidden bg-slate-50 ${
            rightPanelExpanded ? "w-[460px]" : "w-14"
          }`}
        >
          {rightPanelExpanded ? (
            renderCppAssistantContent(false)
          ) : (
            <div className="w-full h-full flex flex-col gap-2 py-4 items-center bg-slate-50">
              <button
                onClick={() => setRightPanelExpanded(true)}
                title="Open Learning Assistant"
                className="p-2.5 rounded-xl transition-all text-slate-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <Sparkles size={18} />
              </button>

              <button
                onClick={() => setRightPanelExpanded(true)}
                title="Open My Learning Notes"
                className="p-2.5 rounded-xl transition-all text-slate-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <BookOpen size={18} />
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Interactive Quick Recap Modal (Resume Checkpoint) */}
      <QuickRecapModal
        isOpen={quickRecapOpen}
        onClose={() => setQuickRecapOpen(false)}
        language="cpp"
        chapterOrder={chapterOrder}
        topicTitle={quickRecapTopic || currentLesson || "auto"}
        courseId={courseId}
        chapterId={currentChapter?.id}
        onContinueLearning={() => {
          const sections = getLessons();
          const nextIdx = currentLessonIndex + 1;
          if (nextIdx < sections.length) {
            setCurrentLesson(sections[nextIdx]);
            setCurrentLessonIndex(nextIdx);
          }
        }}
        onTeachAgain={(topic) => {
          const sections = getLessons();
          const idx = sections.indexOf(topic);
          setCurrentLesson(topic);
          if (idx >= 0) setCurrentLessonIndex(idx);
        }}
        onSavedToNotes={() => {}}
      />

      {/* Chapter Recap Modal */}
      <ChapterRecapModal
        isOpen={chapterRecapOpen}
        onClose={() => setChapterRecapOpen(false)}
        language="cpp"
        chapterOrder={chapterOrder}
        chapterTitle={currentChapter?.title}
        courseId={courseId || "cpp"}
        chapterId={currentChapter?.id}
        userEmail={userEmail}
        isAlreadyCompleted={chapterRecapDone}
        onRecapCompleted={(result) => {
          setChapterRecapDone(true);
          if (result.isCompleted) {
            void loadPageData();
          }
        }}
      />
    </div>
  );
}
