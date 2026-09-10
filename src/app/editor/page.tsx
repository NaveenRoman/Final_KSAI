"use client";

export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import EditorNavbar from "@/components/editor/EditorNavbar";
import ExplorerSidebar from "@/components/editor/ExplorerSidebar";

const MonacoEditorPanel = nextDynamic(() => import("@/components/editor/MonacoEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#09090B] flex items-center justify-center text-xs text-white/40 font-mono">
      Loading Editor...
    </div>
  ),
});

import AIChatPanel from "@/components/editor/AIChatPanel";
import AIResultPanel from "@/components/editor/AIResultPanel";
import BottomDock from "@/components/editor/BottomDock";
import StatusBar from "@/components/editor/StatusBar";

import { TabProvider } from "@/components/editor/tabs/TabContext";
import TabBar from "@/components/editor/tabs/TabBar";
import { TerminalProvider, useTerminal } from "@/components/editor/terminal/TerminalContext";

const TerminalPanel = nextDynamic(() => import("@/components/editor/terminal/TerminalPanel"), {
  ssr: false,
});

import { LanguageProvider } from "@/components/editor/languages/LanguageContext";
import { ExplorerProvider } from "@/components/editor/explorer/ExplorerContext";
import { EditorThemeProvider, useEditorTheme } from "@/components/editor/EditorTheme";
import { EditorSettingsProvider } from "@/components/editor/EditorSettingsContext";
import { EditorProvider } from "@/components/editor/EditorContext";
import { AIResultProvider } from "@/components/editor/AIResultContext";
import { AIChatProvider } from "@/components/editor/AIChatContext";

import { Sparkles, MessageSquare, Bot, BookOpen, Terminal } from "lucide-react";

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#09090B] text-white flex items-center justify-center font-mono text-xs">Loading Cursor IDE Workspace...</div>}>
      <EditorThemeProvider>
        <EditorSettingsProvider>
          <LanguageProvider>
            <ExplorerProvider>
              <TabProvider>
                <TerminalProvider>
                  <EditorProvider>
                    <AIResultProvider>
                      <AIChatProvider>
                        <EditorLayout />
                      </AIChatProvider>
                    </AIResultProvider>
                  </EditorProvider>
                </TerminalProvider>
              </TabProvider>
            </ExplorerProvider>
          </LanguageProvider>
        </EditorSettingsProvider>
      </EditorThemeProvider>
    </Suspense>
  );
}

function EditorLayout() {
  
  const { darkMode } = useEditorTheme();
  const { showTerminal, setShowTerminal } = useTerminal();
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "explanation">("explanation");

  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<"chat" | "explanation">;
      if (customEvent.detail === "chat" || customEvent.detail === "explanation") {
        setRightPanelTab(customEvent.detail);
      }
    };
    window.addEventListener("editor-switch-right-tab", handleSwitch);
    return () => window.removeEventListener("editor-switch-right-tab", handleSwitch);
  }, []);

  return (
    <div className={`h-screen flex overflow-hidden font-sans antialiased ${darkMode ? "bg-[#09090B] text-white" : "bg-slate-100 text-slate-900"}`}>
      

      {/* Main IDE Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <EditorNavbar />

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* File Tree Explorer */}
          <ExplorerSidebar />

          {/* Code Editor Workspace */}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            {/* File Tabs */}
            <TabBar />

            {/* Monaco Editor Panel */}
            <div className="flex-1 h-full overflow-hidden relative">
              <MonacoEditorPanel />
            </div>

            {/* Terminal Panel or Collapsed Reopen Bar */}
            {showTerminal ? (
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            ) : (
              <div className={`h-7 px-4 flex items-center justify-between border-t text-xs font-mono select-none transition-colors ${
                darkMode ? "bg-[#0F1117] border-white/10 text-slate-400" : "bg-white border-gray-200 text-gray-600"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowTerminal(true)}
                  className={`flex items-center gap-2 px-2.5 py-0.5 rounded transition cursor-pointer ${
                    darkMode ? "hover:bg-white/10 hover:text-cyan-400" : "hover:bg-gray-100 hover:text-cyan-600"
                  }`}
                  title="Open Terminal Panel"
                >
                  <Terminal size={12} className="text-cyan-400" />
                  <span className="font-semibold text-xs">Terminal</span>
                  <span className="text-[10px] text-slate-500 font-mono">▲ Open</span>
                </button>
              </div>
            )}

            {/* Bottom Dock Action Bar */}
            <BottomDock />
          </div>

          {/* Right AI Copilot & Explanation Panel */}
          <div className={`w-[400px] min-h-0 flex flex-col overflow-hidden border-l shrink-0 transition-all ${
            darkMode ? "bg-[#0D0F17] border-white/10" : "bg-white border-slate-200"
          }`}>
            {/* Right Panel Tab Controls */}
            <div className={`flex items-center p-2 border-b gap-1.5 shrink-0 ${
              darkMode ? "bg-[#11131E] border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              <button
                onClick={() => setRightPanelTab("explanation")}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  rightPanelTab === "explanation"
                    ? "bg-[#4F46E5] text-white shadow-xs"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen size={14} /> Code Explanation
              </button>
              <button
                onClick={() => setRightPanelTab("chat")}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  rightPanelTab === "chat"
                    ? "bg-[#4F46E5] text-white shadow-xs"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare size={14} /> Codenthra AI
              </button>
            </div>

            {/* Panel Views */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {rightPanelTab === "explanation" ? (
                <AIResultPanel />
              ) : (
                <AIChatPanel />
              )}
            </div>
          </div>
        </div>

        <StatusBar />
      </div>
    </div>
  );
}