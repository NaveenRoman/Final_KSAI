"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

import { useTabs } from "./tabs/TabContext";
import { useTerminal } from "./terminal/TerminalContext";
import { useEditor } from "./EditorContext";
import { useLanguage } from "./languages/LanguageContext";
import { parseCompilerError } from "./monaco/ErrorParser";
import { validateCodeBeforeRun, validateFileExtension } from "./runner/CodeValidator";

export default function RunButton() {
  const { activeTab } = useTabs();
  const { language } = useLanguage();
  const { setDiagnostics } = useEditor();

  const {
    setOutput,
    setProblemsText,
    setActivePanel,
    setShowTerminal,
    isRunning: terminalRunning,
    startExecution,
  } = useTerminal();

  const [runningLocal, setRunningLocal] = useState(false);
  const running = runningLocal || terminalRunning;

  async function runCode() {
    if (running) return;

    const selectedLang = activeTab?.language || language?.id || "java";
    const currentCode = activeTab?.content || "";
    const fileName = activeTab?.name || activeTab?.path || "";

    // =========================================================
    // PRE-EXECUTION VALIDATION (Language, File Match & Syntax)
    // =========================================================
    const normLang = (selectedLang || "").toLowerCase();
    if (normLang === "c" || normLang === "cpp" || normLang === "c++") {
      const extCheck = validateFileExtension(selectedLang, fileName);
      if (!extCheck.valid && extCheck.error) {
        setDiagnostics([]);
        setProblemsText(extCheck.error);
        setActivePanel("problems");
        setShowTerminal(true);
        return;
      }
    } else {
      const validation = validateCodeBeforeRun({
        language: selectedLang,
        fileName,
        code: currentCode,
      });

      if (!validation.valid) {
        const errorMsg = validation.errorMessage;
        const parsedErrors = validation.diagnostics && validation.diagnostics.length > 0
          ? validation.diagnostics.map((d) => ({
              file: d.file || fileName || "Main",
              line: d.line,
              column: d.column,
              message: d.message,
              severity: d.severity,
              type: d.type,
              explanation: d.explanation,
              correction: d.correction,
              code: d.code,
            }))
          : parseCompilerError(errorMsg, selectedLang);

        setDiagnostics(parsedErrors);
        setProblemsText(errorMsg);
        setActivePanel("problems");
        setShowTerminal(true);
        return;
      }
    }

    setRunningLocal(true);
    setDiagnostics([]);
    setProblemsText("");

    try {
      await startExecution({
        code: currentCode,
        language: selectedLang,
        fileName,
        onValidationError: (err) => {
          const parsedErrors = err.diagnostics && err.diagnostics.length > 0
            ? err.diagnostics.map((d: any) => ({
                file: d.file || fileName || "Main",
                line: d.line,
                column: d.column,
                message: d.message,
                severity: d.severity,
                type: d.type,
                explanation: d.explanation,
                correction: d.correction,
                code: d.code,
              }))
            : parseCompilerError(err.message, selectedLang);

          setDiagnostics(parsedErrors);
          setProblemsText(err.message);
          setActivePanel("problems");
          setShowTerminal(true);
        },
      });
    } catch (error: any) {
      const errorMsg = `Execution Error: ${error?.message || "Unable to connect to execution server."}`;
      const errors = parseCompilerError(errorMsg, selectedLang);
      setDiagnostics(errors);
      setProblemsText(errorMsg);
      setActivePanel("problems");
      setShowTerminal(true);
    } finally {
      setRunningLocal(false);
    }
  }

  return (
    <button
      onClick={runCode}
      disabled={running}
      className={`group flex items-center gap-3 px-5 py-3 rounded-2xl
      bg-gradient-to-r from-green-500 to-emerald-600
      text-white shadow-lg transition-all duration-300
      ${
        running
          ? "opacity-70 cursor-not-allowed"
          : "hover:scale-105 hover:shadow-xl"
      }`}
    >
      {running ? (
        <Loader2
          size={20}
          className="animate-spin"
        />
      ) : (
        <Play
          size={20}
          className="group-hover:scale-110 transition-transform"
        />
      )}

      <span className="font-semibold text-sm">
        {running ? "Running..." : "Run"}
      </span>
    </button>
  );
}