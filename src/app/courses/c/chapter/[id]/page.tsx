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
  Terminal,
} from "lucide-react";

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

export default function CChapterPage() {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lessonContentRef = useRef<HTMLElement | null>(null);
  const liveTeacherRef = useRef<LiveTeacherHandle | null>(null);
  const topicChatMapRef = useRef<Record<string, Array<{ question: string; answer: string }>>>({});

  const router = useRouter();
  const params = useParams();
  const chapterIdStr = params?.id ? String(params.id) : "0";
  const chapterOrder = parseInt(chapterIdStr, 10) || 0;

  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;
  const isPending = sessionData?.isPending ?? false;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("C Programming Essentials");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(999);
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

  // Floating panels & Chat state
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
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
      text: "Hi! Ask me any questions or doubts about C pointers, memory, structs, or functions, or upload a diagram/code screenshot.",
    },
  ]);

  const [chatLoading, setChatLoading] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [autoResumeTopic, setAutoResumeTopic] = useState<string | undefined>(undefined);

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
      const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: title,
          content,
          learning_memory: learningMemory || "",
          question: `
You are a live interactive teacher explaining this C language unit.
TOPIC: ${title}
CONTENT: ${content}

Teach this C section step-by-step:
1. Core idea in simple terms.
2. Why it matters in low-level memory and C programming.
3. One small practical code example.
4. Key takeaway for C developers.
Concise classroom voice.
`,
          mode: "live-teaching",
          history: [],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Live teaching failed.");
      return data.data?.response || data.response || "Let's understand this C concept step by step.";
    } catch (error) {
      console.error("Live Teacher AI error:", error);
      return "Let's understand this C concept step by step. Focus on memory, pointers, and types.";
    }
  };

  const reteachLiveTeacherSection = async (
    content: string,
    title: string
  ): Promise<string> => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: title,
          content,
          question: `
Simplify this C language explanation for a student who needed clarification.
TOPIC: ${title}
Use a real-world memory analogy, step-by-step intuition, and a crystal-clear short C code snippet.
`,
          mode: "reteach",
          history: [],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Reteach failed.");
      return data.data?.response || data.response || "Let's look at this concept with a simpler analogy.";
    } catch (error) {
      console.error("Live Teacher Reteach error:", error);
      return "Let's break this down even simpler: think of it in terms of bytes and memory addresses.";
    }
  };

  const evaluateCheckpointAnswer = async (
    question: string,
    answer: string
  ): Promise<CheckpointEvaluation> => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C",
          chapter: currentChapter?.title || `Chapter ${chapterOrder}`,
          topic: currentLesson || "C Concept",
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

      const data = await response.json();
      const rawText = data.data?.response || data.response || "";
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

    const promptText = question.trim() || (activeImage ? "Explain this C diagram / code screenshot" : "Explain this topic");

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
      const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: "C",
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
      if (!aiResponse) throw new Error("CodeXAI returned an empty response.");

      setChatMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);

      // Record in Knowledge Graph
      if (userEmail) {
        void fetch("/api/knowledge-graph/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail,
            course: "c",
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
        `/api/courses/c/chapters/${currentChapter.id}/lesson-progress?userEmail=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;

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

        const resumeIdx = lessons.indexOf(resumeLesson);
        const isReturning = Boolean(
          (data.progress && data.progress.length > 0) ||
          (progressMap[resumeLesson] && progressMap[resumeLesson].attempts > 0) ||
          resumeIdx > 0
        );

        const recapKey = `ksai_quick_recap_${userEmail}_c_${currentChapter.id}_${resumeLesson}`;
        const recapDone = typeof window !== "undefined" && sessionStorage.getItem(recapKey) === "done";

        if (isReturning && !recapDone) {
          setAutoResumeTopic(resumeLesson);
        }
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
      localStorage.setItem(`ksai_last_lesson_${userEmail}_c_${currentChapter.id}`, lesson);
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

      await fetch(`/api/courses/c/chapters/${currentChapter.id}/lesson-progress`, {
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
      const res = await fetch(`/api/courses/c/chapters/${chapterOrder}${userParam}`);
      if (!res.ok) {
        throw new Error(`Failed to load C chapter ${chapterOrder}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load chapter.");
      }

      const chapterObj = data.currentChapter || data.chapter;
      setCurrentChapter(chapterObj);
      setCourseId(data.courseId || data.course?.id || "");
      setCourseTitle(data.courseTitle || data.course?.title || "C Programming Essentials");
      setCoursePrice(data.coursePrice ?? data.course?.price ?? 999);
      setIsEnrolled(data.isEnrolled ?? true);
      setUserEmail(data.userEmail || userEmail || "student@gmail.com");
      setChapters(data.chapters || []);
      setProgresses(data.progresses || []);
      setQuizQuestions(data.quizQuestions || []);
    } catch (e: any) {
      console.error("Error loading C chapter:", e);
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
      await fetch(`/api/courses/c/chapters/${chapterOrder}/complete`, {
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-cyan-500 selection:text-black overflow-hidden h-screen">
      {/* Custom Top Bar */}
      <header className="w-full border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-black text-white text-sm shadow-md">
            C
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-sm font-extrabold text-slate-800">KnowledgeStream AI &bull; C Course</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/notes?course=c")}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 hover:bg-blue-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <CourseSwitcher currentLanguage="c" currentChapter={chapterOrder} />

          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={13} /> Dashboard
          </button>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Side: Chapter Navigation Sidebar */}
        <aside
          data-lenis-prevent
          className={`border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex flex-col custom-scrollbar transition-all duration-300 ${
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
                      router.push(`/courses/c/chapter/${ch.orderNumber}`);
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
                      router.push(`/courses/c/chapter/${ch.orderNumber}`);
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
                                router.push(`/courses/c/chapter/${ch.orderNumber}/quiz`);
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
                        onClick={() => router.push(`/courses/c/chapter/${chapterOrder}/quiz`)}
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
        <main data-lenis-prevent className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto w-full bg-slate-50 custom-scrollbar">
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
              onClick={() => router.push("/courses/c")}
              className="hover:text-slate-800 transition-colors"
            >
              Course
            </button>
            <ChevronRight size={10} className="text-slate-400 animate-none" />
            <button
              onClick={() => router.push("/courses/c/curriculum")}
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
                chapterTitle={currentChapter?.title || "C Chapter"}
                chapterContent={currentChapter?.content || ""}
                course="C"
                courseId={courseId}
                chapterId={currentChapter?.id || ""}
                userEmail={userEmail}
                activeTopic={currentLesson || undefined}
                autoResumeTopic={autoResumeTopic}
                allTopics={getLessons()}
                onActiveTopicChange={(topic) => {
                  setCurrentLesson((prev) => (prev === topic ? prev : topic));
                  const lessons = getLessons();
                  const idx = lessons.indexOf(topic);
                  if (idx >= 0) setCurrentLessonIndex(idx);
                }}
                isFinalTopic={
                  getLessons().length > 0 &&
                  getLessons().indexOf(currentLesson || "") === getLessons().length - 1
                }
                onNextTopic={() => {
                  const lessons = getLessons();
                  const idx = lessons.indexOf(currentLesson || "");
                  if (idx >= 0 && idx < lessons.length - 1) {
                    const next = lessons[idx + 1];
                    setCurrentLesson(next);
                    setCurrentLessonIndex(idx + 1);

                    setTimeout(() => {
                      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
                      const targetEl = headings.find((h) =>
                        h.textContent?.trim().toLowerCase().includes(next.toLowerCase())
                      );
                      targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  } else if (idx === lessons.length - 1) {
                    void handleMarkChapterComplete();
                    router.push(`/courses/c/chapter/${chapterOrder}/quiz`);
                  }
                }}
                onChapterComplete={() => {
                  void handleMarkChapterComplete();
                }}
                onExplain={explainLiveTeacherUnit}
                onReteach={reteachLiveTeacherSection}
                onEvaluateCheckpoint={evaluateCheckpointAnswer}
                onLessonComplete={(title: string, performance, sessionData) => {
                  const lesson = getLessons().find(
                    (item) => item.trim().toLowerCase() === title.trim().toLowerCase()
                  );
                  if (!lesson) return;

                  const calculatedStatus =
                    performance?.understanding === "Strong"
                      ? "MASTERED"
                      : performance?.understanding === "Good"
                      ? "PRACTICED"
                      : performance?.understanding === "Needs Practice"
                      ? "NEEDS_REVIEW"
                      : "PRACTICED";

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
                    `**Course**: C Programming Essentials`,
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
                        language: "c",
                        courseTitle: "C Programming Essentials",
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

                  {/* Complete Action at bottom */}
                  <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold font-mono">
                          <CheckCircle2 size={15} /> Chapter Passed &amp; Completed!
                        </span>
                      ) : (
                        <span>Please read the notes carefully before starting the assessment.</span>
                      )}
                    </div>

                    {quizQuestions.length > 0 ? (
                      <button
                        onClick={() => router.push(`/courses/c/chapter/${chapterOrder}/quiz`)}
                        className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        <HelpCircle size={14} /> Take Chapter Assessment Quiz
                      </button>
                    ) : (
                      <button
                        onClick={handleMarkChapterComplete}
                        disabled={completing}
                        className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 disabled:opacity-55 transition-opacity flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> {completing ? "Completing..." : "Mark Chapter Complete"}
                      </button>
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
          className={`h-full border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 select-none overflow-hidden bg-slate-50 ${
            rightPanelExpanded ? "w-[460px]" : "w-14"
          }`}
        >
          {rightPanelExpanded ? (
            <div className="w-full h-full flex flex-col p-4 gap-4 overflow-hidden bg-slate-50">
              {/* MY LEARNING NOTES */}
              <button
                type="button"
                onClick={() => router.push("/notes?course=c")}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
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

              {/* CODEXAI / ASK AI MENTOR */}
              <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Mentor Header */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
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
                    <button
                      type="button"
                      onClick={() => setRightPanelExpanded(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition cursor-pointer"
                      title="Collapse Panel"
                    >
                      <ChevronRight size={16} />
                    </button>
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
                            "Explain this C topic in a simple way.",
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
                            "Give me a simple C example of this topic.",
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
                            "Show me this C concept visually. Use a simple flow, diagram, or structured explanation if appropriate.",
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
                            "Ask me one question about this C topic to check my understanding. Do not give me the answer immediately.",
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
                            "I'm confused about this C topic. Explain it differently using simpler intuition and a small example.",
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
                      placeholder={attachedImage ? "Ask about attached C diagram / code screenshot..." : "Ask about this lesson..."}
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
                    CodeXAI uses this lesson and visual context.
                  </p>
                </div>
              </div>
            </div>
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
        language="c"
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
    </div>
  );
}
