"use client";

export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import EditorNavbar from "@/components/editor/EditorNavbar";
import ExplorerSidebar from "@/components/editor/ExplorerSidebar";
import { MobileNavigationDrawer } from "@/components/navigation/MobileNavigationDrawer";

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

import { Sparkles, MessageSquare, Bot, BookOpen, Terminal, Target, Folder, Code2 } from "lucide-react";
import { ChallengeProvider, useChallenge } from "@/components/editor/challenge/ChallengeContext";
import ChallengeHeaderBar from "@/components/editor/challenge/ChallengeHeaderBar";
import ChallengePanel from "@/components/editor/challenge/ChallengePanel";

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
                        <ChallengeProvider>
                          <EditorLayout />
                        </ChallengeProvider>
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
  const { isChallengeMode } = useChallenge();
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "explanation" | "challenge">("explanation");
  const [mobileView, setMobileView] = useState<"editor" | "copilot" | "files">("editor");

  // Automatically activate challenge tab when in challenge mode
  useEffect(() => {
    if (isChallengeMode) {
      setRightPanelTab("challenge");
    }
  }, [isChallengeMode]);

  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<"chat" | "explanation" | "challenge">;
      if (
        customEvent.detail === "chat" ||
        customEvent.detail === "explanation" ||
        customEvent.detail === "challenge"
      ) {
        setRightPanelTab(customEvent.detail);
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileView("copilot");
        }
      }
    };
    window.addEventListener("editor-switch-right-tab", handleSwitch);
    return () => window.removeEventListener("editor-switch-right-tab", handleSwitch);
  }, []);

  // When a file is opened from file tree on mobile, auto-switch to editor view
  useEffect(() => {
    const handleOpenFile = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setMobileView("editor");
      }
    };
    window.addEventListener("editor-open-file", handleOpenFile);
    return () => window.removeEventListener("editor-open-file", handleOpenFile);
  }, []);

  // When terminal is opened from anywhere on mobile, ensure editor view is active
  useEffect(() => {
    const handleOpenTerminal = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setMobileView("editor");
      }
      setShowTerminal(true);
    };
    window.addEventListener("editor-open-terminal", handleOpenTerminal);
    return () => window.removeEventListener("editor-open-terminal", handleOpenTerminal);
  }, [setShowTerminal]);

  // Trigger Monaco layout recalculation when switching back to editor
  useEffect(() => {
    if (mobileView === "editor" && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mobileView]);

  return (
    <div className={`h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden font-sans antialiased ${darkMode ? "bg-[#09090B] text-white" : "bg-slate-100 text-slate-900"}`}>
      {/* Mobile Global Navigation Drawer (< 768px) */}
      <MobileNavigationDrawer activeTab="Editor" />

      {/* Main IDE Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <EditorNavbar />

        {/* Mobile Workspace View Switcher Bar (only visible on screens < 768px) */}
        <div className={`md:hidden flex items-center justify-between px-3 py-1.5 border-b text-xs font-bold shrink-0 ${
          darkMode ? "bg-[#11131E] border-white/10" : "bg-slate-100 border-slate-200"
        }`}>
          <div className="flex items-center gap-1 w-full bg-black/20 dark:bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileView("files")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                mobileView === "files"
                  ? "bg-blue-600 text-white shadow-xs"
                  : darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Folder size={14} />
              <span>Files</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView("editor")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                mobileView === "editor"
                  ? "bg-blue-600 text-white shadow-xs"
                  : darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 size={14} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView("copilot")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
                mobileView === "copilot"
                  ? "bg-blue-600 text-white shadow-xs"
                  : darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isChallengeMode ? <Target size={14} /> : <Bot size={14} />}
              <span>{isChallengeMode ? "Challenge" : "Copilot"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* File Tree Explorer (Full width on mobile when 'files' view active; pinned on desktop) */}
          <div className={`${mobileView === "files" ? "flex flex-1 w-full" : "hidden"} md:flex md:w-auto shrink-0 overflow-hidden`}>
            <ExplorerSidebar />
          </div>

          {/* Code Editor Workspace (Full width on mobile when 'editor' view active; flex-1 on desktop) */}
          <div className={`${mobileView === "editor" ? "flex flex-1" : "hidden"} md:flex flex-col flex-1 overflow-hidden min-w-0`}>
            {/* Challenge Mode Navigation Header */}
            {isChallengeMode && <ChallengeHeaderBar />}

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
              <div className={`min-h-[38px] sm:h-7 px-3 sm:px-4 flex items-center justify-between border-t text-xs font-mono select-none transition-colors shrink-0 ${
                darkMode ? "bg-[#0F1117] border-white/10 text-slate-400" : "bg-white border-gray-200 text-gray-600"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowTerminal(true)}
                  className={`min-h-[36px] sm:min-h-0 flex items-center gap-2 px-3 py-1.5 sm:py-0.5 rounded transition cursor-pointer touch-manipulation ${
                    darkMode ? "hover:bg-white/10 hover:text-cyan-400" : "hover:bg-gray-100 hover:text-cyan-600"
                  }`}
                  title="Open Terminal Panel"
                >
                  <Terminal size={14} className="text-cyan-400 shrink-0" />
                  <span className="font-semibold text-xs">Terminal</span>
                  <span className="text-[10px] text-slate-500 font-mono">▲ Open</span>
                </button>
              </div>
            )}

            {/* Bottom Dock Action Bar */}
            <BottomDock />
          </div>

          {/* Right AI Copilot & Explanation Panel (Full width on mobile when 'copilot' view active; 400px/440px on desktop) */}
          <div className={`${mobileView === "copilot" ? "flex flex-1 w-full" : "hidden"} md:flex ${isChallengeMode ? "md:w-[440px]" : "md:w-[400px]"} min-h-0 flex-col overflow-hidden border-l shrink-0 transition-all ${
            darkMode ? "bg-[#0D0F17] border-white/10" : "bg-white border-slate-200"
          }`}>
            {/* Right Panel Tab Controls */}
            <div className={`flex items-center p-2 border-b gap-1.5 shrink-0 ${
              darkMode ? "bg-[#11131E] border-white/10" : "bg-slate-50 border-slate-200"
            }`}>
              {isChallengeMode && (
                <button
                  onClick={() => setRightPanelTab("challenge")}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                    rightPanelTab === "challenge"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
                      : darkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Target size={14} /> Challenge
                </button>
              )}
              <button
                onClick={() => setRightPanelTab("explanation")}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
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
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
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
              {rightPanelTab === "challenge" ? (
                <ChallengePanel />
              ) : rightPanelTab === "explanation" ? (
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
