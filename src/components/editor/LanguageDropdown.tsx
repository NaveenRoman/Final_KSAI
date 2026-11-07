"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, Lock } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "./languages/LanguageContext";
import { LanguageConfig } from "./languages/LanguageConfig";

interface Props {
  value?: string;
  onChange?: (language: string) => void;
  darkMode: boolean;
}

export default function LanguageDropdown({
  value,
  onChange,
  darkMode,
}: Props) {
  const { language, setLanguage, accessibleLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const currentLang = language;
  const filtered = accessibleLanguages.filter((lang) =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (lang: LanguageConfig) => {
    if (onChange) {
      onChange(lang.name);
    } else {
      setLanguage(lang.id);
    }
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2.5 px-3 sm:px-3.5 min-h-[44px] sm:h-10 rounded-xl border font-bold text-xs transition select-none touch-manipulation cursor-pointer ${
          darkMode
            ? "bg-[#151823] border-white/10 hover:bg-[#1C2130] text-white"
            : "bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-900"
        }`}
      >
        <Image
          src={currentLang.icon}
          alt={currentLang.name}
          width={18}
          height={18}
          className="shrink-0"
        />

        <span>{currentLang.name}</span>

        {accessibleLanguages.length > 1 && (
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown Menu (Only shown for enrolled / accessible languages) */}
      {open && accessibleLanguages.length > 1 && (
        <div
          className={`absolute mt-2 w-64 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${
            darkMode
              ? "bg-[#11131B] border-white/10 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          {/* Search Header if > 2 languages */}
          {accessibleLanguages.length > 2 && (
            <div className="p-2.5 border-b border-white/5">
              <div
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border text-xs ${
                  darkMode
                    ? "bg-[#1A1D26] border-white/10"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                <Search size={14} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter enrolled..."
                  className="flex-1 bg-transparent outline-none text-xs"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Languages List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.map((item) => {
              const isSelected = item.id === currentLang.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 text-xs font-medium transition touch-manipulation cursor-pointer ${
                    isSelected
                      ? darkMode
                        ? "bg-[#4F46E5]/20 text-[#818CF8]"
                        : "bg-indigo-50 text-indigo-700 font-bold"
                      : darkMode
                      ? "hover:bg-[#1A1D26] text-slate-300"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Image
                      src={item.icon}
                      alt={item.name}
                      width={18}
                      height={18}
                    />
                    <span>{item.name}</span>
                  </div>

                  {isSelected && (
                    <Check
                      size={15}
                      className={darkMode ? "text-[#818CF8]" : "text-indigo-600"}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
