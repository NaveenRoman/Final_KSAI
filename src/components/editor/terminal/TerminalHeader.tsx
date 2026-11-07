"use client";

import { Trash2, X, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { useTerminal } from "./TerminalContext";
import { useEditor } from "../EditorContext";
import { useEditorTheme } from "../EditorTheme";

interface Props {
  onClose: () => void;
}

export default function TerminalHeader({ onClose }: Props) {
  const {
    activePanel,
    setActivePanel,
    clearTerminal,
    clearOutput,
    clearProblemsText,
  } = useTerminal();

  const { diagnostics, setDiagnostics } = useEditor();
  const { darkMode } = useEditorTheme();

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;

  const handleClear = () => {
    if (activePanel === "terminal") {
      clearTerminal();
    } else if (activePanel === "output") {
      clearOutput();
    } else if (activePanel === "problems") {
      clearProblemsText();
      setDiagnostics([]);
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 border-b select-none shrink-0 ${
        darkMode
          ? "border-white/10 bg-[#0F1117] text-white"
          : "border-gray-200 bg-gray-50 text-gray-900"
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActivePanel("terminal")}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition pb-1 border-b-2 shrink-0 touch-manipulation min-h-[36px] sm:min-h-0 ${
            activePanel === "terminal"
              ? "text-cyan-400 border-cyan-400"
              : darkMode
              ? "text-slate-400 hover:text-white border-transparent"
              : "text-gray-500 hover:text-gray-900 border-transparent"
          }`}
        >
          <Terminal size={13} />
          <span>TERMINAL</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel("output")}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition pb-1 border-b-2 shrink-0 touch-manipulation min-h-[36px] sm:min-h-0 ${
            activePanel === "output"
              ? "text-emerald-400 border-emerald-400"
              : darkMode
              ? "text-slate-400 hover:text-white border-transparent"
              : "text-gray-500 hover:text-gray-900 border-transparent"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>OUTPUT</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel("problems")}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition pb-1 border-b-2 shrink-0 touch-manipulation min-h-[36px] sm:min-h-0 ${
            activePanel === "problems"
              ? "text-rose-400 border-rose-400"
              : darkMode
              ? "text-slate-400 hover:text-white border-transparent"
              : "text-gray-500 hover:text-gray-900 border-transparent"
          }`}
        >
          <AlertCircle size={13} />
          <span>PROBLEMS</span>
          {errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-mono">
              {errorCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={handleClear}
          title="Clear active panel"
          className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded-lg transition touch-manipulation cursor-pointer flex items-center justify-center ${
            darkMode
              ? "text-slate-400 hover:text-white hover:bg-white/10"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <Trash2 size={15} />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close panel"
          className={`min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded-lg transition touch-manipulation cursor-pointer flex items-center justify-center ${
            darkMode
              ? "text-slate-400 hover:text-white hover:bg-white/10"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
          }`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
