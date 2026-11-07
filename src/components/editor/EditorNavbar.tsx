"use client";

import React, { useEffect, useState } from "react";
import { useEditorTheme } from "./EditorTheme";
import Image from "next/image";
import LanguageDropdown from "./LanguageDropdown";
import SettingsModal from "./SettingsModal";

import { useTabs } from "./tabs/TabContext";


import {
  useLanguage,
} from "./languages/LanguageContext";

import {
  Sun,
  Moon,
  Share2,
  Save,
  Settings,
  ChevronDown,
  ArrowLeft,
  Menu,
} from "lucide-react";

export default function EditorNavbar() {
  const { darkMode, toggleTheme } = useEditorTheme();
  const { language, setLanguage } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { saveActiveTab } = useTabs();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveActiveTab]);

  return (
    <>
      <header
        className={`h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-6 transition-all duration-300 shrink-0 ${
          darkMode
            ? "bg-[#0B0D14] border-white/10 text-white"
            : "bg-white border-gray-200 text-gray-900 shadow-sm"
        }`}
      >
        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile Global Navigation Toggle */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
              }
            }}
            aria-label="Open navigation menu"
            className={`md:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130] text-slate-200"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
            }`}
          >
            <Menu size={20} />
          </button>

          <Image
            src="/images/logo.png"
            alt="KnowledgeStream AI"
            width={34}
            height={34}
            className="rounded-xl object-contain shrink-0 sm:w-11 sm:h-11"
          />

          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold truncate max-w-[90px] xs:max-w-[130px] sm:max-w-none">
              Codexa AI
            </h1>
            <p
              className={`text-[10px] sm:text-xs hidden sm:block ${
                darkMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              Cursor IDE Workspace
            </p>
          </div>

          <a
            href="/dashboard"
            className={`min-h-[44px] min-w-[44px] px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 touch-manipulation cursor-pointer ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130] text-slate-200"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
            }`}
            title="Back to Student Dashboard"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language */}
          <LanguageDropdown
            value={language.name}
            onChange={setLanguage}
            darkMode={darkMode}
          />

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 min-h-[44px] min-w-[44px] sm:h-10 rounded-xl border transition touch-manipulation cursor-pointer ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130]"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <>
                <Moon size={16} />
                <span className="hidden sm:inline text-xs">Dark</span>
              </>
            ) : (
              <>
                <Sun size={16} />
                <span className="hidden sm:inline text-xs">Light</span>
              </>
            )}
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={saveActiveTab}
            className={`min-h-[44px] min-w-[44px] sm:h-10 px-3 sm:px-4 rounded-xl border flex items-center justify-center gap-1.5 transition text-xs font-semibold touch-manipulation cursor-pointer ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130]"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
            title="Save Active Tab (Ctrl+S)"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Share */}
          <button
            type="button"
            className={`h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl border hidden md:flex items-center gap-1.5 transition text-xs font-semibold ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130]"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
            title="Share Workspace"
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(true);
            }}
            className={`min-h-[44px] min-w-[44px] sm:h-10 px-3 sm:px-4 rounded-xl border flex items-center justify-center gap-1.5 transition text-xs font-semibold touch-manipulation cursor-pointer ${
              darkMode
                ? "bg-[#151823] border-white/10 hover:bg-[#1C2130]"
                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
            title="Editor Settings"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

    <SettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
    />

  </>


  );
}
