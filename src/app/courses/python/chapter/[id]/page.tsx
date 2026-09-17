"use client";

import React, {
  useState,
  useEffect,
  useRef
} from "react";
import LiveTeacher, {
  LiveTeacherHandle,
} from "@/components/learning/LiveTeacher";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { renderMarkdown } from "@/lib/markdown";
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
  Zap,
  Calendar,
} from "lucide-react";
import { QuickRecapModal } from "@/components/learning/QuickRecapModal";
import { VisionAttachment } from "@/components/learning/VisionAttachment";
import { DailyRecapModal } from "@/components/learning/DailyRecapModal";
import { CourseSwitcher } from "@/components/courses/CourseSwitcher";
import { CheckpointEvaluation, parseCheckpointEvaluation } from "@/types/teaching-types";
import { ChapterLearningAnalysis } from "@/lib/adaptive/types";
import { LockedChapterCard } from "@/components/learning/LockedChapterCard";

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

const CHAPTER_SECTIONS: Record<number, string[]> = {
  0: [
    "1. What is Programming?",
    "2. What is Python?",
    "3. Where Python is Used",
    "4. How Python Executes Code",
    "5. Interpreted vs Compiled Languages",
    "6. Installing Python & Setting Up VS Code",
    "7. Writing Your Very First Python Program",
    "Quiz Assessment"
  ],
  1: [
    "1. Installing Python, Running Scripts & IDE/REPL",
    "2. Variables, Naming & Dynamic Typing",
    "3. Data Types: int, float, str, bool, None",
    "4. Type Casting and Conversion",
    "5. Operators (Arithmetic, Logical, Bitwise)",
    "6. Input / Output & String Formatting",
    "7. Comments & PEP 8 Basics",
    "Mini Project: Personal Profile Card",
    "Quiz Assessment"
  ],
  2: [
    "1. if / elif / else Conditionals",
    "2. for Loops and while Loops",
    "3. break, continue, and pass",
    "4. Nested Loops and Conditionals",
    "5. range(), enumerate(), and zip() in Loops",
    "6. Common Loop Patterns",
    "Mini Project: Number Guessing Game",
    "Quiz Assessment"
  ],
  3: [
    "1. Lists — Indexing & Slicing",
    "2. List Methods & List Comprehensions",
    "3. Tuples — Immutability & Packing/Unpacking",
    "4. Dictionaries — Methods, Comprehensions & Iteration",
    "5. Sets — Operations & Use Cases",
    "6. Strings as Sequences",
    "7. Nested Data Structures",
    "8. Choosing the Right Data Structure",
    "Mini Project: Student Database",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  4: [
    "1. Defining and Calling Functions",
    "2. Positional, Keyword, Default & Variable-Length Arguments",
    "3. Return Values vs. Side Effects",
    "4. Scope — Local, Global & Nonlocal",
    "5. Lambda Functions",
    "6. Recursion Basics & Recursion vs. Iteration",
    "7. Docstrings & Function Documentation",
    "Mini Project: Simple ATM Simulator",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  5: [
    "1. Classes and Objects — the __init__ Constructor",
    "2. Instance vs. Class Attributes and Methods",
    "3. Inheritance and Method Overriding",
    "4. Polymorphism and Duck Typing",
    "5. Encapsulation — Public, Protected & Private",
    "6. Dunder / Magic Methods",
    "7. Abstract Classes and Interfaces (abc module)",
    "8. Composition vs. Inheritance",
    "Mini Project: Library Management System",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  6: [
    "1. Iterators and Iterables",
    "2. Generators and the yield Keyword",
    "3. Decorators",
    "4. Context Managers",
    "5. map(), filter(), reduce()",
    "6. Comprehensions — List, Dict, Set & Generator",
    "7. First-Class Functions and Closures",
    "Mini Project: Log Processor with Generators & Decorators",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  7: [
    "1. try / except / else / finally",
    "2. Raising Exceptions & Custom Exception Classes",
    "3. Reading and Writing Files (Text, CSV, JSON)",
    "4. Working with File Paths — os and pathlib",
    "5. Context Managers for File Handling",
    "Mini Project: Expense Tracker with CSV & Error Handling",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  8: [
    "1. Importing Modules and Packages, and __init__.py",
    "2. Standard Library Highlights",
    "3. Virtual Environments (venv) and pip",
    "4. requirements.txt Basics",
    "5. Writing and Organizing Your Own Modules",
    "Mini Project: Personal Utility Package",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  9: [
    "1. Working with APIs (requests & JSON)",
    "2. Basic Web Scraping Concepts",
    "3. Automating Simple Tasks (File Handling & Scheduling)",
    "4. Intro to Regular Expressions (re module)",
    "5. Working with Dates and Times",
    "Mini Project: Weather CLI Tool",
    "Chapter Summary",
    "Quiz Assessment"
  ],
  10: [
    "1. Python's Data Model / Dunder Methods in Depth",
    "2. Memory Management Basics",
    "3. Mutable vs. Immutable Objects, Shallow vs. Deep Copy",
    "4. Concurrency Basics — Threading, Multiprocessing, asyncio",
    "5. Metaclasses (Overview Level)",
    "6. Type Hints and Static Typing (typing module)",
    "Mini Project: Type-Hinted Concurrent Downloader (Simulated)",
    "Chapter Summary",
    "Quiz Assessment"
  ]
};

function stripMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/[#*`>_\-]/g, "") // strip headers, bold, code, blockquotes, bullets
    .replace(/\[!NOTE\]/gi, "Note:")
    .replace(/\[!TIP\]/gi, "Tip:")
    .replace(/\[!IMPORTANT\]/gi, "Important:")
    .replace(/\[!WARNING\]/gi, "Warning:")
    .replace(/\[!CAUTION\]/gi, "Caution:")
    .replace(/\[.*?\]\(.*?\)/g, "") // strip links
    .replace(/\|.*?\|/g, "") // strip table rows
    .replace(/```[\s\S]*?```/g, "") // strip code blocks
    .replace(/graph (TD|LR)[\s\S]*?/g, "") // strip mermaid graphs
    .replace(/\s+/g, " ") // clean whitespace
    .trim();
}

export default function PythonChapterPage() {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lessonContentRef = useRef<HTMLElement | null>(null);
  const liveTeacherRef = useRef<LiveTeacherHandle | null>(null);
  const topicChatMapRef = useRef<Record<string, Array<{ question: string; answer: string }>>>({});

  const router = useRouter();
  const params = useParams();
  const chapterIdStr = params?.id ? String(params.id) : "0";
  const chapterOrder = parseInt(chapterIdStr, 10);

  const sessionData = useSession();
  const session = (sessionData?.data as any) ?? null;
  const isPending = sessionData?.isPending ?? false;

  // State Variables
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState("Python AI & Data Structures Architecture");
  const [courseId, setCourseId] = useState("");
  const [coursePrice, setCoursePrice] = useState(2499);
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

  

  // Quick Recap & Daily Recap Modals
  const [quickRecapOpen, setQuickRecapOpen] = useState(false);
  const [quickRecapTopic, setQuickRecapTopic] = useState("");
  const [dailyRecapOpen, setDailyRecapOpen] = useState(false);

  // Floating panel tabs state
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState(false);
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
      text: "Hi! Ask me any questions or doubts about this chapter's notes, or upload a diagram/code screenshot for visual analysis.",
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


const explainLiveTeacherUnit = async (
  content: string,
  title: string,
  learningMemory?: string
): Promise<string> => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/ai/teach/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: "Python",
          chapter: currentChapter?.title || "Python Chapter",
          topic: title,
          content,

          question: `
You are the Live Teacher inside KnowledgeStream AI.

You are teaching one section of a chapter to a student in real time.

CHAPTER:
${currentChapter?.title || "Python Chapter"}

SECTION:
${title}

SOURCE CONTENT:
${content}

Your job is to teach this section, NOT simply summarize it.

Teaching behavior:

1. Start with the core idea.
2. Explain it in simple student-friendly language.
3. Assume the student is learning this concept for the first time.
4. Connect the idea to something familiar when useful.
5. Give ONE small practical example when useful.
6. Explain why this concept matters.
7. Do not explain future sections.
8. Do not repeat the source content word-for-word.
9. Do not dump large amounts of information.
10. Keep the explanation focused on the current section.
11. Sound like a teacher speaking directly to one student.
12. Avoid unnecessary markdown.
13. Do not ask a question yet. Checkpoints will be handled separately.

Structure your explanation naturally:

Core idea:
Explain the main concept.

Why it matters:
Explain why the student should care.

Example:
Give one small example when appropriate.

Key takeaway:
End with one short sentence the student should remember.

Keep the entire explanation concise enough for live classroom teaching.
`,

          mode: "live-teaching",
          history: [],
        }),
      }
    );

    const data = await safeJson(response);

    if (data?.success) {
      return (
        data.data?.response ||
        data.response ||
        "Let's understand this section step by step."
      );
    }

    return "Let's understand this section step by step. Focus on the core idea first, and then we'll connect it to practical examples.";
  } catch (error) {
    console.error(
      "Live Teacher AI error:",
      error
    );

    return "Let's understand this section step by step. Focus on the highlighted part first, and then we'll connect it to the bigger concept.";
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

    const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course: "Python",
        chapter: currentChapter?.title || "Python Chapter",
        topic: title,
        content: content || getLessonContent(),
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
            course: "Python",
            chapter: currentChapter?.title || "Python Chapter",
            topic: title,
            content: content || getLessonContent(),
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
      return (
        data.data?.response ||
        data.response ||
        `Let's understand ${title} from a fresh, intuitive perspective with a simple analogy.`
      );
    }

    return `Let's break down ${title} using an intuitive real-world analogy and step-by-step thinking.`;
  } catch (error) {
    console.error("Live teacher reteach error:", error);
    return `Let's break down ${title} using an intuitive real-world analogy and step-by-step thinking.`;
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
        course: "python",
        chapter: currentChapter?.title || "Python Chapter",
        chapterId: currentChapter?.id || "general",
        topic: currentLesson || currentChapter?.title || "Python Lesson",
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
    const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course: "Python",
        chapter: currentChapter?.title || "Python Chapter",
        topic: currentLesson || currentChapter?.title || "Python Lesson",
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
            course: "Python",
            chapter: currentChapter?.title || "Python Chapter",
            topic: currentLesson || currentChapter?.title || "Python Lesson",
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


const generateResumeRecap = async (
  resumeTitle: string
): Promise<{ recap: string; questions: string[] }> => {
  if (!currentChapter) {
    return {
      recap: `Welcome back! You stopped at ${resumeTitle}.`,
      questions: [`What do you remember about ${resumeTitle}?`],
    };
  }

  const completed = getLessons().filter((lesson) =>
    completedLessons.includes(lesson)
  );

  const prompt = `
You are the KnowledgeStream AI Live Teacher.

A student has returned to a Python chapter after leaving a previous live teaching session.
Do NOT restart the chapter.
Do NOT teach the resume section yet.

CHAPTER:
${currentChapter.title}

TOPICS THE STUDENT ALREADY COMPLETED:
${completed.length ? completed.join("\\n") : "No fully completed topic was recorded."}

THE STUDENT'S SAVED RESUME POINT:
${resumeTitle}

Create a short return-to-learning checkpoint.

Return ONLY valid JSON in this exact shape:
{
  "recap": "2-4 short sentences summarizing what the student already learned.",
  "questions": [
    "Short question 1",
    "Short question 2"
  ]
}

Rules:
- Ask 2 questions maximum.
- Questions must test previously learned material, not future material.
- Keep the recap concise and student-friendly.
- Do not include markdown fences.
`;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course: "Python",
        chapter: currentChapter.title,
        topic: resumeTitle,
        content: currentChapter.content,
        question: prompt,
        mode: "resume-check",
        history: [],
      }),
    });

    const data = await response.json();
    const raw = data.data?.response ?? data.response ?? "";

    if (!response.ok || !data.success || !raw) {
      throw new Error(data.message || "Resume recap generation failed.");
    }

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      recap:
        typeof parsed.recap === "string"
          ? parsed.recap
          : `Welcome back! You were learning ${resumeTitle}.`,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter((q: unknown) => typeof q === "string")
        : [],
    };
  } catch (error) {
    console.error("Resume recap generation error:", error);

    return {
      recap: completed.length
        ? `Welcome back! You previously worked through ${completed.slice(-3).join(", ")}. You stopped at ${resumeTitle}. Let's quickly check what you remember before we continue.`
        : `Welcome back! You stopped at ${resumeTitle}. Let's quickly check what you remember before we continue.`,
      questions: [
        completed.length
          ? `What is one important idea you remember from ${completed[completed.length - 1]}?`
          : `What do you remember about ${resumeTitle}?`,
        `Why is ${completed.length ? completed[completed.length - 1] : resumeTitle} useful?`,
      ],
    };
  }
};

const evaluateResumeAnswer = async (
  question: string,
  answer: string
): Promise<string> => {
  if (!currentChapter) return "Good attempt. Let's continue learning.";

  const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course: "Python",
      chapter: currentChapter.title,
      topic: currentLesson || currentChapter.title,
content: getLessonContent(),
      question: `
You are evaluating a student's return-to-learning answer.

QUESTION:
${question}

STUDENT ANSWER:
${answer}

Evaluate the answer fairly and briefly.
Start with exactly one of: "Correct", "Almost correct", or "Needs review".
Then give one short reason.
If needed, give one concise correction.
Do not shame the student.
Do not teach the upcoming lesson.
`,
      mode: "resume-answer-evaluation",
      history: [],
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Answer evaluation failed.");
  }

  return data.data?.response ?? data.response ?? "Good attempt. Let's continue learning.";
};

const handleTeachingRequest = async (
  question: string,
  mode: string = "chat",
  imagePayload?: { base64: string; mime: string; fileName: string } | null
) => {
  const activeImage = imagePayload !== undefined ? imagePayload : attachedImage;
  if ((!question.trim() && !activeImage) || chatLoading) return;

  if (!currentChapter) return;

  // Pause Live Teacher while the student is asking a question.
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

    void saveLessonProgress(currentLesson, {
      questionsAsked,
    });
  }

  const promptText = question.trim() || (activeImage ? "Explain this diagram / visual screenshot" : "Explain this topic");

  // Show student's message with image thumbnail if present
  setChatMessages((prev) => [
    ...prev,
    {
      sender: "user",
      text: promptText,
      image: activeImage?.base64,
      fileName: activeImage?.fileName,
    },
  ]);

  setChatInput("");
  setAttachedImage(null);
  setChatLoading(true);

  const effectiveMode = activeImage ? "vision" : mode;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/ai/teach/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course: "Python",
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

    if (!aiResponse) {
      throw new Error("CodeXAI returned an empty response.");
    }

    // Display AI response
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: aiResponse,
      },
    ]);

    // Record Learning Evidence in Knowledge Graph
    if (userEmail) {
      void fetch("/api/knowledge-graph/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          course: "python",
          chapterId: currentChapter.id,
          topic: currentLesson || currentChapter.title,
          source: activeImage ? "VISION" : "NOTE",
          score: 85,
          summary: promptText,
          visualReference: activeImage?.fileName,
        }),
      }).catch((e) => console.error("Knowledge Graph evidence error:", e));
    }

    // Attach to active topic notes
    const activeLessonKey = currentLesson || currentChapter?.title || "General";
    if (!topicChatMapRef.current[activeLessonKey]) {
      topicChatMapRef.current[activeLessonKey] = [];
    }
    topicChatMapRef.current[activeLessonKey].push({
      question,
      answer: aiResponse,
    });

    

  } catch (error) {

    console.error(
      "CodeXAI Teaching Error:",
      error
    );

    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text:
          "⚠️ I couldn't connect to the teaching engine right now. Please try again.",
      },
    ]);

  } finally {
    setChatLoading(false);
  }
};

const initializeLessonProgress = () => {
  const lessons = getLessons();

  setLessonProgress((prev) => {
    const next = { ...prev };

    lessons.forEach((lesson) => {
      if (!next[lesson]) {
        next[lesson] = {
          lesson,
          status: "NOT_STARTED",
          score: 0,
          attempts: 0,
          questionsAsked: 0,
          correctAnswers: 0,
        };
      }
    });

    return next;
  });
};


const getLessons = () => {
  if (CHAPTER_SECTIONS[chapterOrder] && CHAPTER_SECTIONS[chapterOrder].length > 0) {
    return CHAPTER_SECTIONS[chapterOrder].filter(
      (section) => section !== "Quiz Assessment"
    );
  }
  if (currentChapter?.content) {
    const extracted = extractLessonTitles(currentChapter.content, chapterOrder);
    if (extracted.length > 0) return extracted;
  }
  return [];
};

const totalLessons = getLessons().length;

const masteredLessons = Object.values(lessonProgress).filter(
  (item) => item.status === "MASTERED"
).length;

const learningPercentage =
  totalLessons > 0
    ? Math.round((masteredLessons / totalLessons) * 100)
    : 0;

const getLessonContent = () => {
  if (!currentChapter?.content) return "";

  const lesson = currentLesson;

  if (!lesson) {
    return currentChapter.content;
  }

  const content = currentChapter.content;

  // Try to find the selected lesson heading in the chapter content.
  let startIndex = content.toLowerCase().indexOf(lesson.toLowerCase());

  if (startIndex === -1) {
    const normLesson = lesson.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();
    startIndex = content.toLowerCase().indexOf(normLesson);
  }

  if (startIndex === -1) {
    return content;
  }

  const lessons = getLessons();
  const lessonIndex = lessons.indexOf(lesson);

  if (lessonIndex === -1 || lessonIndex === lessons.length - 1) {
    return content.slice(startIndex);
  }

  const nextLesson = lessons[lessonIndex + 1];
  let endIndex = content
    .toLowerCase()
    .indexOf(nextLesson.toLowerCase(), startIndex + lesson.length);

  if (endIndex === -1) {
    const normNext = nextLesson.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();
    endIndex = content.toLowerCase().indexOf(normNext, startIndex + lesson.length);
  }

  if (endIndex === -1 || endIndex <= startIndex) {
    return content.slice(startIndex);
  }

  return content.slice(startIndex, endIndex);
};

// =========================================================
// LESSON PROGRESS PERSISTENCE
// =========================================================

const loadLessonProgress = async () => {
  if (!currentChapter?.id || !userEmail) return;

  try {
    const response = await fetch(
      `/api/courses/python/chapters/${currentChapter.id}/lesson-progress?userEmail=${encodeURIComponent(
        userEmail
      )}`
    );

    if (!response.ok) {
      return;
    }

    const data = await safeJson(response);

    if (!data || !data.success) {
      console.error("Failed to load lesson progress:", data?.error);
      return;
    }

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

    // Sequential curriculum order: Resume at the first uncompleted lesson in the chapter
    const firstUncompleted = getFirstUncompletedLesson(lessons, mastered);
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
          course: "Python",
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
            const chapterRecapKey = `ksai_chapter_recap_${userEmail}_python_${currentChapter.id}`;
            const chapterRecapDone = typeof window !== "undefined" && sessionStorage.getItem(chapterRecapKey) === "done";
            if (!chapterRecapDone) {
              setShouldAutoChapterRecap(true);
            }
          } else if (resumeData.shouldQuickRecap && resumeData.lastMeaningfulTopic) {
            const recapTopic = resumeData.lastMeaningfulTopic;
            const recapKey = `ksai_quick_recap_${userEmail}_python_${currentChapter.id}_${recapTopic}`;
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
  } catch (error) {
    console.error("Lesson progress loading error:", error);
  }
};

const saveLessonProgress = async (
  lesson: string,
  updates: Partial<LessonProgress>
) => {
  if (!currentChapter?.id || !userEmail || !lesson) {
    return;
  }

  // Persist locally for instant tab/session recovery
  if (typeof window !== "undefined") {
    localStorage.setItem(`ksai_last_lesson_${userEmail}_python_${currentChapter.id}`, lesson);
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

    const response = await fetch(
      `/api/courses/python/chapters/${currentChapter.id}/lesson-progress`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await safeJson(response);

    if (!response.ok || !data?.success) {
      console.error(
        "Failed to save lesson progress:",
        data.error
      );

      return;
    }

    console.log(
      "✅ Lesson progress saved:",
      lesson,
      payload.status
    );
  } catch (error) {
    console.error(
      "Lesson progress save error:",
      error
    );
  }
};

  // Expandable chapters state
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({ [chapterOrder]: true });


  // Stop speech / mentor speaking immediately on page unmount or route change
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
  if (!chatScrollRef.current) return;

  chatScrollRef.current.scrollTo({
    top: chatScrollRef.current.scrollHeight,
    behavior: "smooth",
  });
}, [chatMessages, chatLoading]);


  // Update expanded chapters state on load / chapterOrder changes
  useEffect(() => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterOrder]: true,
    }));
  }, [chapterOrder]);

  const toggleChapterExpand = (order: number) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [order]: !prev[order],
    }));
  };

  // Fetch logged in user and page data
  useEffect(() => {
    if (!isPending && session?.user) {
      setUser({
        name: session.user.name ?? "Student",
        email: session.user.email ?? "",
        role: (session.user as any).role ?? "Student",
      });
    }
  }, [session, isPending]);

  // Load notes and quiz details
  const loadPageData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Notes & Metadata
      const chapterRes = await fetch(`/api/courses/python/chapters/${chapterOrder}`);
      if (!chapterRes.ok) {
        let errData: any = null;
        try {
          errData = await chapterRes.json();
        } catch {}

        if (chapterRes.status === 403 || errData?.locked) {
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

        setError(errData?.error || "Failed to load chapter contents.");
        setLoading(false);
        return;
      }

      const chapterData = await chapterRes.json();

      if (!chapterData.success) {
        if (chapterData.locked) {
          setLockedInfo(chapterData);
          setLoading(false);
          return;
        }
        setError(chapterData.error || "Failed to load chapter contents.");
        setLoading(false);
        return;
      }

      setLockedInfo(null);

      setCourseTitle(chapterData.courseTitle);
      setCourseId(chapterData.courseId);
      setCoursePrice(chapterData.coursePrice);
      setIsEnrolled(chapterData.isEnrolled);
      setUserEmail(chapterData.userEmail || "student@gmail.com");
      setCurrentChapter(chapterData.currentChapter);
      setChapters(chapterData.chapters);
      setProgresses(chapterData.progresses);

      // 2. Fetch Quiz Questions to check if a quiz exists
      try {
        const quizRes = await fetch(`/api/courses/python/chapters/${chapterOrder}/quiz`);
        if (quizRes.ok) {
          const quizData = await quizRes.json();
          if (quizData.success) {
            setQuizQuestions(quizData.questions || []);
          }
        }
      } catch (quizErr) {
        console.warn("Quiz load notice:", quizErr);
      }
    } catch (e) {
      console.error(e);
      setError("Network error connecting to learning server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  loadPageData();
}, [chapterOrder]);

useEffect(() => {
  const sections = getLessons();

  initializeLessonProgress();

  if (sections.length > 0 && !currentLesson) {
    setCurrentLesson(sections[0]);
    setCurrentLessonIndex(0);
  }
}, [chapterOrder, currentLesson]);


// Restore saved lesson progress from database
useEffect(() => {
  if (!currentChapter?.id || !userEmail) {
    return;
  }

  loadLessonProgress();
}, [currentChapter?.id, userEmail]);

const markLessonLearning = () => {
  if (!currentLesson) return;

  setLessonProgress((prev) => ({
    ...prev,
    [currentLesson]: {
      ...(prev[currentLesson] || {
        lesson: currentLesson,
        score: 0,
        attempts: 0,
        questionsAsked: 0,
        correctAnswers: 0,
      }),
      status: "LEARNING",
    },
  }));

  void saveLessonProgress(
    currentLesson,
    {
      status: "LEARNING",
    }
  );
};


const markLessonCompleted = () => {
  if (!currentLesson) return;

  setCompletedLessons((prev) => {
    if (prev.includes(currentLesson)) {
      return prev;
    }

    return [...prev, currentLesson];
  });

  setLessonProgress((prev) => ({
    ...prev,

    [currentLesson]: {
      ...(prev[currentLesson] || {
        lesson: currentLesson,
        score: 0,
        attempts: 0,
        questionsAsked: 0,
        correctAnswers: 0,
      }),

      status: "PRACTICED",
    },
  }));

  void saveLessonProgress(
    currentLesson,
    {
      status: "PRACTICED",
    }
  );
};

const getLessonStatus = (
  lesson: string
): LearningStatus => {
  return (
    lessonProgress[lesson]?.status ||
    "NOT_STARTED"
  );
};

const getLessonStatusLabel = (
  lesson: string
): string => {
  const status = getLessonStatus(lesson);

  switch (status) {
    case "LEARNING":
      return "Learning";

    case "PRACTICED":
      return "Practiced";

    case "NEEDS_REVIEW":
      return "Needs Review";

    case "MASTERED":
      return "Mastered";

    default:
      return "Not Started";
  }
};

const markLessonMastered = () => {
  if (!currentLesson) return;

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
      status: "MASTERED",
      score: 100,
    },
  }));

  setCompletedLessons((prev) => {
    if (prev.includes(currentLesson)) {
      return prev;
    }

    return [...prev, currentLesson];
  });

  void saveLessonProgress(
    currentLesson,
    {
      status: "MASTERED",
      score: 100,
    }
  );
};

const [isMentorSpeaking, setIsMentorSpeaking] =
  useState(false);

const speakMentor = (text: string) => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "code example")
    .replace(/[*#_>`]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (!cleanText) return;

  const utterance =
    new SpeechSynthesisUtterance(cleanText);

  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    setIsMentorSpeaking(true);
  };

  utterance.onend = () => {
    setIsMentorSpeaking(false);
  };

  utterance.onerror = () => {
    setIsMentorSpeaking(false);
  };

  window.speechSynthesis.speak(utterance);
};

const stopMentorSpeaking = () => {
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    window.speechSynthesis.cancel();
  }

  setIsMentorSpeaking(false);
};


const [isListening, setIsListening] =
  useState(false);

const startMentorListening = () => {
  if (typeof window === "undefined") return;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Voice input is not supported in this browser."
    );
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onresult = (event: any) => {
    let transcript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      transcript +=
        event.results[i][0].transcript;
    }

    setChatInput(transcript);
  };

  recognition.onerror = () => {
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.start();
};

  const handleBuyCourse = async () => {
    if (!courseId) return;
    const email = user?.email || userEmail || "student@gmail.com";
    const name = user?.name || "Student";
    setBuying(true);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: coursePrice,
          currency: "INR",
          courseId: courseId,
          userEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Order creation failed.");
        setBuying(false);
        return;
      }

      const { isMock } = data;

      if (isMock) {
        alert("🔧 Local Dev Mode: Simulating Razorpay Payment Gateway. Click OK to confirm purchase.");
        
        const enrollRes = await fetch("/api/courses/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: email,
            courseId: courseId,
            paidAmount: coursePrice,
            paymentId: `pay_mock_${Date.now()}`,
          }),
        });

        const enrollData = await enrollRes.json();
        if (enrollData.success) {
          alert("🎉 Course purchased successfully! All chapters are now unlocked.");
          await loadPageData();
        } else {
          alert(enrollData.error || "Enrollment failed.");
        }
      } else {
        const options = {
          key: data.key,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "KnowledgeStream AI",
          description: courseTitle,
          order_id: data.order.id,
          handler: async function (response: any) {
            const enrollRes = await fetch("/api/courses/enroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userEmail: email,
                courseId: courseId,
                paidAmount: coursePrice,
                paymentId: response.razorpay_payment_id,
              }),
            });
            const enrollData = await enrollRes.json();
            if (enrollData.success) {
              alert("🎉 Course purchased successfully! All chapters are now unlocked.");
              await loadPageData();
            } else {
              alert(enrollData.error || "Enrollment failed.");
            }
          },
          prefill: {
            name: name,
            email: email,
          },
        };
        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          alert("Razorpay SDK is loading. Try again.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to complete mock payment.");
    } finally {
      setBuying(false);
    }
  };

  const handleMarkChapterComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/courses/python/chapters/${chapterOrder}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`🎉 Chapter ${chapterOrder} completed!`);
        router.push("/courses/python/curriculum");
      } else {
        alert(data.error || "Failed to mark chapter as complete.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error marking chapter complete.");
    } finally {
      setCompleting(false);
    }
  };

  const isCompleted = !!progresses.find((p) => p.chapterId === currentChapter?.id)?.isCompleted;

  const isChapterUnlockedLocal = (order: number) => {
    if (order === 0) return true;
    const prevChapter = chapters.find((c) => c.orderNumber === order - 1);
    if (!prevChapter) return false;
    const prevProgress = progresses.find((p) => p.chapterId === prevChapter.id);
    
    if (order > 0 && !isEnrolled) return false;

    return !!prevProgress?.isCompleted && (prevProgress.quizScore ?? 0) >= 75;
  };

  const isTopicUnlocked = (secIdx: number, sectionsList: string[]) => {
    if (secIdx === 0) return true;
    for (let i = 0; i < secIdx; i++) {
      const priorSec = sectionsList[i];
      if (!priorSec || priorSec === "Quiz Assessment") continue;
      const priorStatus = lessonProgress[priorSec]?.status;
      if (priorStatus !== "MASTERED" && priorStatus !== "PRACTICED") {
        return false;
      }
    }
    return true;
  };

  const isQuizUnlocked = (sectionsList: string[]) => {
    const topicsOnly = sectionsList.filter((s) => s !== "Quiz Assessment");
    if (topicsOnly.length === 0) return true;
    return topicsOnly.every((s) => {
      const st = lessonProgress[s]?.status;
      return st === "MASTERED" || st === "PRACTICED";
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-cyan-500 selection:text-black overflow-hidden h-screen">
      {/* Custom Top Bar */}
      <header className="w-full border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-md">
            KS
          </div>
          <div>
            <span className="text-[10px] text-blue-600 font-mono font-bold tracking-wider block">LEARNING STUDIO</span>
            <span className="text-sm font-extrabold text-slate-800">KnowledgeStream AI &bull; Python Course</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/notes?course=python")}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 hover:bg-blue-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <CourseSwitcher currentLanguage="python" currentChapter={chapterOrder} />

          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <ArrowLeft size={13} /> Dashboard
          </button>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex w-full overflow-hidden">
        
        {/* Left Side: Chapter Navigation Sidebar */}
        <aside data-lenis-prevent className={`border-r border-slate-200 bg-white overflow-y-auto shrink-0 flex flex-col custom-scrollbar transition-all duration-300 ${
          leftSidebarExpanded ? "w-80" : "w-14"
        }`}>
          <div className={`p-4 border-b border-slate-200 bg-slate-50/50 flex items-center shrink-0 ${
            leftSidebarExpanded ? "justify-between" : "justify-center"
          }`}>
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
                      router.push(`/courses/python/chapter/${ch.orderNumber}`);
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
                      router.push(`/courses/python/chapter/${ch.orderNumber}`);
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
                    {!active && (
                      <ChevronDown size={14} className="text-slate-400 shrink-0 ml-auto" />
                    )}
                    {active && (
                      <ChevronUp size={14} className="text-blue-600 shrink-0 ml-auto" />
                    )}
                  </button>

                  {/* Expandable nested sections outline */}
                  {isExpanded && (
                    <div className="pl-9 pr-2 py-1 space-y-2 border-l border-slate-200 ml-5">
                      {(CHAPTER_SECTIONS[ch.orderNumber] || []).map((sec, secIdx, arr) => {
                        const isQuiz = sec === "Quiz Assessment";
                        const status = isQuiz
                          ? "NOT_STARTED"
                          : getLessonStatus(sec);
                        const isUnlocked = isQuiz
                          ? isQuizUnlocked(arr)
                          : isTopicUnlocked(secIdx, arr);

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
                                router.push(`/courses/python/chapter/${ch.orderNumber}/quiz`);
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

                            <span className="truncate flex-1">
                              {sec}
                            </span>

                            {!isQuiz && (
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                {isUnlocked ? getLessonStatusLabel(sec) : "Locked"}
                              </span>
                            )}
                            {isQuiz && isUnlocked && (
                              <span className="text-[9px] font-bold text-purple-600 whitespace-nowrap">
                                Ready ⭐
                              </span>
                            )}
                          </button>
                        );
                      })}
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
              onClick={() => router.push("/courses/python")}
              className="hover:text-slate-800 transition-colors"
            >
              Course
            </button>
            <ChevronRight size={10} className="text-slate-400 animate-none" />
            <button
              onClick={() => router.push("/courses/python/curriculum")}
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
              courseSlug="python"
              courseTitle="Python AI & Data Structures Mastery"
              chapterOrder={chapterOrder}
              chapterTitle={lockedInfo.chapterTitle}
              previousChapter={lockedInfo.previousChapter}
              message={lockedInfo.message}
              onRetry={loadPageData}
            />
          ) : error ? (
            <div className="bg-white p-10 rounded-2xl border border-red-200 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mx-auto">
                <AlertCircle size={24} />
              </div>
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
            <div className="space-y-6 animate-fade-in max-w-5xl mx-auto w-full pb-10">
              <LiveTeacher
  ref={liveTeacherRef}
  contentRef={lessonContentRef}
  chapterTitle={currentChapter?.title || "Live Chapter"}

  course="Python"
  courseId={courseId}
  chapterId={currentChapter?.id || ""}
  userEmail={userEmail}

    activeTopic={currentLesson || undefined}
  allTopics={getLessons()}
  onActiveTopicChange={(topic) => {
    setCurrentLesson((prev) => (prev === topic ? prev : topic));
    const lessons = getLessons();
    const idx = findLessonIndex(lessons, topic);
    if (idx >= 0) {
      setCurrentLessonIndex((prev) => (prev === idx ? prev : idx));
    }
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
      router.push(`/courses/python/chapter/${chapterOrder}/quiz`);
    }
  }}
  onChapterComplete={() => {
    void handleMarkChapterComplete();
  }}

  onExplain={explainLiveTeacherUnit}
  onReteach={reteachLiveTeacherSection}
  onEvaluateCheckpoint={evaluateCheckpointAnswer}
  onReviewWeakSection={(topic: string) => {
    setCurrentLesson(topic);
    const lessons = getLessons();
    const idx = findLessonIndex(lessons, topic);
    if (idx >= 0) setCurrentLessonIndex(idx);
    setTimeout(() => {
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
      const targetEl = headings.find((h) =>
        h.textContent?.trim().toLowerCase().includes(topic.toLowerCase())
      );
      targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }}
  chapterContent={currentChapter?.content || ""}
  autoResumeTopic={autoResumeTopic}
  chapterAnalysis={chapterAnalysis}
  shouldAutoChapterRecap={shouldAutoChapterRecap}
  onResumeRecap={generateResumeRecap}
  onEvaluateResumeAnswer={evaluateResumeAnswer}

  onLessonStart={(title: string) => {
    const lessons = getLessons();
    const matchedIdx = findLessonIndex(lessons, title);
    const lesson = matchedIdx >= 0 ? lessons[matchedIdx] : title;

    if (!lesson) return;

    setCurrentLesson(lesson);
    if (matchedIdx >= 0) setCurrentLessonIndex(matchedIdx);

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
        status: "LEARNING",
      },
    }));

    void saveLessonProgress(lesson, {
      status: "LEARNING",
    });
  }}

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

    setCompletedLessons((prev) => {
      if (prev.includes(lesson)) {
        return prev;
      }
      return [...prev, lesson];
    });

    void saveLessonProgress(lesson, {
      status: calculatedStatus,
      attempts: performance?.attempts || 1,
      correctAnswers: performance?.isCorrect ? 1 : 0,
    });

    // 📝 Persist Completed Topic Note to Learning Notebook
    const topicStudentChats = topicChatMapRef.current[title] || topicChatMapRef.current[lesson] || [];

    const markdownSections: string[] = [
      `# ${title}`,
      ``,
      `**Status**: ✓ Completed`,
      ``,
      `---`,
      ``,
      `### WHAT I LEARNED`,
      sessionData?.whatILearned || `Mastered key concepts in ${title}.`,
      ``,
      `---`,
      ``,
      `### CORE CONCEPTS`,
      ...(sessionData?.coreConcepts && sessionData.coreConcepts.length > 0
        ? sessionData.coreConcepts.map((c) => `• ${c}`)
        : [`• Core principles covered in ${title}`]),
      ``,
      `---`,
      ``,
      `### IMPORTANT POINTS`,
      ...(sessionData?.importantPoints && sessionData.importantPoints.length > 0
        ? sessionData.importantPoints.map((p) => `• ${p}`)
        : [`• Demonstrated understanding of ${title}`]),
      ``,
    ];

    if (sessionData?.examples && sessionData.examples.length > 0) {
      markdownSections.push(
        `---`,
        ``,
        `### EXAMPLES`,
        ...sessionData.examples.map((ex) => `\`\`\`${ex.lang || "python"}\n${ex.code}\n\`\`\``),
        ``
      );
    }

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
        courseId: courseId || "python",
        chapterId: currentChapter?.id || String(chapterOrder),
        topic: title,
        title: title,
        type: "NOTEBOOK",
        content: markdownContent,
        metadata: {
          whatILearned: sessionData?.whatILearned || "",
          coreConcepts: sessionData?.coreConcepts || [],
          importantPoints: sessionData?.importantPoints || [],
          examples: sessionData?.examples || [],
          codeSnippets: sessionData?.codeSnippets || [],
          teacherQuestions: sessionData?.teacherQuestions || [],
          studentQuestions: topicStudentChats,
          diagram: sessionData?.diagram || null,
          understanding: performance?.understanding || "Strong",
          completedAt: new Date().toISOString(),
        },
        structuredContext: {
          courseId: courseId || "python",
          language: "python",
          chapterId: currentChapter?.id || String(chapterOrder),
          chapterTitle: currentChapter?.title,
          chapterOrder,
          topic: title,
          timestamp: new Date().toISOString(),
          whatAITaught: {
            concept: sessionData?.whatILearned || title,
            explanation: sessionData?.whatILearned || markdownContent,
            importantPoints: sessionData?.importantPoints || sessionData?.coreConcepts || [],
            examples: sessionData?.examples || [],
            codeExamples: sessionData?.codeSnippets || [],
          },
          studentInteraction: {
            studentQuestions: topicStudentChats,
          },
          understandingCheck: sessionData?.teacherQuestions?.[0]
            ? {
                aiQuestion: sessionData.teacherQuestions[0].question,
                studentActualAnswer: sessionData.teacherQuestions[0].answer,
                expectedAnswer: sessionData.teacherQuestions[0].whatWasCorrect,
                evaluation: sessionData.teacherQuestions[0].result || "CORRECT",
                score: sessionData.teacherQuestions[0].score ?? 85,
                correctness: performance?.isCorrect ?? true,
                misconception: sessionData.teacherQuestions[0].whatIsMissing || null,
              }
            : undefined,
          learningSignals: {
            strengths: performance?.strengths || sessionData?.importantPoints || [],
            needsSupport: performance?.needsImprovement || [],
            demonstratedUnderstanding: performance?.isCorrect ?? true,
          },
        },
      }),
    }).catch((err) => {
      console.error("Failed to save completed topic note:", err);
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

                  {/* Complete Action at the bottom */}
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
                        onClick={() => router.push(`/courses/python/chapter/${chapterOrder}/quiz`)}
                        className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                      >
                        <HelpCircle size={14} /> Take Chapter Assessment Quiz
                      </button>
                    ) : (
                      <button
                        onClick={handleMarkChapterComplete}
                        disabled={completing}
                        className="px-6 py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 disabled:opacity-55 transition-opacity flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
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
  className={`h-full border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 select-none overflow-hidden bg-slate-50 ${
    rightPanelExpanded ? "w-[460px]" : "w-14"
  }`}
>
  {rightPanelExpanded ? (
    <div className="w-full h-full flex flex-col p-4 gap-4 overflow-hidden bg-slate-50">

      {/* ========================================= */}
      {/* MY LEARNING NOTES */}
      {/* ========================================= */}
      <button
        type="button"
        onClick={() => router.push("/notes?course=python")}
        className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group"
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


      {/* ========================================= */}
      {/* CODEXAI MENTOR */}
      {/* ========================================= */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Mentor Header */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">



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

          {isMentorSpeaking && (
  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
    <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600">
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      AI Teacher is speaking...
    </div>

    <button
      type="button"
      onClick={stopMentorSpeaking}
      className="text-[10px] font-bold text-slate-500 hover:text-red-500"
    >
      Stop
    </button>
  </div>
)}

          

        </div>

        {/* ========================================= */}
{/* CODEXAI MENTOR SCROLL AREA */}
{/* ========================================= */}

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
          message.sender === "user"
            ? "justify-end"
            : "justify-start"
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
        <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-500">
          AI is thinking...
        </div>
      </div>
    )}

  </div>

  {!chatLoading && (
  <button
    type="button"
    onClick={() => {
      liveTeacherRef.current?.resume();
    }}
    className="w-full mt-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
  >
    ▶ Resume Live Teacher
  </button>
)}


  {/* Learning Actions */}
  <div className="p-4">

    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
      How can I help you?
    </p>

    <div className="space-y-2">

      {/* Explain */}
      <button
        type="button"
        onClick={() =>
          handleTeachingRequest(
            "Explain this topic in a simple way.",
            "explain"
          )
        }
        disabled={chatLoading}
        className="w-full text-left px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        💡 Explain this topic
      </button>


      {/* Example */}
      <button
        type="button"
        onClick={() =>
          handleTeachingRequest(
            "Give me a simple example of this topic.",
            "example"
          )
        }
        disabled={chatLoading}
        className="w-full text-left px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        📝 Give me an example
      </button>


      {/* Visual */}
      <button
        type="button"
        onClick={() =>
          handleTeachingRequest(
            "Show me this concept visually. Use a simple flow, diagram, or structured explanation if appropriate.",
            "visual"
          )
        }
        disabled={chatLoading}
        className="w-full text-left px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        🎨 Show me visually
      </button>


      {/* Question */}
      <button
        type="button"
        onClick={() =>
          handleTeachingRequest(
            "Ask me one question about this topic to check my understanding. Do not give me the answer immediately.",
            "question"
          )
        }
        disabled={chatLoading}
        className="w-full text-left px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        ❓ Ask me a question
      </button>


      {/* Confused */}
      <button
        type="button"
        onClick={() =>
          handleTeachingRequest(
            "I'm confused about this topic. Explain it differently using simpler intuition and a small example.",
            "confused"
          )
        }
        disabled={chatLoading}
        className="w-full text-left px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        🤔 I'm confused
      </button>

    </div>


    {/* Current Learning Context */}
    <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100">

      <div className="flex items-center gap-2 mb-1.5">

        <Sparkles
          size={13}
          className="text-blue-600"
        />

        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
          Currently Learning
        </span>

      </div>


      <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
        {currentLesson ||
          currentChapter?.title ||
          `Chapter ${chapterOrder}`}
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

        <span className="text-slate-500">
          Lesson progress
        </span>

        <span className="font-bold text-blue-600">
          {completedLessons.length}/
          {(CHAPTER_SECTIONS[chapterOrder] || []).filter(
            (section) => section !== "Quiz Assessment"
          ).length}
        </span>

      </div>

    </div>

  </div>

</div>


     


        {/* Ask Mentor */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 shrink-0 space-y-2">
          {/* Vision Attachment */}
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
              placeholder={attachedImage ? "Ask about attached image / diagram..." : "Ask about this lesson..."}
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


      {/* ========================================= */}
      {/* COLLAPSE BUTTON */}
      {/* ========================================= */}
      <button
        type="button"
        onClick={() => setRightPanelExpanded(false)}
        className="absolute"
        aria-label="Collapse learning assistant"
      />

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
        language="python"
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

      {/* Interactive Daily Recap Modal (Today's Learning Review) */}
      <DailyRecapModal
        isOpen={dailyRecapOpen}
        onClose={() => setDailyRecapOpen(false)}
        language="python"
        onContinueLearning={() => {}}
        onReviewTodayAgain={(topics) => {
          if (topics && topics.length > 0) {
            const sections = getLessons();
            const idx = sections.indexOf(topics[0]);
            setCurrentLesson(topics[0]);
            if (idx >= 0) setCurrentLessonIndex(idx);
          }
        }}
      />
    </div>
  );
}