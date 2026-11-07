"use client";

import React, { useState } from "react";
import { useEditorTheme } from "./EditorTheme";

import ExplorerTree from "./explorer/ExplorerTree";

import { useExplorer } from "./explorer/ExplorerContext";

import ExplorerPanel from "./panels/ExplorerPanel";
import SearchPanel from "./panels/SearchPanel";
import GitPanel from "./panels/GitPanel";
import RunPanel from "./panels/RunPanel";
import ExtensionsPanel from "./panels/ExtensionsPanel";



import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  File,
  Search,
  GitBranch,
  Play,
  Boxes,
  FlaskConical,
} from "lucide-react";

export default function ExplorerSidebar() {
    const { workspace } = useExplorer();

  const { darkMode } = useEditorTheme();

  const [activePanel, setActivePanel] = useState<
  "explorer" |
  "search" |
  "git" |
  "run" |
  "extensions" |
  null
>("explorer");



  return (
  <div
    className={`flex h-full w-full ${
      darkMode ? "bg-[#09090B]" : "bg-gray-100"
    }`}
  >
    {/* Activity Bar */}
    <div
      className={`w-12 sm:w-14 border-r flex flex-col items-center py-3 sm:py-4 gap-3 sm:gap-6 shrink-0 ${
        darkMode
          ? "bg-[#0B0D14] border-white/10"
          : "bg-gray-100 border-gray-300"
      }`}
    >
      <button
        onClick={() =>
          setActivePanel((prev) =>
            prev === "explorer" ? null : "explorer"
          )
        }
        className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation transition ${
          activePanel === "explorer"
            ? "text-cyan-400 bg-white/5"
            : "text-slate-500 hover:text-white"
        }`}
        title="Explorer"
      >
        <FileCode2 size={22} />
      </button>

      <button
        onClick={() =>
          setActivePanel((prev) =>
            prev === "search" ? null : "search"
          )
        }
        className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation transition ${
          activePanel === "search"
            ? "text-cyan-400 bg-white/5"
            : "text-slate-500 hover:text-white"
        }`}
        title="Search"
      >
        <Search size={20} />
      </button>

      <button
        onClick={() =>
          setActivePanel((prev) =>
            prev === "git" ? null : "git"
          )
        }
        className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation transition ${
          activePanel === "git"
            ? "text-cyan-400 bg-white/5"
            : "text-slate-500 hover:text-white"
        }`}
        title="Source Control"
      >
        <GitBranch size={20} />
      </button>

      <button
        onClick={() =>
          setActivePanel((prev) =>
            prev === "run" ? null : "run"
          )
        }
        className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation transition ${
          activePanel === "run"
            ? "text-cyan-400 bg-white/5"
            : "text-slate-500 hover:text-white"
        }`}
        title="Run & Debug"
      >
        <Play size={20} />
      </button>

      <button
        onClick={() =>
          setActivePanel((prev) =>
            prev === "extensions" ? null : "extensions"
          )
        }
        className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation transition ${
          activePanel === "extensions"
            ? "text-cyan-400 bg-white/5"
            : "text-slate-500 hover:text-white"
        }`}
        title="Extensions"
      >
        <Boxes size={20} />
      </button>

      <button className="text-slate-500 hover:text-white mt-auto p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg touch-manipulation">
        <FlaskConical size={20} />
      </button>
    </div>

    {/* Sidebar */}
    {activePanel && (
  <div
    className={`flex-1 md:w-72 border-r flex flex-col min-w-0 transition-all ${
      darkMode
        ? "bg-[#11131B] border-white/10"
        : "bg-white border-gray-300"
    }`}
  >
    {activePanel === "explorer" && (
      <ExplorerPanel />
    )}

    {activePanel === "search" && (
      <SearchPanel />
    )}

    {activePanel === "git" && (
      <GitPanel />
    )}

    {activePanel === "run" && (
      <RunPanel />
    )}

    {activePanel === "extensions" && (
      <ExtensionsPanel />
    )}
  </div>
)}
  </div>
);
}
