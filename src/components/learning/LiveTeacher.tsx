"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Zap,
  Mic,
  MicOff,
  BookOpen,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  MessageSquare,
  Layers,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  TeachingInstruction,
  parseTeachingInstruction,
  ProgrammingLanguage,
  CheckpointEvaluation,
  parseCheckpointEvaluation,
} from "@/types/teaching-types";
import { VisualTeachingRenderer } from "./visuals/VisualTeachingRenderer";
import {
  generateCheckpointQuestionForTopic,
  CHAPTER_RECAP_BANK,
} from "@/lib/recap-bank";
import { ChapterLearningAnalysis } from "@/lib/adaptive/types";
import {
  buildAdaptiveQuickRecap,
  buildAdaptiveChapterRecap,
} from "@/lib/adaptive/teaching-adapter";

export interface SectionPerformance {
  topic: string;
  understanding: "Strong" | "Good" | "Needs Practice" | "Weak";
  strengths: string[];
  needsImprovement: string[];
  recommendation: string;
  attempts: number;
  isCorrect: boolean;
  score?: number;
  reteachCount: number;
  timeSpentSeconds: number;
}

export interface ChapterSummary {
  overallUnderstanding: "Strong" | "Good" | "Needs Practice";
  strongAreas: string[];
  weakAreas: string[];
  masteredCount: number;
  needingPracticeCount: number;
  totalSections: number;
  learningTrend: "Improving 📈" | "Stable ⚡" | "Needs Attention 🎯";
  recommendedNextStep: string;
}

export interface SessionLearningData {
  topic: string;
  explanations: string[];
  whatILearned: string;
  coreConcepts: string[];
  importantPoints: string[];
  examples: Array<{ title: string; lang?: string; code?: string }>;
  codeSnippets: Array<{ title: string; lang?: string; code?: string }>;
  teacherQuestions: Array<{
    question: string;
    answer?: string;
    feedback?: string;
    result?: string;
    score?: number;
    whatWasCorrect?: string;
    whatIsMissing?: string;
  }>;
  diagram?: { title: string; steps: string[] } | null;
  reteachNotes?: string[];
}

interface LiveTeacherProps {
  contentRef: React.RefObject<HTMLElement | null>;
  chapterTitle: string;
  chapterContent: string;
  course: string;
  courseId: string;
  chapterId: string;
  userEmail: string;

  activeTopic?: string;
  activeTopicContent?: string;

  onExplain: (
    content: string,
    title: string,
    learningMemory?: string
  ) => Promise<string>;

  onReteach?: (
    content: string,
    title: string,
    adaptiveContext?: string,
    attemptNumber?: number,
    previousAnswer?: string
  ) => Promise<string>;

  onEvaluateCheckpoint?: (
    question: string,
    answer: string
  ) => Promise<CheckpointEvaluation | {
    result: "CORRECT" | "PARTIAL" | "INCORRECT" | "GOOD" | "WEAK" | "NO_ANSWER";
    feedback: string;
    score?: number;
    whatWasCorrect?: string;
    whatIsMissing?: string;
    appreciation?: string;
    explanation?: string;
  }>;

  onSectionPerformance?: (performance: SectionPerformance) => void;
  onReviewWeakSection?: (topic: string) => void;

  onLessonStart?: (title: string) => void;
  onLessonComplete?: (
    title: string,
    performance?: SectionPerformance,
    sessionData?: SessionLearningData
  ) => void;
  onChapterComplete?: (summary?: ChapterSummary) => void;

  allTopics?: string[];
  isFinalTopic?: boolean;
  onNextTopic?: () => void;
  onActiveTopicChange?: (topic: string) => void;
  onResumeRecap?: (topic: string) => Promise<{ recap: string; questions: string[] } | string>;
  onEvaluateResumeAnswer?: (question: string, answer: string) => Promise<string | boolean>;
  autoResumeTopic?: string;
  chapterAnalysis?: ChapterLearningAnalysis | null;
  shouldAutoChapterRecap?: boolean;
}

export interface LiveTeacherHandle {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

type TeacherState =
  | "IDLE"
  | "READING"
  | "THINKING"
  | "EXPLAINING"
  | "CHECKPOINT"
  | "RETEACHING"
  | "QUICK_RECAP"
  | "CHAPTER_RECAP"
  | "PAUSED"
  | "SECTION_COMPLETED"
  | "COMPLETED";

type UnderstandingStep =
  | "EXPLAINING"
  | "KNOWLEDGE_CHECK"
  | "EVALUATION_RESULT"
  | "ASK_UNDERSTANDING"
  | "RETEACHING"
  | "QUICK_RECAP_CHECK"
  | "CHAPTER_RECAP_CHECK";

export const LiveTeacher = forwardRef<LiveTeacherHandle, LiveTeacherProps>(
  (
    {
      contentRef,
      chapterTitle,
      chapterContent,
      course,
      courseId,
      chapterId,
      userEmail,
      activeTopic,
      onExplain,
      onReteach,
      onEvaluateCheckpoint,
      onSectionPerformance,
      onReviewWeakSection,
      onLessonStart,
      onLessonComplete,
      onChapterComplete,
      allTopics,
      isFinalTopic,
      onNextTopic,
      onActiveTopicChange,
      onResumeRecap,
      onEvaluateResumeAnswer,
      autoResumeTopic,
      chapterAnalysis,
      shouldAutoChapterRecap,
    },
    ref
  ) => {
    // Core Teacher Execution State
    const [state, setState] = useState<TeacherState>("IDLE");
    const [localChapterAnalysis, setLocalChapterAnalysis] = useState<ChapterLearningAnalysis | null>(null);
    const [teacherText, setTeacherText] = useState<string>("");
    const [currentTitle, setCurrentTitle] = useState<string>("");
    const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
    const [speed, setSpeed] = useState<number>(1);

    // Sentence-level Streaming State
    const [currentUnitSentences, setCurrentUnitSentences] = useState<string[]>([]);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
    const [currentInstruction, setCurrentInstruction] = useState<TeachingInstruction | null>(null);

    // Interactive Checkpoint State
    const [understandingStep, setUnderstandingStep] = useState<UnderstandingStep>("EXPLAINING");
    const [checkpointQuestion, setCheckpointQuestion] = useState<string>("");
    const [checkpointAnswer, setCheckpointAnswer] = useState<string>("");
    const [checkpointLoading, setCheckpointLoading] = useState<boolean>(false);
    const [checkpointEvaluation, setCheckpointEvaluation] = useState<CheckpointEvaluation | null>(null);
    const [checkpointError, setCheckpointError] = useState<string | null>(null);
    const [checkpointAttempts, setCheckpointAttempts] = useState<number>(0);
    const [reteachCount, setReteachCount] = useState<number>(0);
    const [isListening, setIsListening] = useState<boolean>(false);

    // Follow-Up State
    const [followUpAnswer, setFollowUpAnswer] = useState<string>("");
    const [followUpLoading, setFollowUpLoading] = useState<boolean>(false);

    // Session Analytics & Summaries
    const [sectionStartTime, setSectionStartTime] = useState<number>(Date.now());
    const [sectionPerformances, setSectionPerformances] = useState<Record<string, SectionPerformance>>({});
    const [currentPerformance, setCurrentPerformance] = useState<SectionPerformance | null>(null);
    const [chapterSummary, setChapterSummary] = useState<ChapterSummary | null>(null);

    // Mutable References for execution flow
    const isMountedRef = useRef<boolean>(true);
    const stopRef = useRef<boolean>(false);
    const pauseRef = useRef<boolean>(false);
    const nextRequestedRef = useRef<boolean>(false);
    const voiceEnabledRef = useRef<boolean>(true);
    const speedRef = useRef<number>(1);
    const speedChangeRequestedRef = useRef<boolean>(false);
    const activeSessionKeyRef = useRef<string>("");
    const checkpointContinueRef = useRef<boolean>(false);
    const hasTriggeredAutoResumeRef = useRef<boolean>(false);
    const hasTriggeredAutoChapterRecapRef = useRef<boolean>(false);
    const isAdvancingRef = useRef<boolean>(false);

    // Safe In-Memory Deduplication & Cache (scoped to course + chapter + topic)
    const topicCacheRef = useRef<Record<string, string>>({});
    const pendingRequestRef = useRef<Record<string, Promise<string>>>({});

    // Elements & UI refs
    const explanationContainerRef = useRef<HTMLDivElement | null>(null);
    const sentenceSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const sessionExplanationsRef = useRef<string[]>([]);
    const sessionCheckpointsRef = useRef<
      Array<{
        question: string;
        answer: string;
        feedback: string;
        result?: string;
        score?: number;
        whatWasCorrect?: string;
        whatIsMissing?: string;
      }>
    >([]);
    const sessionReteachRef = useRef<string[]>([]);

    useEffect(() => {
      isMountedRef.current = true;
      voiceEnabledRef.current = voiceEnabled;
      speedRef.current = speed;
      return () => {
        isMountedRef.current = false;
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      };
    }, [voiceEnabled, speed]);

    // Fast Normalized Topic Extractor from Lesson Source
    const extractTopicSourceContent = (topicName: string): string => {
      if (!chapterContent?.trim()) return "";
      const source = chapterContent.trim();
      const normTopic = topicName.replace(/^[\d\.\-\s:]+/, "").trim().toLowerCase();

      let idx = source.toLowerCase().indexOf(topicName.toLowerCase());
      if (idx === -1) {
        idx = source.toLowerCase().indexOf(normTopic);
      }
      if (idx === -1) {
        return source.slice(0, 1500);
      }

      const afterTopic = source.slice(idx);
      const nextHeadingMatch = afterTopic.slice(topicName.length).match(/\n#{1,4}\s+.+/m);
      if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
        return afterTopic.slice(0, topicName.length + nextHeadingMatch.index).trim();
      }
      return afterTopic.slice(0, 1800).trim();
    };

    // Fast Cached Topic Explanation Fetcher (Single optimized request per topic)
    const getFastTopicExplanation = async (
      topicName: string,
      sessionKey: string
    ): Promise<string> => {
      const cacheKey = `${course || "course"}_${chapterTitle || "chapter"}_${topicName}`.toLowerCase();

      const cached = topicCacheRef.current[cacheKey];
      if (typeof cached === "string" && cached.length > 0) {
        return cached;
      }

      const pending = pendingRequestRef.current[cacheKey];
      if (pending) {
        return pending;
      }

      const topicContent = extractTopicSourceContent(topicName);
      const requestPromise = (async () => {
        try {
          const explanation = await onExplain(
            topicContent,
            topicName,
            `COURSE: ${course}\nCHAPTER: ${chapterTitle}`
          );
          if (explanation && explanation.trim()) {
            topicCacheRef.current[cacheKey] = explanation;
          }
          return explanation || `Let's understand ${topicName} step by step.`;
        } catch (err) {
          console.error("Live teacher explanation fetch error:", err);
          return `Let's break down ${topicName} with a clear practical example.`;
        } finally {
          delete pendingRequestRef.current[cacheKey];
        }
      })();

      pendingRequestRef.current[cacheKey] = requestPromise;
      return requestPromise;
    };

    // --------------------------------------------------
    // Speech & Text Splitting & Synchronized Speaking
    // --------------------------------------------------
    const splitIntoSentences = (text: string): string[] => {
      if (!text?.trim()) return [];
      const clean = text.trim();
      const raw = clean.match(/[^.!?\n]+[.!?]+(?:\s+|\n+|$)|[^.!?\n]+(?:\n+|$)/g);
      if (!raw || raw.length === 0) return [clean];
      return raw.map((s) => s.trim()).filter(Boolean);
    };

    const speakSentenceAuthoritative = (sentenceText: string, sessionKey: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (
          stopRef.current ||
          !isMountedRef.current ||
          nextRequestedRef.current ||
          activeSessionKeyRef.current !== sessionKey
        ) {
          resolve(false);
          return;
        }

        const cleanText = sentenceText
          .replace(/```[\s\S]*?```/g, "code example")
          .replace(/[#*_>`]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (!cleanText) {
          resolve(true);
          return;
        }

        if (
          !voiceEnabledRef.current ||
          typeof window === "undefined" ||
          !("speechSynthesis" in window)
        ) {
          const readTime = Math.min(3500, Math.max(1200, (cleanText.length * 45) / (speedRef.current || 1)));
          setTimeout(() => resolve(true), readTime);
          return;
        }

        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = "en-US";
          utterance.rate = Math.min(2, Math.max(0.5, speedRef.current || 1));
          utterance.pitch = 1.0;

          utterance.onend = () => resolve(true);
          utterance.onerror = (e) => {
            if (e.error === "interrupted" || e.error === "canceled") {
              resolve(false);
            } else {
              resolve(true);
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          resolve(true);
        }
      });
    };

    const deliverExplanation = async (
      explanationText: string,
      sessionKey: string
    ): Promise<boolean> => {
      const sentences = splitIntoSentences(explanationText);
      if (sentences.length === 0) return true;

      setCurrentUnitSentences(sentences);
      setActiveSentenceIndex(-1);
      sentenceSpanRefs.current = [];

      let sIdx = 0;
      while (sIdx < sentences.length) {
        if (
          stopRef.current ||
          !isMountedRef.current ||
          nextRequestedRef.current ||
          activeSessionKeyRef.current !== sessionKey
        ) {
          return false;
        }

        while (
          pauseRef.current &&
          !stopRef.current &&
          isMountedRef.current &&
          !nextRequestedRef.current &&
          activeSessionKeyRef.current === sessionKey
        ) {
          await new Promise((r) => setTimeout(r, 100));
        }

        if (
          stopRef.current ||
          !isMountedRef.current ||
          nextRequestedRef.current ||
          activeSessionKeyRef.current !== sessionKey
        ) {
          return false;
        }

        const sentence = sentences[sIdx];

        if (isMountedRef.current) {
          setActiveSentenceIndex(sIdx);
        }

        setTimeout(() => {
          if (!isMountedRef.current) return;
          const container = explanationContainerRef.current;
          const activeEl = sentenceSpanRefs.current[sIdx];
          if (container && activeEl) {
            const containerRect = container.getBoundingClientRect();
            const elRect = activeEl.getBoundingClientRect();
            const relTop = elRect.top - containerRect.top + container.scrollTop;
            container.scrollTo({
              top: Math.max(0, relTop - container.clientHeight / 2 + elRect.height / 2),
              behavior: "smooth",
            });
          }
        }, 30);

        speedChangeRequestedRef.current = false;
        const ok = await speakSentenceAuthoritative(sentence, sessionKey);

        if (speedChangeRequestedRef.current) {
          speedChangeRequestedRef.current = false;
          continue;
        }

        if (
          !ok ||
          stopRef.current ||
          !isMountedRef.current ||
          nextRequestedRef.current ||
          activeSessionKeyRef.current !== sessionKey
        ) {
          return false;
        }

        sIdx++;

        if (
          sIdx < sentences.length &&
          !stopRef.current &&
          isMountedRef.current &&
          !nextRequestedRef.current &&
          activeSessionKeyRef.current === sessionKey
        ) {
          const pauseDelay = Math.max(50, Math.round(150 / (speedRef.current || 1)));
          await new Promise((r) => setTimeout(r, pauseDelay));
        }
      }

      setActiveSentenceIndex(sentences.length);
      return true;
    };

    const speakText = (text: string) => {
      if (
        !voiceEnabledRef.current ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        return;
      }
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, "").replace(/[#*_>`]/g, "").trim();
      if (!clean) return;
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "en-US";
      utterance.rate = Math.min(2, Math.max(0.5, speedRef.current || 1));
      window.speechSynthesis.speak(utterance);
    };

    // --------------------------------------------------
    // Highlight Target Topic in DOM
    // --------------------------------------------------
    const clearHighlight = () => {
      document.querySelectorAll("[data-live-teacher-active='true']").forEach((node) => {
        const el = node as HTMLElement;
        el.removeAttribute("data-live-teacher-active");
        el.style.removeProperty("outline");
        el.style.removeProperty("box-shadow");
        el.style.removeProperty("border-radius");
        el.style.removeProperty("transition");
        el.style.removeProperty("background-color");
      });
    };

    const highlightTopicElement = (topicName: string) => {
      clearHighlight();
      const root = contentRef.current;
      if (!root) return;

      const allHeadings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")) as HTMLElement[];
      const target = topicName.trim().toLowerCase();
      const normTarget = target.replace(/^[0-9]+[.\s\-)]*/, "").replace(/[^a-z0-9]/g, "").trim();

      const matchedHeading = allHeadings.find((h) => {
        const text = h.textContent?.trim().toLowerCase() || "";
        if (text === target) return true;
        const normH = text.replace(/^[0-9]+[.\s\-)]*/, "").replace(/[^a-z0-9]/g, "").trim();
        return normH && normTarget && (normH === normTarget || normH.includes(normTarget) || normTarget.includes(normH));
      });

      if (matchedHeading) {
        matchedHeading.scrollIntoView({ behavior: "smooth", block: "center" });
        matchedHeading.setAttribute("data-live-teacher-active", "true");
        matchedHeading.style.transition = "all 0.3s ease";
        matchedHeading.style.outline = "3px solid rgba(59,130,246,0.65)";
        matchedHeading.style.boxShadow = "0 0 0 8px rgba(59,130,246,0.12)";
        matchedHeading.style.borderRadius = "8px";
        matchedHeading.style.backgroundColor = "rgba(59,130,246,0.06)";
      }
    };

    // --------------------------------------------------
    // Speech Recognition (Real Student Voice Input)
    // --------------------------------------------------
    const toggleSpeechInput = () => {
      if (typeof window === "undefined") return;
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser. Please type your answer.");
        return;
      }

      if (isListening) {
        setIsListening(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setCheckpointAnswer((prev) =>
            prev ? `${prev} ${transcript.trim()}` : transcript.trim()
          );
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch (err) {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      }
    };

    // --------------------------------------------------
    // Intelligent Understanding Checkpoint Evaluator
    // --------------------------------------------------
    const submitCheckpointAnswer = async () => {
      const answer = checkpointAnswer.trim();
      if (!answer || checkpointLoading) return;

      setCheckpointLoading(true);
      setCheckpointError(null);
      setCheckpointAttempts((prev) => prev + 1);

      try {
        let evalResult: CheckpointEvaluation;

        if (onEvaluateCheckpoint) {
          const raw = await onEvaluateCheckpoint(checkpointQuestion, answer);
          if (typeof raw === "object" && "score" in raw && typeof (raw as any).score === "number") {
            evalResult = raw as CheckpointEvaluation;
          } else {
            const rawText = (raw as any).feedback || "";
            evalResult = parseCheckpointEvaluation(rawText, checkpointQuestion, answer);
          }
        } else {
          evalResult = parseCheckpointEvaluation("", checkpointQuestion, answer);
        }

        setCheckpointEvaluation(evalResult);
        setUnderstandingStep("ASK_UNDERSTANDING");

        // Record for Notes Notebook
        sessionCheckpointsRef.current.push({
          question: checkpointQuestion,
          answer: answer,
          feedback: evalResult.feedback,
          result: evalResult.result,
          score: evalResult.score,
          whatWasCorrect: evalResult.whatWasCorrect,
          whatIsMissing: evalResult.whatIsMissing,
        });

        // Feed Learning Evidence into Knowledge Graph
        if (userEmail) {
          void fetch("/api/knowledge-graph/evidence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail,
              course: (course || "python").toLowerCase(),
              chapterId: chapterId || "general",
              topic: activeTopic || currentTitle,
              source: "CHECKPOINT",
              score: evalResult.score,
              summary: `${evalResult.appreciation} ${evalResult.feedback}`,
              mistakes: evalResult.whatIsMissing ? [evalResult.whatIsMissing] : [],
              question: checkpointQuestion,
              answer,
            }),
          }).catch((err) => console.error("Knowledge Graph checkpoint evidence error:", err));
        }

        if (evalResult.understood) {
          speakText(`${evalResult.appreciation} ${evalResult.feedback} You have understood this topic! Click continue to proceed.`);
        } else {
          speakText(`${evalResult.appreciation} ${evalResult.feedback} Click teach again to review with a simpler explanation.`);
        }
      } catch (error) {
        console.error("Checkpoint evaluation error:", error);
        setCheckpointError("I couldn't check your answer right now. Please check your connection and click retry.");
      } finally {
        setCheckpointLoading(false);
      }
    };

    // Follow-Up Answer Evaluator
    const submitFollowUpAnswer = async () => {
      const answer = followUpAnswer.trim();
      if (!answer || followUpLoading || !checkpointEvaluation?.followUpQuestion) return;

      setFollowUpLoading(true);
      try {
        let evalResult: CheckpointEvaluation;
        if (onEvaluateCheckpoint) {
          const raw = await onEvaluateCheckpoint(checkpointEvaluation.followUpQuestion, answer);
          if (typeof raw === "object" && "score" in raw && typeof (raw as any).score === "number") {
            evalResult = raw as CheckpointEvaluation;
          } else {
            evalResult = parseCheckpointEvaluation((raw as any).feedback || "", checkpointEvaluation.followUpQuestion, answer);
          }
        } else {
          evalResult = parseCheckpointEvaluation("", checkpointEvaluation.followUpQuestion, answer);
        }

        setCheckpointEvaluation(evalResult);
        sessionCheckpointsRef.current.push({
          question: checkpointEvaluation.followUpQuestion,
          answer: answer,
          feedback: evalResult.feedback,
          result: evalResult.result,
          score: evalResult.score,
        });

        // Feed Learning Evidence into Knowledge Graph
        if (userEmail) {
          void fetch("/api/knowledge-graph/evidence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail,
              course: (course || "python").toLowerCase(),
              chapterId: chapterId || "general",
              topic: activeTopic || currentTitle,
              source: "CHECKPOINT",
              score: evalResult.score,
              summary: `${evalResult.appreciation} ${evalResult.feedback}`,
              question: checkpointEvaluation.followUpQuestion,
              answer,
            }),
          }).catch((err) => console.error("Knowledge Graph follow-up evidence error:", err));
        }

        speakText(`${evalResult.appreciation} ${evalResult.feedback}`);
      } catch (err) {
        console.error("Follow-up evaluation error:", err);
      } finally {
        setFollowUpLoading(false);
      }
    };

    const handleUserUnderstandsYes = () => {
      if (state === "QUICK_RECAP" || state === "CHAPTER_RECAP") {
        if (typeof window !== "undefined") {
          const recapKey = `ksai_quick_recap_${userEmail}_${(course || "python").toLowerCase()}_${chapterId}_${activeTopic || currentTitle}`;
          sessionStorage.setItem(recapKey, "done");
        }
        setUnderstandingStep("EXPLAINING");
        checkpointContinueRef.current = true;
        return;
      }

      setUnderstandingStep("EXPLAINING");
      checkpointContinueRef.current = true;

      const topicTitle = activeTopic || currentTitle || "Current Topic";
      completeAndAdvanceTopic(topicTitle);
    };

    const handleReteachAgain = async () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const topicTitle = activeTopic || currentTitle || "Current Topic";
      const sessionKey = `${course || "course"}_${chapterTitle || "chapter"}_${topicTitle}_reteach_${Date.now()}`;
      activeSessionKeyRef.current = sessionKey;

      const newReteachCount = reteachCount + 1;
      setReteachCount(newReteachCount);
      const attemptNum = newReteachCount + 1; // Attempt 2, 3, 4+

      setState("RETEACHING");
      setUnderstandingStep("RETEACHING");
      setCurrentUnitSentences([]);
      setActiveSentenceIndex(-1);
      checkpointContinueRef.current = false;

      const sourceContent = extractTopicSourceContent(topicTitle);

      try {
        let simplifiedExplanation = "";
        if (onReteach) {
          const misconceptionText = checkpointEvaluation?.misconceptions && checkpointEvaluation.misconceptions.length > 0
            ? `Specific Misconception to Correct: ${checkpointEvaluation.misconceptions.join("; ")}`
            : "";
          const adaptiveContext = [
            misconceptionText,
            checkpointEvaluation?.whatIsMissing ? `Student struggled with: ${checkpointEvaluation.whatIsMissing}` : "",
            checkpointEvaluation?.feedback || "",
          ].filter(Boolean).join(". ");
          simplifiedExplanation = await onReteach(
            sourceContent,
            topicTitle,
            adaptiveContext,
            attemptNum,
            checkpointAnswer
          );
        } else {
          simplifiedExplanation = `Let's make ${topicTitle} super simple.\n\nThink of it from first principles: step by step with a concrete example, everything connects easily!`;
        }

        if (activeSessionKeyRef.current !== sessionKey) return;
        setTeacherText(simplifiedExplanation);
        sessionReteachRef.current.push(simplifiedExplanation);
        sessionExplanationsRef.current.push(simplifiedExplanation);
        await deliverExplanation(simplifiedExplanation, sessionKey);

        if (activeSessionKeyRef.current !== sessionKey) return;

        // Ask a NEW, simpler understanding-check question!
        const newSimplerQuestion = generateCheckpointQuestionForTopic(
          course || "python",
          topicTitle,
          attemptNum
        );
        setCheckpointQuestion(newSimplerQuestion);
        setCheckpointAnswer("");
        setCheckpointEvaluation(null);
        setCheckpointError(null);
        setFollowUpAnswer("");
        setState("CHECKPOINT");
        setUnderstandingStep("KNOWLEDGE_CHECK");
        speakText(`Let's check with a simpler question: ${newSimplerQuestion}`);
      } catch (err) {
        console.error("Reteach error:", err);
        if (activeSessionKeyRef.current !== sessionKey) return;
        const fallback = `Let's trace ${topicTitle} with a clear intuition and example.`;
        setTeacherText(fallback);
        await deliverExplanation(fallback, sessionKey);
        const newSimplerQuestion = generateCheckpointQuestionForTopic(
          course || "python",
          topicTitle,
          attemptNum
        );
        setCheckpointQuestion(newSimplerQuestion);
        setCheckpointAnswer("");
        setCheckpointEvaluation(null);
        setCheckpointError(null);
        setFollowUpAnswer("");
        setState("CHECKPOINT");
        setUnderstandingStep("KNOWLEDGE_CHECK");
      }
    };

    // --------------------------------------------------
    // Performance and Chapter Evaluation
    // --------------------------------------------------
    const evaluateSectionPerformance = (topicTitle: string): SectionPerformance => {
      const timeSpent = Math.round((Date.now() - sectionStartTime) / 1000);
      const score = checkpointEvaluation?.score ?? 85;
      const isCorrect = score >= 70;

      let understanding: "Strong" | "Good" | "Needs Practice" | "Weak" = "Strong";
      if (score >= 90) understanding = "Strong";
      else if (score >= 70) understanding = "Good";
      else if (score >= 50) understanding = "Needs Practice";
      else understanding = "Weak";

      const strengths = [
        `Mastered core concepts of ${topicTitle}`,
        checkpointEvaluation?.whatWasCorrect
          ? checkpointEvaluation.whatWasCorrect
          : "Demonstrated accurate conceptual understanding in checkpoint evaluation",
      ];

      const needsImprovement =
        checkpointEvaluation?.whatIsMissing
          ? [checkpointEvaluation.whatIsMissing]
          : understanding === "Needs Practice" || understanding === "Weak"
          ? [`Review deeper step-by-step logic in ${topicTitle}`]
          : [];

      const recommendation =
        understanding === "Strong"
          ? "Mastered! Ready to advance to the next topic."
          : understanding === "Good"
          ? "Good progress! Continue to next section."
          : "Consider a quick review before taking the chapter quiz.";

      const perf: SectionPerformance = {
        topic: topicTitle,
        understanding,
        strengths,
        needsImprovement,
        recommendation,
        attempts: Math.max(1, checkpointAttempts),
        isCorrect,
        score,
        reteachCount,
        timeSpentSeconds: timeSpent,
      };

      setSectionPerformances((prev) => ({ ...prev, [topicTitle]: perf }));
      setCurrentPerformance(perf);
      onSectionPerformance?.(perf);
      return perf;
    };

    const computeChapterSummary = (
      allPerfs: Record<string, SectionPerformance>
    ): ChapterSummary => {
      const perfsList = Object.values(allPerfs);
      const totalSections = allTopics && allTopics.length > 0 ? allTopics.length : perfsList.length || 1;

      const strongAreas = perfsList
        .filter((p) => p.understanding === "Strong" || p.understanding === "Good")
        .map((p) => p.topic);

      const weakAreas = perfsList
        .filter((p) => p.understanding === "Needs Practice" || p.understanding === "Weak")
        .map((p) => p.topic);

      const masteredCount = strongAreas.length;
      const needingPracticeCount = weakAreas.length;

      let overallUnderstanding: "Strong" | "Good" | "Needs Practice" = "Strong";
      if (needingPracticeCount >= 2 || masteredCount < totalSections * 0.5) {
        overallUnderstanding = "Needs Practice";
      } else if (needingPracticeCount > 0) {
        overallUnderstanding = "Good";
      }

      return {
        overallUnderstanding,
        strongAreas,
        weakAreas,
        masteredCount,
        needingPracticeCount,
        totalSections,
        learningTrend: needingPracticeCount === 0 ? "Improving 📈" : "Stable ⚡",
        recommendedNextStep:
          weakAreas.length > 0
            ? "Review weak areas before starting the Chapter Assessment Quiz."
            : "Mastered all topics! Ready for the Chapter Assessment Quiz.",
      };
    };

    // --------------------------------------------------
    // AUTOMATIC QUICK RECAP FLOW
    // --------------------------------------------------
    const executeQuickRecap = async (resumeTopicTitle: string) => {
      if (!isMountedRef.current) return;
      const sessionKey = `${course}_quick_recap_${resumeTopicTitle}_${Date.now()}`;
      activeSessionKeyRef.current = sessionKey;

      setState("QUICK_RECAP");
      setUnderstandingStep("QUICK_RECAP_CHECK");
      setCurrentTitle(`Resume Checkpoint: ${resumeTopicTitle}`);

      let recapText = "";
      let recapQuestion = "";

      if (onResumeRecap) {
        try {
          const res = await onResumeRecap(resumeTopicTitle);
          if (typeof res === "object" && res.recap) {
            recapText = res.recap;
            if (res.questions && res.questions.length > 0) {
              recapQuestion = res.questions[0];
            }
          } else if (typeof res === "string" && res) {
            recapText = res;
          }
        } catch (e) {
          console.error("Resume recap error:", e);
        }
      }

      // If no custom resume recap was provided, generate adaptive quick recap from student's profile
      if (!recapText || !recapQuestion) {
        try {
          const profRes = await fetch(
            `/api/adaptive/profile?course=${encodeURIComponent(course || "python")}&topic=${encodeURIComponent(resumeTopicTitle)}&userEmail=${encodeURIComponent(userEmail || "")}`
          );
          const profData = await profRes.json();
          const profile = profData?.profile || null;

          const adapted = buildAdaptiveQuickRecap({
            topic: resumeTopicTitle,
            course: course || "python",
            chapterTitle,
            profile,
          });
          recapText = adapted.recapText;
          recapQuestion = adapted.question;
        } catch {
          recapText = `Welcome back! You were learning ${resumeTopicTitle}. Let's quickly review where you left off.`;
          recapQuestion = `What is the key takeaway from ${resumeTopicTitle}?`;
        }
      }

      setTeacherText(recapText);
      await deliverExplanation(recapText, sessionKey);

      if (activeSessionKeyRef.current !== sessionKey || stopRef.current) return;

      // Ask recap checkpoint question
      setCheckpointQuestion(recapQuestion);
      setCheckpointAnswer("");
      setCheckpointEvaluation(null);
      setCheckpointError(null);
      speakText(`Let's check what you remember before we continue: ${recapQuestion}`);

      // Wait for real student answer
      checkpointContinueRef.current = false;
      while (
        !checkpointContinueRef.current &&
        !stopRef.current &&
        isMountedRef.current &&
        activeSessionKeyRef.current === sessionKey
      ) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (activeSessionKeyRef.current !== sessionKey || stopRef.current) return;

      if (typeof window !== "undefined" && userEmail && chapterId && resumeTopicTitle) {
        try {
          sessionStorage.setItem(
            `ksai_quick_recap_${userEmail}_${(course || "python").toLowerCase()}_${chapterId}_${resumeTopicTitle}`,
            "done"
          );
        } catch {}
      }

      // Transition to normal teaching of the current topic
      setState("IDLE");
      void startTeaching();
    };

    // --------------------------------------------------
    // AUTOMATIC CHAPTER RECAP FLOW
    // --------------------------------------------------
    const executeChapterRecap = async () => {
      if (!isMountedRef.current) return;
      const sessionKey = `${course}_chapter_recap_${chapterTitle}_${Date.now()}`;
      activeSessionKeyRef.current = sessionKey;

      setState("CHAPTER_RECAP");
      setUnderstandingStep("CHAPTER_RECAP_CHECK");
      setCurrentTitle(`Chapter Learning Analysis & Recap: ${chapterTitle}`);

      let analysis = chapterAnalysis || localChapterAnalysis;
      if (!analysis && userEmail && chapterId) {
        try {
          const res = await fetch("/api/adaptive/chapter-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course,
              chapterId,
              chapterTitle,
              lessons: allTopics || [],
              userEmail,
            }),
          });
          const data = await res.json();
          if (data?.success && data?.analysis) {
            analysis = data.analysis;
            setLocalChapterAnalysis(data.analysis);
          }
        } catch (err) {
          console.warn("Fetch chapter analysis notice:", err);
        }
      }

      let recapText = "";
      let q = "";

      if (analysis) {
        const recapObj = buildAdaptiveChapterRecap({
          chapterTitle: chapterTitle || "Chapter Overview",
          course: course || "python",
          analysis,
        });
        recapText = recapObj.recapText;
        q = recapObj.question;
      } else {
        const langKey = (course || "python").toLowerCase();
        const orderNum = parseInt(chapterId.replace(/[^0-9]/g, ""), 10) || 0;
        const bankData = CHAPTER_RECAP_BANK[langKey]?.[orderNum];
        recapText =
          bankData?.summary ||
          `Congratulations on completing all topics in ${chapterTitle}! Let's do a brief recap of key principles and syntax before your assessment.`;
        q =
          bankData?.revisionPoints?.[0] ||
          `How do the concepts in ${chapterTitle} connect together to solve real problems?`;
      }

      setTeacherText(recapText);
      await deliverExplanation(recapText, sessionKey);

      if (activeSessionKeyRef.current !== sessionKey || stopRef.current) return;

      setCheckpointQuestion(q);
      setCheckpointAnswer("");
      setCheckpointEvaluation(null);
      setCheckpointError(null);
      speakText(`Chapter check: ${q}`);

      checkpointContinueRef.current = false;
      while (
        !checkpointContinueRef.current &&
        !stopRef.current &&
        isMountedRef.current &&
        activeSessionKeyRef.current === sessionKey
      ) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (activeSessionKeyRef.current !== sessionKey || stopRef.current) return;

      // Final complete state: save to sessionStorage and persist to Server DB
      if (typeof window !== "undefined" && userEmail && chapterId) {
        try {
          sessionStorage.setItem(
            `ksai_chapter_recap_${userEmail}_${(course || "python").toLowerCase()}_${chapterId}`,
            "done"
          );
        } catch {}
      }

      // Persist Chapter Recap to Server DB
      try {
        await fetch("/api/recap/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: (course || "python").toLowerCase(),
            chapterId,
            summary: recapText || `Chapter Recap for ${chapterTitle}`,
            keyConcepts: analysis?.strongTopics?.map((t) => t.topic) || [],
            understandingDecision: "READY_FOR_QUIZ",
          }),
        });
      } catch (err) {
        console.warn("Failed to persist chapter recap to server DB:", err);
      }

      setState("COMPLETED");
      const summary = computeChapterSummary(sectionPerformances);
      setChapterSummary(summary);
      onChapterComplete?.(summary);
    };

    // --------------------------------------------------
    // Complete Current Topic and Advance to Next Topic
    // --------------------------------------------------
    function completeAndAdvanceTopic(topicTitle: string) {
      if (isAdvancingRef.current) return;
      isAdvancingRef.current = true;

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      clearHighlight();

      // Evaluate performance
      const perf = evaluateSectionPerformance(topicTitle);

      const sessionLearningData: SessionLearningData = {
        topic: topicTitle,
        explanations: sessionExplanationsRef.current,
        whatILearned: sessionExplanationsRef.current.join("\n\n") || teacherText,
        coreConcepts: [topicTitle],
        importantPoints: perf.strengths || [],
        examples: [],
        codeSnippets: [],
        teacherQuestions: sessionCheckpointsRef.current.map((c) => ({
          question: c.question,
          answer: c.answer,
          feedback: c.feedback,
          result: c.result,
          score: c.score,
          whatWasCorrect: c.whatWasCorrect,
          whatIsMissing: c.whatIsMissing,
        })),
        reteachNotes: sessionReteachRef.current,
      };

      onLessonComplete?.(topicTitle, perf, sessionLearningData);

      // Check if this was the last topic in the chapter
      const topicIndex = allTopics && allTopics.length > 0
        ? allTopics.findIndex((t) => {
            const nt = t.trim().toLowerCase();
            const ntt = topicTitle.trim().toLowerCase();
            if (nt === ntt) return true;
            const c1 = nt.replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "").trim();
            const c2 = ntt.replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "").trim();
            return Boolean(c1 && c2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1)));
          })
        : -1;

      const isLast = Boolean(
        isFinalTopic ||
        (allTopics && allTopics.length > 0 && topicIndex === allTopics.length - 1)
      );

      if (isLast) {
        void executeChapterRecap();
      } else {
        setState("IDLE");
        setTeacherText("");
        setCheckpointQuestion("");
        setCheckpointAnswer("");
        setCheckpointEvaluation(null);
        setCheckpointError(null);
        setFollowUpAnswer("");
        onNextTopic?.();
      }

      setTimeout(() => {
        isAdvancingRef.current = false;
      }, 500);
    }

    // --------------------------------------------------
    // Core Topic Teaching Execution (Optimized, Single-Request)
    // --------------------------------------------------
    const startTeaching = async () => {
      if (!isMountedRef.current) return;

      const topicTitle = activeTopic || (allTopics && allTopics[0]) || chapterTitle || "Core Concept";
      const sessionKey = `${course}_${chapterTitle}_${topicTitle}_${Date.now()}`;
      activeSessionKeyRef.current = sessionKey;

      stopRef.current = false;
      pauseRef.current = false;
      nextRequestedRef.current = false;
      checkpointContinueRef.current = false;

      sessionExplanationsRef.current = [];
      sessionCheckpointsRef.current = [];
      sessionReteachRef.current = [];

      setCurrentUnitSentences([]);
      setActiveSentenceIndex(-1);
      setTeacherText("");
      setCurrentTitle(topicTitle);
      setSectionStartTime(Date.now());
      setCheckpointAttempts(0);
      setReteachCount(0);
      setCheckpointEvaluation(null);
      setCheckpointError(null);

      onLessonStart?.(topicTitle);
      highlightTopicElement(topicTitle);

      // STEP 1: Fast Single-Request AI Explanation
      setState("THINKING");
      const explanation = await getFastTopicExplanation(topicTitle, sessionKey);
      if (stopRef.current || !isMountedRef.current || activeSessionKeyRef.current !== sessionKey) return;

      const courseLang = (course || "general").toLowerCase() as ProgrammingLanguage;
      const parsedInstruction = parseTeachingInstruction(explanation, topicTitle, courseLang, "BEGINNER");
      setCurrentInstruction(parsedInstruction);

      // STEP 2: Spoken Teaching with Synchronous Visuals & Highlighting
      setState("EXPLAINING");
      setTeacherText(parsedInstruction.spokenExplanation);
      sessionExplanationsRef.current.push(parsedInstruction.spokenExplanation);

      const delivered = await deliverExplanation(parsedInstruction.spokenExplanation, sessionKey);
      if (!delivered || stopRef.current || !isMountedRef.current || activeSessionKeyRef.current !== sessionKey) {
        return;
      }

      // STEP 3: Mandatory Interactive Understanding Checkpoint
      setState("CHECKPOINT");
      setUnderstandingStep("KNOWLEDGE_CHECK");
      const q = generateCheckpointQuestionForTopic(course || "python", topicTitle, 1);
      setCheckpointQuestion(q);
      setCheckpointAnswer("");
      setCheckpointEvaluation(null);
      setCheckpointError(null);
      speakText(`Let's check your understanding. ${q}`);

      // Wait for student's real answer and understanding confirmation
      checkpointContinueRef.current = false;
      while (
        !checkpointContinueRef.current &&
        !stopRef.current &&
        isMountedRef.current &&
        activeSessionKeyRef.current === sessionKey
      ) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (stopRef.current || !isMountedRef.current || activeSessionKeyRef.current !== sessionKey) return;

      clearHighlight();
      completeAndAdvanceTopic(topicTitle);
    };

    // Auto-start teaching on topic change
    const prevActiveTopicRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (activeTopic && prevActiveTopicRef.current && prevActiveTopicRef.current !== activeTopic) {
        stopRef.current = true;
        activeSessionKeyRef.current = "";
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        clearHighlight();
        setCurrentUnitSentences([]);
        setActiveSentenceIndex(-1);
        setTeacherText("");
        setUnderstandingStep("EXPLAINING");

        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            stopRef.current = false;
            void startTeaching();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
      prevActiveTopicRef.current = activeTopic;
    }, [activeTopic]);

    // Auto-trigger Quick Recap if returning to previous learning point
    useEffect(() => {
      if (
        autoResumeTopic &&
        !hasTriggeredAutoResumeRef.current &&
        allTopics &&
        allTopics.length > 0
      ) {
        hasTriggeredAutoResumeRef.current = true;
        const timer = setTimeout(() => {
          if (isMountedRef.current && (state === "IDLE" || state === "EXPLAINING")) {
            void executeQuickRecap(autoResumeTopic);
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    }, [autoResumeTopic, allTopics, state]);

    // Auto-trigger Chapter Recap if whole chapter is genuinely completed
    useEffect(() => {
      if (
        shouldAutoChapterRecap &&
        !hasTriggeredAutoChapterRecapRef.current &&
        allTopics &&
        allTopics.length > 0
      ) {
        hasTriggeredAutoChapterRecapRef.current = true;
        const timer = setTimeout(() => {
          if (isMountedRef.current && (state === "IDLE" || state === "EXPLAINING")) {
            void executeChapterRecap();
          }
        }, 250);
        return () => clearTimeout(timer);
      }
    }, [shouldAutoChapterRecap, allTopics, state]);

    // Imperative methods for external controls
    useImperativeHandle(ref, () => ({
      pause: () => {
        pauseRef.current = true;
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.pause();
        }
        setState("PAUSED");
      },
      resume: () => {
        pauseRef.current = false;
        if (voiceEnabledRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.resume();
        }
        setState("EXPLAINING");
      },
      stop: () => {
        stopRef.current = true;
        pauseRef.current = false;
        activeSessionKeyRef.current = "";
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        clearHighlight();
        setState("IDLE");
        setUnderstandingStep("EXPLAINING");
        setCurrentUnitSentences([]);
        setActiveSentenceIndex(-1);
        setTeacherText("");
      },
    }));

    const togglePlayPause = () => {
      if (state === "PAUSED") {
        pauseRef.current = false;
        if (voiceEnabledRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.resume();
        }
        setState("EXPLAINING");
      } else if (state === "EXPLAINING" || state === "READING") {
        pauseRef.current = true;
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.pause();
        }
        setState("PAUSED");
      } else if (state === "IDLE") {
        void startTeaching();
      }
    };

    const handleReplayUnit = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      activeSessionKeyRef.current = "";
      setTimeout(() => {
        void startTeaching();
      }, 50);
    };

    const handleStopTeaching = () => {
      stopRef.current = true;
      pauseRef.current = false;
      activeSessionKeyRef.current = "";
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      clearHighlight();
      setState("IDLE");
      setUnderstandingStep("EXPLAINING");
      setCurrentUnitSentences([]);
      setActiveSentenceIndex(-1);
      setTeacherText("");
    };

    const toggleVoice = () => {
      setVoiceEnabled((prev) => {
        const next = !prev;
        voiceEnabledRef.current = next;
        if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        return next;
      });
    };

    const cycleSpeed = () => {
      const speeds = [0.75, 1, 1.25, 1.5];
      const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
      const nextSpeed = speeds[nextIdx];
      setSpeed(nextSpeed);
      speedRef.current = nextSpeed;
      speedChangeRequestedRef.current = true;
    };

    const isRunning =
      state === "READING" ||
      state === "THINKING" ||
      state === "EXPLAINING" ||
      state === "CHECKPOINT" ||
      state === "RETEACHING" ||
      state === "QUICK_RECAP" ||
      state === "CHAPTER_RECAP" ||
      state === "PAUSED";

    const displayedTopic =
      activeTopic || currentTitle || (allTopics && allTopics[0]) || chapterTitle || "Interactive Learning";

    const score = checkpointEvaluation?.score ?? 0;
    const scoreColor =
      score >= 90
        ? "bg-emerald-500 text-white"
        : score >= 70
        ? "bg-blue-500 text-white"
        : score >= 50
        ? "bg-amber-500 text-white"
        : "bg-red-500 text-white";

    return (
      <div className="w-full transition-all duration-300 sticky top-0 z-20 pt-1 pb-3">
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-base border border-white/20 shadow-inner">
                  🎙️
                </div>
                {isRunning && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-indigo-600 animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                  <span>Live AI Teacher</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-medium shrink-0">
                    {course || "CodeX"}
                  </span>
                </h3>
                <p
                  className="text-[11px] text-white/90 font-medium truncate max-w-[280px] sm:max-w-md"
                  title={displayedTopic}
                >
                  <span className="text-white/70 font-normal">Currently teaching: </span>
                  <span className="font-bold text-white">{displayedTopic}</span>
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={togglePlayPause}
                title={state === "PAUSED" ? "Resume teaching" : isRunning ? "Pause teaching" : "Start teaching"}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              >
                {state === "PAUSED" ? <Play size={15} /> : isRunning ? <Pause size={15} /> : <Play size={15} />}
              </button>

              <button
                type="button"
                onClick={handleReplayUnit}
                title="Replay this concept"
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={toggleVoice}
                title={voiceEnabled ? "Mute voice" : "Enable voice"}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  voiceEnabled
                    ? "bg-white/20 hover:bg-white/30 text-white"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
              >
                {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>

              <button
                type="button"
                onClick={cycleSpeed}
                title="Change voice speed"
                className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-mono text-[11px] font-bold transition-all cursor-pointer"
              >
                {speed}x
              </button>

              <button
                type="button"
                onClick={handleStopTeaching}
                title="Stop teaching"
                className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <Square size={14} />
              </button>
            </div>
          </div>

          {/* Teacher Explanation Content Area */}
          {isRunning && (
            <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar" ref={explanationContainerRef}>
              {/* State Pill */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span className="text-slate-700 font-bold">
                    {state === "THINKING"
                      ? "AI Teacher is preparing explanation..."
                      : state === "RETEACHING"
                      ? "Teaching with simpler analogy & intuition..."
                      : state === "QUICK_RECAP"
                      ? "Quick Recap: Resume Checkpoint"
                      : state === "CHAPTER_RECAP"
                      ? "Chapter Understanding Synthesis"
                      : state === "CHECKPOINT"
                      ? "Interactive Understanding Checkpoint"
                      : "Explaining Concept"}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">
                  Topic: {displayedTopic}
                </span>
              </div>

              {/* Spoken Explanation Body — Sentence-Level Highlighting & Synchronization */}
              {currentUnitSentences.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium space-y-1">
                  {currentUnitSentences.slice(0, activeSentenceIndex + 1).map((sent, sIdx) => {
                    const isCurrent = sIdx === activeSentenceIndex;
                    return (
                      <span
                        key={sIdx}
                        ref={(el) => {
                          sentenceSpanRefs.current[sIdx] = el;
                        }}
                        className={`transition-all duration-200 inline-block mr-1.5 ${
                          isCurrent
                            ? "bg-blue-100 text-blue-950 font-bold px-2 py-0.5 rounded-lg border border-blue-300/80 shadow-xs ring-2 ring-blue-500/15"
                            : "text-slate-700"
                        }`}
                      >
                        {sent}{" "}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Visual Teaching Renderer */}
              {currentInstruction?.visualType && (
                <VisualTeachingRenderer
                  instruction={currentInstruction}
                  activeSentenceIndex={activeSentenceIndex}
                  onAnswerSubmit={(isCorrect) => {
                    if (isCorrect) {
                      speakText("Excellent! That is exactly right.");
                    } else {
                      speakText("Not quite, let's trace this step by step together.");
                    }
                  }}
                />
              )}

              {/* INTERACTIVE UNDERSTANDING CHECKPOINT */}
              {(state === "CHECKPOINT" || state === "QUICK_RECAP" || state === "CHAPTER_RECAP") && (
                <div className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 animate-in fade-in space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-2xs">
                        🧠
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          {state === "QUICK_RECAP"
                            ? `Quick Recap Check • ${displayedTopic}`
                            : state === "CHAPTER_RECAP"
                            ? `Chapter Recap Check • ${chapterTitle}`
                            : `Understanding Checkpoint • ${displayedTopic}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {understandingStep === "KNOWLEDGE_CHECK" ||
                          understandingStep === "QUICK_RECAP_CHECK" ||
                          understandingStep === "CHAPTER_RECAP_CHECK"
                            ? "Provide your answer via voice or text to verify comprehension"
                            : "AI Evaluation & Understanding Decision"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 font-bold">
                      {course.toUpperCase()}
                    </span>
                  </div>

                  {/* CHAPTER LEARNING ANALYSIS CARD */}
                  {state === "CHAPTER_RECAP" && (chapterAnalysis || localChapterAnalysis) && (
                    <div className="p-3.5 rounded-2xl bg-white border border-indigo-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                            Chapter Learning Analysis
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">{chapterTitle}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-700 font-mono">
                            {(chapterAnalysis || localChapterAnalysis)?.overallMasteryScore}% Mastery
                          </span>
                          <span className="block text-[9px] font-bold text-slate-500">
                            {(chapterAnalysis || localChapterAnalysis)?.overallLevel}
                          </span>
                        </div>
                      </div>

                      {/* STRONG AREAS */}
                      {((chapterAnalysis || localChapterAnalysis)?.strongTopics?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <span>✓</span> Strong Areas
                          </div>
                          <div className="space-y-1">
                            {(chapterAnalysis || localChapterAnalysis)!.strongTopics.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
                                <span className="font-semibold text-emerald-950 flex items-center gap-1">
                                  <span>✓</span> {t.topic}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-emerald-800">
                                  {t.masteryScore}% — {t.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DEVELOPING */}
                      {((chapterAnalysis || localChapterAnalysis)?.developingTopics?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1">
                            <span>△</span> Developing
                          </div>
                          <div className="space-y-1">
                            {(chapterAnalysis || localChapterAnalysis)!.developingTopics.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-blue-50/70 border border-blue-200/60">
                                <span className="font-semibold text-blue-950 flex items-center gap-1">
                                  <span>△</span> {t.topic}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-blue-800">
                                  {t.masteryScore}% — {t.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NEEDS SUPPORT */}
                      {((chapterAnalysis || localChapterAnalysis)?.needsSupportTopics?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <span>!</span> Needs Support
                          </div>
                          <div className="space-y-1">
                            {(chapterAnalysis || localChapterAnalysis)!.needsSupportTopics.map((t, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-semibold text-amber-950">
                                  <span className="flex items-center gap-1">
                                    <span>!</span> {t.topic}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-amber-900">
                                    {t.masteryScore}% — {t.level}
                                  </span>
                                </div>
                                {t.reason && (
                                  <div className="text-[10px] text-amber-900/90 pl-2.5 border-l-2 border-amber-400">
                                    <span className="font-bold">Why: </span>{t.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NOT ENOUGH DATA */}
                      {((chapterAnalysis || localChapterAnalysis)?.notEnoughDataTopics?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <span>?</span> Insufficient Data
                          </div>
                          <div className="space-y-1">
                            {(chapterAnalysis || localChapterAnalysis)!.notEnoughDataTopics.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                <span className="font-medium flex items-center gap-1">
                                  <span>?</span> {t.topic}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                  {t.level} (&lt; 2 interactions)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Box */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200/80 shadow-2xs">
                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1">
                      Teacher Question
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">
                      {checkpointQuestion || `What is the key principle of ${displayedTopic}?`}
                    </p>
                  </div>

                  {/* Step 1: Real Student Voice or Text Answer */}
                  {(understandingStep === "KNOWLEDGE_CHECK" ||
                    understandingStep === "QUICK_RECAP_CHECK" ||
                    understandingStep === "CHAPTER_RECAP_CHECK") && (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <textarea
                          value={checkpointAnswer}
                          onChange={(e) => setCheckpointAnswer(e.target.value)}
                          disabled={checkpointLoading}
                          placeholder="Type your explanation or click the microphone to speak your answer..."
                          className="w-full min-h-[72px] rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20 resize-none pr-10 shadow-2xs disabled:bg-slate-50 disabled:opacity-75"
                        />
                        <button
                          type="button"
                          onClick={toggleSpeechInput}
                          disabled={checkpointLoading}
                          className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                            isListening
                              ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                          title={isListening ? "Listening... click to stop" : "Speak your answer"}
                        >
                          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                      </div>

                      {checkpointError && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
                          <span>{checkpointError}</span>
                          <button
                            type="button"
                            onClick={submitCheckpointAnswer}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={submitCheckpointAnswer}
                        disabled={!checkpointAnswer.trim() || checkpointLoading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                      >
                        {checkpointLoading ? (
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="animate-spin text-white" />
                            <span>Checking your understanding...</span>
                          </div>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Submit Answer for AI Evaluation</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Step 2: Intelligent AI Feedback (Score 0-100%, What was correct, What was missing, Example, Follow-up) */}
                  {understandingStep === "ASK_UNDERSTANDING" && checkpointEvaluation && (
                    <div className="space-y-3 animate-in fade-in">
                      {/* Score Badge & Appreciation */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-tight ${scoreColor}`}>
                            Understanding: {checkpointEvaluation.score}% • {checkpointEvaluation.score >= 90 ? "Strong" : checkpointEvaluation.score >= 70 ? "Good" : checkpointEvaluation.score >= 50 ? "Partial" : checkpointEvaluation.score >= 30 ? "Weak" : "Needs Review"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">
                            {checkpointEvaluation.appreciation}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              score >= 90
                                ? "bg-emerald-500"
                                : score >= 70
                                ? "bg-blue-500"
                                : score >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.max(5, checkpointEvaluation.score)}%` }}
                          />
                        </div>
                      </div>

                      {/* What was correct */}
                      {checkpointEvaluation.whatWasCorrect && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-[11px]">
                            <Check size={13} className="text-emerald-600 stroke-[3]" />
                            <span>What you got right:</span>
                          </div>
                          <p className="leading-relaxed pl-5 font-medium">
                            {checkpointEvaluation.whatWasCorrect}
                          </p>
                        </div>
                      )}

                      {/* What was missing */}
                      {checkpointEvaluation.whatIsMissing && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800 text-[11px]">
                            <AlertTriangle size={13} className="text-amber-600" />
                            <span>What needs attention:</span>
                          </div>
                          <p className="leading-relaxed pl-5 font-medium">
                            {checkpointEvaluation.whatIsMissing}
                          </p>
                        </div>
                      )}

                      {/* Teacher Explanation & Example */}
                      {checkpointEvaluation.explanation && !checkpointEvaluation.whatWasCorrect && !checkpointEvaluation.whatIsMissing && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                          {checkpointEvaluation.explanation}
                        </div>
                      )}

                      {/* Code Example if provided */}
                      {checkpointEvaluation.example && (
                        <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                          <pre>{checkpointEvaluation.example}</pre>
                        </div>
                      )}

                      {/* Optional Follow-Up Question */}
                      {checkpointEvaluation.needsFollowUp && checkpointEvaluation.followUpQuestion && (
                        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                          <div className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider">
                            Follow-Up Check
                          </div>
                          <p className="text-xs font-bold text-slate-900">
                            {checkpointEvaluation.followUpQuestion}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={followUpAnswer}
                              onChange={(e) => setFollowUpAnswer(e.target.value)}
                              placeholder="Answer follow-up..."
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={submitFollowUpAnswer}
                              disabled={!followUpAnswer.trim() || followUpLoading}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                            >
                              {followUpLoading ? "..." : "Submit"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Final Understanding Confirmation */}
                      <div className="p-3 rounded-xl bg-white border border-blue-200/80 shadow-2xs text-center space-y-2">
                        <p className="text-xs font-black text-slate-900">
                          {checkpointEvaluation.understood
                            ? "🎉 Concept Understood! You're ready to continue."
                            : "💡 Still unclear? Let's reteach it with a simpler approach."}
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleUserUnderstandsYes}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                              checkpointEvaluation.understood
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            <span>✓ Continue</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleReteachAgain}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                              !checkpointEvaluation.understood
                                ? "border-2 border-amber-400 bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 font-black"
                                : "border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                            }`}
                          >
                            <RotateCcw size={14} />
                            <span>🔄 {checkpointEvaluation.understood ? "Review Again" : "No, Teach Again"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section Completed Summary View */}
          {state === "SECTION_COMPLETED" && (
            <div className="p-4 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white border-t border-slate-100 animate-in fade-in space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    Section Complete — {displayedTopic}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Score: <span className="font-bold text-emerald-700">{currentPerformance?.score ?? 85}%</span> &bull; Understanding:{" "}
                    <span className="font-bold text-emerald-700">
                      {currentPerformance?.understanding || "Good"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="font-bold text-emerald-900 flex items-center gap-1 mb-1">
                    <span>💪 Strengths</span>
                  </div>
                  <ul className="text-emerald-800 space-y-0.5 list-disc list-inside text-[10px]">
                    {currentPerformance?.strengths && currentPerformance.strengths.length > 0 ? (
                      currentPerformance.strengths.map((s, idx) => <li key={idx}>{s}</li>)
                    ) : (
                      <li>Demonstrated solid grasp of core principles</li>
                    )}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="font-bold text-amber-900 flex items-center gap-1 mb-1">
                    <span>🎯 Needs Practice</span>
                  </div>
                  <ul className="text-amber-800 space-y-0.5 list-disc list-inside text-[10px]">
                    {currentPerformance?.needsImprovement && currentPerformance.needsImprovement.length > 0 ? (
                      currentPerformance.needsImprovement.map((w, idx) => <li key={idx}>{w}</li>)
                    ) : (
                      <li>No critical difficulties recorded</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReteachAgain}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>🔄 Reteach Again</span>
                </button>

                {onNextTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      completeAndAdvanceTopic(activeTopic || currentTitle || "Current Topic");
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <span>{isFinalTopic ? "🚀 Final Chapter Recap →" : "✓ Continue to Next Section"}</span>
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chapter Completed Card */}
          {state === "COMPLETED" && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-t border-emerald-100 animate-in fade-in space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-500/20">
                  🎓
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Chapter Completed 🎉
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Overall Understanding:{" "}
                    <span className="font-bold text-emerald-700">
                      {chapterSummary?.overallUnderstanding || "Strong"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {chapterSummary && chapterSummary.weakAreas.length > 0 && onReviewWeakSection && (
                  <button
                    type="button"
                    onClick={() => onReviewWeakSection(chapterSummary.weakAreas[0])}
                    className="flex-1 py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span>Review Weak Areas</span>
                  </button>
                )}

                {onNextTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      setState("IDLE");
                      onNextTopic();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Take Chapter Assessment Quiz →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

LiveTeacher.displayName = "LiveTeacher";
export default LiveTeacher;