"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "../languages/LanguageContext";
import { useTabs } from "../tabs/TabContext";
import { useTerminal } from "../terminal/TerminalContext";

export interface ChallengeItem {
  id: string;
  course: string;
  chapterOrder: number;
  programIndex: number;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  objective: string;
  description: string;
  starterCode: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }>;
  isUnlocked: boolean;
  isPassed: boolean;
  score: number;
  hints: string[];
}

export interface EvaluationResult {
  success: boolean;
  challengeId: string;
  passed: boolean;
  score: number;
  minPassingScore: number;
  totalTestCases: number;
  passedTestCases: number;
  results: Array<{
    testCaseIndex: number;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    input: string;
    isHidden: boolean;
    executionTimeMs?: number;
    error?: string;
  }>;
  compilerError?: string | null;
  isChapterCodeComplete?: boolean;
  xpEarned?: number;
  message?: string;
}

interface ChallengeContextType {
  isChallengeMode: boolean;
  courseSlug: string;
  chapterOrder: number;
  challenges: ChallengeItem[];
  activeChallenge: ChallengeItem | null;
  activeChallengeId: string | null;
  isChapterQuizPassed: boolean;
  isAllChallengesPassed: boolean;
  totalChallenges: number;
  passedChallenges: number;
  loading: boolean;
  error: string | null;
  evalResult: EvaluationResult | null;
  evaluating: boolean;
  testRunning: boolean;
  testOutput: string | null;
  hintIndex: number;
  aiAdvice: string | null;
  aiLoading: boolean;
  showAiModal: boolean;
  setShowAiModal: (show: boolean) => void;
  selectChallenge: (challengeId: string) => void;
  runTestCode: () => Promise<void>;
  submitChallengeCode: () => Promise<void>;
  requestAiHelp: (type: "HINT" | "DEBUG") => Promise<void>;
  resetCode: () => void;
  refreshProgression: () => Promise<void>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

function getFileExtension(course: string): string {
  const norm = (course || "").toLowerCase();
  if (norm === "python" || norm === "py") return ".py";
  if (norm === "c") return ".c";
  if (norm === "cpp" || norm === "c++") return ".cpp";
  if (norm === "java") return ".java";
  return ".java";
}

function getDefaultFileName(course: string): string {
  const norm = (course || "").toLowerCase();
  if (norm === "java") return "Main.java";
  if (norm === "c") return "solution.c";
  if (norm === "cpp" || norm === "c++") return "solution.cpp";
  return "solution.py";
}

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setLanguage } = useLanguage();
  const { openTab, activeTab, updateTabContent } = useTabs();
  const { setOutput, setShowTerminal, setActivePanel } = useTerminal();

  const rawCourse =
    searchParams?.get("course") ||
    searchParams?.get("language") ||
    "";
  const rawChapter = searchParams?.get("chapter") || "";
  const rawChallengeId = searchParams?.get("challengeId") || "";

  const isChallengeMode = Boolean(rawCourse && rawChapter);
  const courseSlug = rawCourse.toLowerCase().trim();
  const chapterOrder = parseInt(rawChapter.replace(/[^0-9]/g, ""), 10) || 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [isChapterQuizPassed, setIsChapterQuizPassed] = useState(true);
  const [isAllChallengesPassed, setIsAllChallengesPassed] = useState(false);
  const [totalChallenges, setTotalChallenges] = useState(0);
  const [passedChallenges, setPassedChallenges] = useState(0);

  const [codeBuffers, setCodeBuffers] = useState<Record<string, string>>({});
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const [hintIndex, setHintIndex] = useState(0);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const activeChallenge =
    challenges.find((c) => c.id === activeChallengeId) ||
    challenges[0] ||
    null;

  const initializedTabRef = useRef<string | null>(null);

  const fetchProgression = useCallback(async () => {
    if (!isChallengeMode) return;
    try {
      setLoading(true);
      setError(null);
      const url = `/api/courses/${courseSlug}/chapters/${chapterOrder}/challenge${
        rawChallengeId ? `?challengeId=${encodeURIComponent(rawChallengeId)}` : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        const chList: ChallengeItem[] = data.challenges || [];
        setChallenges(chList);
        setTotalChallenges(data.totalChallenges || chList.length);
        setPassedChallenges(data.passedChallenges || 0);
        setIsChapterQuizPassed(data.isChapterQuizPassed ?? true);
        setIsAllChallengesPassed(data.isAllChallengesPassed ?? false);

        // Populate initial starter code into codeBuffers
        const newBuffers: Record<string, string> = {};
        chList.forEach((ch) => {
          newBuffers[ch.id] = ch.starterCode;
        });
        setCodeBuffers((prev) => ({ ...newBuffers, ...prev }));

        // Resolve active challenge
        let selectedId = data.selectedChallengeId;
        if (!selectedId && chList.length > 0) {
          const firstUnlockedUnpassed = chList.find((c) => c.isUnlocked && !c.isPassed);
          selectedId = firstUnlockedUnpassed ? firstUnlockedUnpassed.id : chList[0].id;
        }

        setActiveChallengeId(selectedId);
      } else {
        setError(data.error || "Failed to load chapter programming challenge");
      }
    } catch (err: any) {
      console.error("Fetch challenge progression error:", err);
      setError(err?.message || "Failed to connect to challenge service");
    } finally {
      setLoading(false);
    }
  }, [isChallengeMode, courseSlug, chapterOrder, rawChallengeId]);

  useEffect(() => {
    if (isChallengeMode) {
      fetchProgression();
    }
  }, [isChallengeMode, fetchProgression]);

  // Synchronize language and editor tab when activeChallenge changes
  useEffect(() => {
    if (!isChallengeMode || !activeChallenge) return;

    // Set editor language
    setLanguage(activeChallenge.course);

    const fileName = getDefaultFileName(activeChallenge.course);
    const fileExt = getFileExtension(activeChallenge.course);
    const tabKey = `${activeChallenge.id}-${fileName}`;

    if (initializedTabRef.current !== tabKey) {
      initializedTabRef.current = tabKey;
      const initialCode =
        codeBuffers[activeChallenge.id] || activeChallenge.starterCode;

      openTab({
        id: `challenge-${activeChallenge.id}`,
        name: fileName,
        path: fileName,
        language: activeChallenge.course,
        content: initialCode,
        isDirty: false,
        isPinned: true,
      });
    }
  }, [isChallengeMode, activeChallenge?.id, activeChallenge?.course, openTab, setLanguage]);

  const selectChallenge = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;
    if (!target.isUnlocked) {
      alert("Sequential Gate: Please pass previous required program(s) first.");
      return;
    }

    setActiveChallengeId(challengeId);
    setEvalResult(null);
    setTestOutput(null);
    setHintIndex(0);

    const fileName = getDefaultFileName(target.course);
    const initialCode = codeBuffers[target.id] || target.starterCode;

    initializedTabRef.current = `${target.id}-${fileName}`;
    openTab({
      id: `challenge-${target.id}`,
      name: fileName,
      path: fileName,
      language: target.course,
      content: initialCode,
      isDirty: false,
      isPinned: true,
    });
  };

  const resetCode = () => {
    if (!activeChallenge) return;
    if (confirm("Reset current challenge code back to original starter template?")) {
      setCodeBuffers((prev) => ({
        ...prev,
        [activeChallenge.id]: activeChallenge.starterCode,
      }));
      if (activeTab) {
        updateTabContent(activeTab.id, activeChallenge.starterCode);
      }
      setEvalResult(null);
      setTestOutput(null);
    }
  };

  const runTestCode = async () => {
    if (!activeChallenge) return;
    setTestRunning(true);
    setTestOutput(null);

    const currentCode = activeTab?.content || codeBuffers[activeChallenge.id] || activeChallenge.starterCode;
    const publicTest = activeChallenge.testCases.find((tc) => !tc.isHidden);
    const stdin = publicTest ? publicTest.input : "";

    setShowTerminal(true);
    setActivePanel("output");
    setOutput("Running test against public test case...\n");

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeChallenge.course,
          code: currentCode,
          stdin,
          challengeId: activeChallenge.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const out = data.output || (data.success ? "Program finished with zero output." : "Execution completed.");
        setTestOutput(out);
        setOutput(out);
      } else {
        const fallback = "Execution completed. Click 'Submit for Evaluation' for authoritative grading.";
        setTestOutput(fallback);
        setOutput(fallback);
      }
    } catch {
      const fallback = "Execution engine finished. Proceed to submit for authoritative evaluation.";
      setTestOutput(fallback);
      setOutput(fallback);
    } finally {
      setTestRunning(false);
    }
  };

  const submitChallengeCode = async () => {
    if (!activeChallenge) return;
    setEvaluating(true);
    setEvalResult(null);
    setTestOutput(null);

    const currentCode = activeTab?.content || codeBuffers[activeChallenge.id] || activeChallenge.starterCode;

    try {
      const res = await fetch(
        `/api/courses/${courseSlug}/chapters/${chapterOrder}/challenge/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: activeChallenge.id,
            code: currentCode,
            language: activeChallenge.course,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setEvalResult(data);

        if (data.passed) {
          await fetchProgression();
        }
      } else {
        alert(data.error || "Submission failed. Please check your implementation.");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      alert("Network error submitting challenge. Please retry.");
    } finally {
      setEvaluating(false);
    }
  };

  const requestAiHelp = async (type: "HINT" | "DEBUG") => {
    if (!activeChallenge) return;
    setAiLoading(true);

    const currentCode = activeTab?.content || codeBuffers[activeChallenge.id] || activeChallenge.starterCode;

    try {
      const res = await fetch("/api/ai/challenge-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: activeChallenge.id,
          course: activeChallenge.course,
          chapter: activeChallenge.chapterOrder,
          code: currentCode,
          error: evalResult?.compilerError || testOutput || "",
          requestType: type,
          hintIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === "HINT") {
          setHintIndex((prev) => prev + 1);
        } else {
          setAiAdvice(data.advice);
          setShowAiModal(true);
        }
      }
    } catch {
      setAiAdvice("Review input parsing, format requirements, and edge case bounds.");
      setShowAiModal(true);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ChallengeContext.Provider
      value={{
        isChallengeMode,
        courseSlug,
        chapterOrder,
        challenges,
        activeChallenge,
        activeChallengeId,
        isChapterQuizPassed,
        isAllChallengesPassed,
        totalChallenges,
        passedChallenges,
        loading,
        error,
        evalResult,
        evaluating,
        testRunning,
        testOutput,
        hintIndex,
        aiAdvice,
        aiLoading,
        showAiModal,
        setShowAiModal,
        selectChallenge,
        runTestCode,
        submitChallengeCode,
        requestAiHelp,
        resetCode,
        refreshProgression: fetchProgression,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error("useChallenge must be used inside ChallengeProvider");
  }
  return context;
}
