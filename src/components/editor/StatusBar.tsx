"use client";

import {
  GitBranch,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Globe,
  Terminal,
} from "lucide-react";
import { useEditorTheme } from "./EditorTheme";
import { useTerminal } from "./terminal/TerminalContext";
import { useEditor } from "./EditorContext";
import { useLanguage } from "./languages/LanguageContext";

export default function StatusBar() {
  const { darkMode } = useEditorTheme();
  const { showTerminal, setShowTerminal, setActivePanel } = useTerminal();
  const { diagnostics } = useEditor();
  const { language } = useLanguage();

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;

  return (
    <div
      className={`h-7 sm:h-8 flex items-center justify-between px-2.5 sm:px-4 text-[11px] sm:text-xs transition-all duration-300 select-none overflow-hidden shrink-0 ${
        darkMode
          ? "bg-[#007ACC] text-white"
          : "bg-[#E8F3FF] text-[#005A9E] border-t border-gray-300"
      }`}
    >
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-5 overflow-hidden">
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <GitBranch size={14} />
          <span>main</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowTerminal(true);
            setActivePanel("output");
          }}
          className="hidden md:flex items-center gap-1 hover:underline cursor-pointer shrink-0"
        >
          <CheckCircle2 size={14} />
          <span>Build Ready</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowTerminal(true);
            setActivePanel("problems");
          }}
          className="flex items-center gap-1 hover:underline cursor-pointer shrink-0"
        >
          <AlertCircle size={14} className={errorCount > 0 ? "text-red-300 animate-pulse" : ""} />
          <span>{errorCount} <span className="hidden sm:inline">{errorCount === 1 ? "Error" : "Errors"}</span></span>
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !showTerminal;
            setShowTerminal(next);
            if (next) {
              setActivePanel("terminal");
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("editor-open-terminal"));
              }
            }
          }}
          className="min-h-[28px] flex items-center gap-1 hover:underline cursor-pointer opacity-90 hover:opacity-100 py-0.5 px-1.5 rounded touch-manipulation shrink-0"
          title="Toggle Terminal Panel"
        >
          <Terminal size={14} />
          <span>Terminal</span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-5 shrink-0">
        <span className="font-medium truncate max-w-[90px] sm:max-w-none">{language?.name || "Java"}</span>

        <span className="hidden sm:inline">UTF-8</span>

        <span className="hidden md:inline">Spaces:4</span>

        <div className="hidden lg:flex items-center gap-1">
          <Cpu size={14} />
          <span>AI Ready</span>
        </div>

        <div className="hidden xl:flex items-center gap-1">
          <Globe size={14} />
          <span>KnowledgeStream AI</span>
        </div>
      </div>
    </div>
  );
}
