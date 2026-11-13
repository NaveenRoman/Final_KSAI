"use client";

import RunButton from "./RunButton";
import ExplainButton from "./ExplainButton";

import {
    Brain,
    Mic,
    Wand2,
    MonitorSmartphone,
} from "lucide-react";

import { useEditorTheme } from "./EditorTheme";
import { useTabs } from "./tabs/TabContext";
import { useAIResult } from "./AIResultContext";
import { useTerminal } from "./terminal/TerminalContext";
import { useLanguage } from "./languages/LanguageContext";
import { useEditor } from "./EditorContext";
import { validateCodeBeforeRun } from "./runner/CodeValidator";

import { useChallenge } from "./challenge/ChallengeContext";
import { CheckCircle2, Loader2 } from "lucide-react";

const buttons = [
    {
        title: "Dictator",
        icon: Mic,
        color: "from-purple-500 to-pink-600",
    },
    {
        title: "Auto Code",
        icon: Wand2,
        color: "from-blue-500 to-indigo-600",
    },
    {
        title: "Run",
        color: "from-green-500 to-emerald-600",
    },
    {
        title: "Screen Mentor",
        icon: MonitorSmartphone,
        color: "from-orange-500 to-red-500",
    },
];

export default function BottomDock() {
    const { darkMode } = useEditorTheme();
    const { activeTab, diagnosticsByTab } = useTabs();
    const { setResult, setLoading, setMode } = useAIResult();
    const { output: terminalOutput } = useTerminal();
    const { language } = useLanguage();
    const { editor } = useEditor();
    const {
        isChallengeMode,
        activeChallenge,
        testRunning,
        runTestCode,
        evaluating,
        submitChallengeCode,
    } = useChallenge();

    async function handleAIGuide() {
        if (!activeTab) {
            setMode("guide");
            setResult("Please open a code file before using AI Guide.");
            return;
        }

        const liveCode = (editor ? editor.getValue() : activeTab.content) || "";
        let diagnostics = diagnosticsByTab[activeTab.id] ?? [];
        const activeLang = activeTab.language || language?.id || "java";

        if (!diagnostics || diagnostics.length === 0) {
            const val = validateCodeBeforeRun({
                language: activeLang,
                fileName: activeTab.name || "Main",
                code: liveCode,
            });
            if (val.diagnostics && val.diagnostics.length > 0) {
                diagnostics = val.diagnostics.map((d) => ({
                    file: d.file || activeTab.name || "Main",
                    line: d.line,
                    column: d.column,
                    message: d.message,
                    severity: d.severity,
                    type: d.type,
                    explanation: d.explanation,
                    correction: d.correction,
                    code: d.code,
                }));
            }
        }

        setMode("guide");
        setLoading(true);
        setResult("");
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("editor-switch-right-tab", { detail: "explanation" })
            );
        }

        try {
            const response = await fetch("/api/ai/guide", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    language: activeLang,
                    code: liveCode,
                    errors: diagnostics,
                    output: terminalOutput || "",
                    fileName: activeTab.name || "Main",
                    challenge: isChallengeMode && activeChallenge ? {
                        id: activeChallenge.id,
                        title: activeChallenge.title,
                        objective: activeChallenge.objective,
                        description: activeChallenge.description,
                        constraints: activeChallenge.constraints,
                    } : undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Guide request failed with status ${response.status}`
                );
            }

            const data = await response.json();
            const guideResponse =
                data?.data?.response ??
                data?.response ??
                data?.data?.guide?.explanation ??
                "";

            if (!guideResponse) {
                throw new Error("AI Guide returned an empty response.");
            }

            setResult(guideResponse);
        } catch (error: unknown) {
            console.error("AI Guide Error:", error);
            const errMsg = error instanceof Error ? error.message : String(error || "");
            setResult(
                errMsg
                    ? `⚠️ Codenthra AI Guide: ${errMsg}`
                    : "⚠️ Codenthra AI Guide could not process your code. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleDictator() {
        setMode("dictator");
        setLoading(false);
        setResult("");
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("editor-switch-right-tab", { detail: "explanation" })
            );
        }
    }

    function handleAutoCode() {
        setMode("autocode");
        setLoading(false);
        setResult("");
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("editor-switch-right-tab", { detail: "explanation" })
            );
        }
    }

    return (
        <div
            className={`min-h-[56px] sm:h-20 border-t backdrop-blur-xl flex items-center justify-start sm:justify-center gap-2.5 sm:gap-4 px-3 sm:px-6 py-2 sm:py-0 overflow-x-auto sm:overflow-x-visible no-scrollbar shrink-0 transition-all duration-300 ${
                darkMode
                    ? "bg-[#0B0D14] border-white/10"
                    : "bg-white border-gray-300 shadow-md"
            }`}
        >

            {/* ========================= */}
            {/* RUN & CHALLENGE SUBMIT (Prominent First on Mobile) */}
            {/* ========================= */}
            <div key="run-group" className="flex items-center gap-2 shrink-0">
                <RunButton key="run" />
                {isChallengeMode && (
                    <button
                        type="button"
                        onClick={() => submitChallengeCode()}
                        disabled={evaluating || testRunning}
                        className="flex items-center gap-2 min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl text-white font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 touch-manipulation cursor-pointer"
                        title="Submit your code against all test cases"
                    >
                        {evaluating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                <span>Submit Solution</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* ========================= */}
            {/* AI GUIDE */}
            {/* ========================= */}
            <button
                type="button"
                onClick={handleAIGuide}
                className="group flex items-center gap-2 sm:gap-3 min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600
                hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl text-white shrink-0 touch-manipulation cursor-pointer"
            >
                <Brain size={18} className="sm:w-5 sm:h-5 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                    AI Guide
                </span>
            </button>

            {/* ========================= */}
            {/* EXPLAIN */}
            {/* ========================= */}
            <div className="shrink-0 flex items-center">
                <ExplainButton />
            </div>

            {/* ========================= */}
            {/* OTHER BUTTONS */}
            {/* ========================= */}
            {buttons.filter((b) => b.title !== "Run").map((button) => {
                const Icon = button.icon;

                return (
                    <button
                        key={button.title}
                        type="button"
                        onClick={
                            button.title === "Dictator"
                                ? handleDictator
                                : button.title === "Auto Code"
                                    ? handleAutoCode
                                    : undefined
                        }
                        className={`group flex items-center gap-2 sm:gap-3 min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r ${button.color}
                        hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl text-white shrink-0 touch-manipulation cursor-pointer`}
                    >
                        {Icon && (
                            <Icon size={18} className="sm:w-5 sm:h-5 shrink-0" />
                        )}

                        <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                            {button.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
