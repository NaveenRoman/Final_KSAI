"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    students: any[];
    faculty: any[];
    colleges: any[];
    courses: any[];
  }>({
    students: [],
    faculty: [],
    colleges: [],
    courses: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ students: [], faculty: [], colleges: [], courses: [] });
    }
  }, [isOpen]);

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Live search debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ students: [], faculty: [], colleges: [], courses: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalMatches =
    results.students.length +
    results.faculty.length +
    results.colleges.length +
    results.courses.length;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, faculty, colleges, courses..."
            className="flex-1 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {loading && <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 space-y-4 max-h-[60vh]">
          {query.length < 2 && (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Sparkles size={24} className="mx-auto text-blue-500 opacity-60" />
              <p className="text-xs">Type at least 2 characters to search the platform...</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px]">
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">Students</span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">Faculty</span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">Colleges</span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">Courses</span>
              </div>
            </div>
          )}

          {query.length >= 2 && !loading && totalMatches === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs">No records found matching &quot;{query}&quot;</p>
            </div>
          )}

          {/* Colleges Results */}
          {results.colleges.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Building2 size={12} /> Colleges ({results.colleges.length})
              </span>
              <div className="space-y-1">
                {results.colleges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigateTo(`/admin/colleges?highlight=${c.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {c.code} • {c.location || "Hyderabad"}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Courses Results */}
          {results.courses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <BookOpen size={12} /> Courses ({results.courses.length})
              </span>
              <div className="space-y-1">
                {results.courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigateTo(`/admin/courses`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Track: {c.language?.toUpperCase()} • {c.level}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Students Results */}
          {results.students.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <GraduationCap size={12} /> Students ({results.students.length})
              </span>
              <div className="space-y-1">
                {results.students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigateTo(`/admin/users?role=student&q=${encodeURIComponent(s.name)}`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {s.email} • {s.college || "KnowledgeStream"}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {s.xp} XP
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Faculty Results */}
          {results.faculty.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Users size={12} /> Faculty ({results.faculty.length})
              </span>
              <div className="space-y-1">
                {results.faculty.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => navigateTo(`/admin/users?role=faculty&q=${encodeURIComponent(f.name)}`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {f.email} • {f.department || "Engineering"}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Faculty
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Search KnowledgeStream AI directory</span>
          <span className="text-[10px]">Tip: Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
