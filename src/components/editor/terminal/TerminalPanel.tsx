"use client";

import { useState, useRef, useEffect } from "react";
import TerminalHeader from "./TerminalHeader";
import XTermTabs from "./XTermTabs";
import XTermInstance from "./XTermInstance";
import { useTerminal } from "./TerminalContext";
import { useEditor } from "../EditorContext";
import { useEditorTheme } from "../EditorTheme";

import {
    AlertCircle,
    AlertTriangle,
    Trash2,
} from "lucide-react";

interface Props {
    onClose: () => void;
}

export default function TerminalPanel({
    onClose,
}: Props) {

    const {
        activePanel,
        output,
        problemsText,
        clearProblemsText,
        isRunning,
        sendInput,
    } = useTerminal();

    const [currentInput, setCurrentInput] = useState("");
    const outputContainerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (outputContainerRef.current) {
            outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
        }
        if (isRunning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [output, isRunning]);

    const {
        diagnostics,
        editor,
        setDiagnostics,
    } = useEditor();

    const { darkMode } = useEditorTheme();

    const errorCount =
        diagnostics.filter(
            (item) =>
                item.severity === "error"
        ).length;

    const warningCount =
        diagnostics.filter(
            (item) =>
                item.severity === "warning"
        ).length;

    function jumpToDiagnostic(
        line: number,
        column: number
    ) {

        if (!editor) return;

        editor.setPosition({
            lineNumber: line,
            column: column,
        });

        editor.revealLineInCenter(
            line
        );

        editor.focus();
    }

    function clearProblems() {
        clearProblemsText();
        if (!editor) {
            setDiagnostics([]);
            return;
        }

        const model =
            editor.getModel();

        if (!model) {
            setDiagnostics([]);
            return;
        }

        import("monaco-editor").then(
            (monaco) => {

                monaco.editor.setModelMarkers(
                    model,
                    "KnowledgeStream",
                    []
                );

                setDiagnostics([]);
            }
        );
    }

    return (
        <div
            className={`h-[180px] sm:h-[230px] max-h-[35vh] sm:max-h-[40vh] flex flex-col border-t shrink-0 ${
                darkMode
                    ? "border-white/10 bg-[#0F1117] text-white"
                    : "border-gray-300 bg-white text-gray-900"
            }`}
        >

            <TerminalHeader
                onClose={onClose}
            />

            {/* TERMINAL TABS (Only shown for Terminal tab) */}
            {activePanel === "terminal" && <XTermTabs />}

            <div className="flex-1 overflow-y-auto overflow-x-hidden">

                {/* TERMINAL */}

                {activePanel === "terminal" && (
                    <XTermInstance />
                )}

                {/* OUTPUT */}

                {activePanel === "output" && (

                    <div
                        ref={outputContainerRef}
                        className={`h-full overflow-auto p-3 sm:p-5 flex flex-col justify-between ${
                            darkMode
                                ? "bg-[#0F1117]"
                                : "bg-white"
                        }`}
                    >

                        <div className="flex-1">
                            <pre
                                className={`whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed ${
                                    darkMode
                                        ? "text-emerald-300"
                                        : "text-emerald-700"
                                }`}
                            >
                                {output ||
                                    "No output yet. Click Run in the bottom dock to execute your program."}
                            </pre>
                        </div>

                        {/* Interactive Input Prompt when process is running */}
                        {isRunning && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const val = currentInput;
                                    setCurrentInput("");
                                    sendInput(val);
                                }}
                                className={`flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t font-mono text-sm shrink-0 ${
                                    darkMode ? "border-white/10" : "border-gray-200"
                                }`}
                            >
                                <span className="text-emerald-400 font-bold flex items-center gap-1.5 shrink-0 select-none">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    &gt;
                                </span>
                                <input
                                    type="text"
                                    ref={inputRef}
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    placeholder="Type input here and press Enter..."
                                    autoFocus
                                    className={`flex-1 bg-transparent outline-none border-none font-mono text-base sm:text-sm ${
                                        darkMode
                                            ? "text-emerald-300 placeholder-slate-500"
                                            : "text-emerald-800 placeholder-gray-400"
                                    }`}
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono transition shrink-0 cursor-pointer"
                                >
                                    Enter ↵
                                </button>
                            </form>
                        )}

                    </div>

                )}

                {/* PROBLEMS */}

                {activePanel === "problems" && (

                    <div className="h-full flex flex-col">

                        {/* Problems Header */}

                        <div
                            className={`h-10 shrink-0 flex items-center justify-between px-4 border-b ${
                                darkMode
                                    ? "border-white/10"
                                    : "border-gray-200"
                            }`}
                        >

                            <div className="flex items-center gap-3">

                                <span className="text-sm font-semibold">
                                    Problems & Diagnostics
                                </span>

                                {errorCount > 0 && (

                                    <span className="flex items-center gap-1 text-xs text-red-500 font-mono">

                                        <AlertCircle
                                            size={14}
                                        />

                                        {errorCount} {errorCount === 1 ? "Error" : "Errors"}

                                    </span>

                                )}

                                {warningCount > 0 && (

                                    <span className="flex items-center gap-1 text-xs text-yellow-500 font-mono">

                                        <AlertTriangle
                                            size={14}
                                        />

                                        {warningCount} {warningCount === 1 ? "Warning" : "Warnings"}

                                    </span>

                                )}

                            </div>

                            {(diagnostics.length > 0 || problemsText) && (

                                <button
                                    type="button"
                                    onClick={
                                        clearProblems
                                    }
                                    title="Clear problems"
                                    className={`w-7 h-7 rounded-md flex items-center justify-center transition ${
                                        darkMode
                                            ? "text-slate-400 hover:bg-white/10 hover:text-white"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                >

                                    <Trash2
                                        size={15}
                                    />

                                </button>

                            )}

                        </div>

                        {/* Problems List */}

                        <div className="flex-1 overflow-y-auto">

                            {diagnostics.length === 0 && !problemsText ? (

                                <div className="h-full flex items-center justify-center p-6">

                                    <div className="flex flex-col items-center gap-2 text-center">

                                        <AlertCircle
                                            size={24}
                                            className="text-green-500"
                                        />

                                        <span
                                            className={`text-sm ${
                                                darkMode
                                                    ? "text-slate-400"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            No problems detected in code.
                                        </span>

                                    </div>

                                </div>

                            ) : (

                                <div className="divide-y divide-white/5">
                                    {problemsText && diagnostics.length === 0 && (
                                        <div className="p-4">
                                            <pre className="whitespace-pre-wrap font-mono text-xs text-rose-400 leading-relaxed">
                                                {problemsText}
                                            </pre>
                                        </div>
                                    )}

                                    {diagnostics.map(
                                        (
                                            error,
                                            index
                                        ) => {

                                            const isWarning =
                                                error.severity ===
                                                "warning";

                                            return (

                                                <button
                                                    key={`${error.file}-${error.line}-${error.column}-${index}`}
                                                    type="button"
                                                    onClick={() =>
                                                        jumpToDiagnostic(
                                                            error.line,
                                                            error.column
                                                        )
                                                    }
                                                    className={`w-full text-left px-4 py-3 border-b transition ${
                                                        darkMode
                                                            ? "border-white/5 hover:bg-white/5"
                                                            : "border-gray-100 hover:bg-gray-50"
                                                    }`}
                                                >

                                                    <div className="flex items-start gap-3">

                                                        {/* Icon */}

                                                        <div className="pt-0.5">

                                                            {isWarning ? (

                                                                <AlertTriangle
                                                                    size={16}
                                                                    className="text-yellow-500"
                                                                />

                                                            ) : (

                                                                <AlertCircle
                                                                    size={16}
                                                                    className="text-red-500"
                                                                />

                                                            )}

                                                        </div>

                                                        {/* Information */}

                                                        <div className="min-w-0 flex-1">

                                                            <div className="flex items-center gap-2">

                                                                <span
                                                                    className={`text-xs font-semibold ${
                                                                        isWarning
                                                                            ? "text-yellow-500"
                                                                            : "text-red-500"
                                                                    }`}
                                                                >
                                                                    Line{" "}
                                                                    {
                                                                        error.line
                                                                    }
                                                                </span>

                                                                <span
                                                                    className={`text-xs ${
                                                                        darkMode
                                                                            ? "text-slate-500"
                                                                            : "text-gray-400"
                                                                    }`}
                                                                >
                                                                    Column{" "}
                                                                    {
                                                                        error.column
                                                                    }
                                                                </span>

                                                                {error.type && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">
                                                                        {error.type}
                                                                    </span>
                                                                )}

                                                            </div>

                                                            <p
                                                                className={`text-sm mt-1 font-medium ${
                                                                    darkMode
                                                                        ? "text-slate-200"
                                                                        : "text-gray-800"
                                                                }`}
                                                            >
                                                                {
                                                                    error.message
                                                                }
                                                            </p>

                                                            {error.explanation && (
                                                                <p
                                                                    className={`text-xs mt-1 ${
                                                                        darkMode
                                                                            ? "text-slate-400"
                                                                            : "text-gray-600"
                                                                    }`}
                                                                >
                                                                    {error.explanation}
                                                                </p>
                                                            )}

                                                            {error.correction && (
                                                                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                                                                    <span className="text-slate-400 font-sans">Fix:</span>
                                                                    <code>{error.correction}</code>
                                                                </div>
                                                            )}

                                                        </div>

                                                    </div>

                                                </button>

                                            );
                                        }
                                    )}

                                </div>

                            )}

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}
