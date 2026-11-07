"use client";

import {
  X,
  Circle,
  Pin,
} from "lucide-react";

import { EditorTab } from "./TabTypes";
import { useTabs } from "./TabContext";
import { useEditorTheme } from "../EditorTheme";

interface Props {
  tab: EditorTab;
}

function getLanguageIcon(language: string) {
  switch (language.toLowerCase()) {
    case "java":
      return "☕";

    case "python":
      return "🐍";

    case "javascript":
      return "🟨";

    case "typescript":
      return "🔷";

    case "html":
      return "🌐";

    case "css":
      return "🎨";

    case "cpp":
      return "⚙";

    case "c":
      return "💻";

    default:
      return "📄";
  }
}

export default function TabItem({
  tab,
}: Props) {
  const {
    activeTabId,
    setActiveTab,
    closeTab,
  } = useTabs();

  const { darkMode } =
    useEditorTheme();

  const active =
    activeTabId === tab.id;

  return (
    <button
      onClick={() =>
        setActiveTab(tab.id)
      }
      className={`group h-full min-w-[120px] sm:min-w-[170px] px-3 sm:px-4 flex items-center justify-between border-r shrink-0 touch-manipulation transition-all
      ${
        active
          ? darkMode
            ? "bg-[#1A1D26]"
            : "bg-gray-100"
          : darkMode
          ? "hover:bg-white/5"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">

        <span className="shrink-0 text-xs sm:text-base">

          {getLanguageIcon(
            tab.language
          )}

        </span>

        <span className="truncate text-xs sm:text-sm">

          {tab.name}

        </span>

        {tab.isDirty && (
          <Circle
            size={7}
            fill="currentColor"
            className="shrink-0"
          />
        )}

        {tab.isPinned && (
          <Pin size={11} className="shrink-0" />
        )}

      </div>

      <span
        role="button"
        tabIndex={0}
        aria-label="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            closeTab(tab.id);
          }
        }}
        className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1 flex items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition shrink-0 ml-1 cursor-pointer touch-manipulation"
      >
        <X size={14} />
      </span>
    </button>
  );
}
