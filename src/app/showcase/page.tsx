"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Code2,
  Cpu,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Play,
  Layers,
  Award,
  BookOpen,
  Lock,
  Unlock,
  ChevronRight,
  Monitor,
  Flame,
  FileCode,
  Zap,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

type ShowcaseTab = "overview" | "curriculum" | "editor" | "mastery" | "demo-flow";

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("overview");
  const [selectedCourse, setSelectedCourse] = useState<"java" | "python" | "c" | "cpp">("java");
  const [activeDemoStep, setActiveDemoStep] = useState(1);

  const courseData = {
    java: {
      name: "Java Enterprise Architecture",
      badge: "JVM & Object-Oriented",
      color: "from-amber-500 to-orange-600",
      border: "border-amber-500/30",
      accent: "text-amber-400",
      bgAccent: "bg-amber-500/10",
      chapters: 15,
      challenges: 22,
      multiProgramChapters: "Ch 3 (3 progs), Ch 7, 9, 11, 14, 15",
      highlights: [
        "Bytecode & JVM Runtime Architecture",
        "Encapsulation, Polymorphism & Interface Segregation",
        "Multithreading, Concurrency & Thread Synchronization",
        "Enterprise Collections, Hashtables & File I/O Streams",
      ],
      sampleChallenge: {
        id: "java_3_1",
        title: "Matrix Multiplication & Grid Transformations",
        objective: "Multi-dimensional arrays, nested loop optimization, and memory bounds.",
        chapter: 3,
        progNum: "Program 1 of 3",
      },
    },
    python: {
      name: "Python AI & Data Structures",
      badge: "Dynamic & Machine Learning",
      color: "from-blue-500 to-indigo-600",
      border: "border-blue-500/30",
      accent: "text-blue-400",
      bgAccent: "bg-blue-500/10",
      chapters: 11,
      challenges: 16,
      multiProgramChapters: "Ch 2, 3, 4, 6, 7 (2 progs each)",
      highlights: [
        "Control Structures, List Comprehensions & Generator Functions",
        "Algorithmic Problem Solving (Sorting, Recursion, Dynamic Programming)",
        "Object-Oriented Python & Advanced Metaclass Patterns",
        "Data Pipelines, JSON Serialization & Scientific Vectorization",
      ],
      sampleChallenge: {
        id: "py_01_1",
        title: "BMI & Metabolic Health Calculator",
        objective: "Float arithmetic, conditional tiering, and clean formatted string output.",
        chapter: 1,
        progNum: "Program 1 of 1",
      },
    },
    c: {
      name: "C Systems & Core Architecture",
      badge: "Low-Level & Hardware Bound",
      color: "from-emerald-500 to-teal-600",
      border: "border-emerald-500/30",
      accent: "text-emerald-400",
      bgAccent: "bg-emerald-500/10",
      chapters: 11,
      challenges: 15,
      multiProgramChapters: "Ch 2 (3 progs), Ch 3, 4 (2 progs each)",
      highlights: [
        "Pointer Arithmetic, Manual Heap Memory & Buffer Safety",
        "System Calls, File Descriptors & UNIX Process Forks",
        "Bitwise Logic, Bit Masks & Low-Level Register Manipulation",
        "Custom Data Structures (Linked Lists, Binary Trees) in Pure C",
      ],
      sampleChallenge: {
        id: "c_02_1",
        title: "Sequential Range Accumulator",
        objective: "Loop invariants, integer overflow safety, and formatted standard output.",
        chapter: 2,
        progNum: "Program 1 of 3",
      },
    },
    cpp: {
      name: "C++ Modern OOP & STL Architecture",
      badge: "High Performance & Modern STL",
      color: "from-indigo-500 to-purple-600",
      border: "border-indigo-500/30",
      accent: "text-indigo-400",
      bgAccent: "bg-indigo-500/10",
      chapters: 15,
      challenges: 17,
      multiProgramChapters: "Ch 3 (2 progs), Ch 12 (2 progs)",
      highlights: [
        "Classes, Operator Overloading & Resource Acquisition (RAII)",
        "Standard Template Library (Vectors, Sets, Maps, Lambdas)",
        "Modern Smart Pointers (std::unique_ptr, std::shared_ptr)",
        "C++17/20 Structured Bindings & Multi-threaded Task Concurrency",
      ],
      sampleChallenge: {
        id: "cpp_13_1",
        title: "Shared Ownership Lifecycle with std::shared_ptr",
        objective: "Smart pointer reference counting and automatic heap reclamation.",
        chapter: 13,
        progNum: "Program 1 of 1",
      },
    },
  };

  const currentCourse = courseData[selectedCourse];

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#09090B]/90 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition border border-white/10"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400">
              CODEXA LAUNCH SHOWCASE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 hidden md:inline">
              October 26, 2026 Presentation Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/editor?course=java&chapter=1"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Terminal size={13} />
            <span>Open Cursor IDE</span>
          </Link>
          <Link
            href="/courses"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">Explore Courses</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Showcase Banner */}
        <div className="relative rounded-3xl p-6 sm:p-10 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-purple-950/30 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold border border-cyan-500/20">
              <Sparkles size={13} className="text-cyan-400" />
              <span>Official Video Recording Walkthrough</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Codexa: Intelligent Software Learning & Engineering Platform
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore the five core pillars of Codexa built into KnowledgeStream AI: chapter-specific programming challenges, Cursor-like cloud IDE, sequential mastery progression, 4-gate anti-tamper evaluation, and context-aware AI tutoring.
            </p>
          </div>
        </div>

        {/* Interactive Showcase Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          {[
            { id: "overview", label: "Executive Overview", icon: Layers },
            { id: "curriculum", label: "4 Curriculum Tracks", icon: GraduationCap },
            { id: "editor", label: "Cursor-like IDE & Gate", icon: Terminal },
            { id: "mastery", label: "Strict 4-Gate Mastery", icon: ShieldCheck },
            { id: "demo-flow", label: "Presenter Video Flow", icon: Play },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ShowcaseTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Views */}
        <AnimatePresence mode="wait">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">4 Core Languages & 52 Chapters</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Complete end-to-end curriculum for Java (15 Chs), Python (11 Chs), C (11 Chs), and C++ (15 Chs). Zero skipped topics, matching modern industry and academic standards.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Terminal size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Cursor-like Integrated IDE</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Browser-based Monaco development environment with file explorer, multi-tab buffer, terminal execution, live compiler parsing, and chapter challenge drawer.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Strict 4-Gate Mastery Engine</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated progression requiring Topics + Recap + Quiz (&ge;75%) + Code (&ge;70%) to unlock sequential chapters. Anti-tampering auto-cure prevents false progress.
                  </p>
                </div>
              </div>

              {/* Showcase Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-cyan-400">52</div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Curriculum Chapters</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-blue-400">70</div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Authoritative Challenges</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-purple-400">&ge; 70%</div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Code Passing Threshold</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Server-Side Validation</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: 4 CURRICULUM TRACKS */}
          {activeTab === "curriculum" && (
            <motion.div
              key="curriculum"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Language Switcher Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["java", "python", "c", "cpp"] as const).map((lang) => {
                  const data = courseData[lang];
                  const isSelected = selectedCourse === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => setSelectedCourse(lang)}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer space-y-1.5 ${
                        isSelected
                          ? `bg-gradient-to-br ${data.color} text-white shadow-xl ${data.border}`
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-90">
                        {data.badge}
                      </span>
                      <h4 className="font-black text-sm text-white">{data.name.split(" ")[0]} Mastery</h4>
                      <div className="text-[11px] font-mono opacity-80">
                        {data.chapters} Chs &bull; {data.challenges} Challenges
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Track Deep Dive */}
              <div className={`p-6 sm:p-8 rounded-3xl border ${currentCourse.border} bg-white/5 space-y-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${currentCourse.accent}`}>
                      {currentCourse.badge} Track
                    </span>
                    <h3 className="text-2xl font-black text-white">{currentCourse.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/editor?course=${selectedCourse}&chapter=1`}
                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${currentCourse.color} hover:opacity-90 transition flex items-center gap-1.5`}
                    >
                      <Terminal size={14} />
                      <span>Launch in IDE</span>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                      Key Syllabus Modules
                    </h4>
                    <ul className="space-y-2">
                      {currentCourse.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 size={15} className={`${currentCourse.accent} shrink-0 mt-0.5`} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                        Featured Lab Challenge
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${currentCourse.bgAccent} ${currentCourse.accent}`}>
                        Chapter {currentCourse.sampleChallenge.chapter}
                      </span>
                    </div>
                    <h5 className="font-black text-sm text-white">{currentCourse.sampleChallenge.title}</h5>
                    <p className="text-xs text-slate-400">{currentCourse.sampleChallenge.objective}</p>
                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/10">
                      <span>Sequential Gate: {currentCourse.sampleChallenge.progNum}</span>
                      <span className="text-emerald-400 font-bold">Passing Score &ge; 70%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CURSOR-LIKE IDE & CHALLENGE GATE */}
          {activeTab === "editor" && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Interactive IDE Preview Frame */}
              <div className="rounded-3xl border border-white/15 bg-[#0D0F17] overflow-hidden shadow-2xl">
                {/* Simulated IDE Titlebar */}
                <div className="h-10 px-4 bg-[#11131E] border-b border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 ml-2">
                      Codexa Cursor IDE &bull; Java Enterprise &bull; Chapter 3 Challenge Gate
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Live Evaluation Sandbox
                  </div>
                </div>

                {/* Simulated IDE Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
                  {/* Left: Code Editor Preview */}
                  <div className="lg:col-span-7 p-4 border-r border-white/10 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 text-[11px]">
                      <span>Main.java</span>
                      <span className="text-emerald-400">Compiler: OpenJDK 17</span>
                    </div>
                    <pre className="text-slate-300 leading-relaxed overflow-x-auto text-[11px]">
{`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Chapter 3: Program 1 of 3
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
        // Output transformed array
        System.out.println("Transformed: " + arr.length + " elements");
    }
}`}
                    </pre>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Terminal Output</span>
                        <span className="text-emerald-400 font-bold">&bull; Execution Status: 0</span>
                      </div>
                      <div className="text-[11px] text-slate-200">Running against public sample test cases... OK (0.12s)</div>
                    </div>
                  </div>

                  {/* Right: Challenge Spec Drawer Preview */}
                  <div className="lg:col-span-5 p-4 bg-white/5 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[10px] font-mono uppercase font-bold text-blue-400">
                        Program 1 of 3
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        MEDIUM
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white">Array Transposition & Bounds Validation</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Transform 1D standard input streams into row-major indexed memory structures. Ensure zero out-of-bounds exceptions.
                    </p>

                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Evaluation Passed: 100%</span>
                        </span>
                        <span className="font-mono">4/4 Tests</span>
                      </div>
                      <div className="text-[10px] text-emerald-300">
                        Program 1 mastered. Program 2 is now unlocked!
                      </div>
                    </div>

                    <Link
                      href="/editor?course=java&chapter=3"
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                    >
                      <span>Try Live in Editor</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: STRICT 4-GATE MASTERY ENGINE */}
          {activeTab === "mastery" && (
            <motion.div
              key="mastery"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-xl font-black text-white">Sequential Anti-Tamper Chapter Unlock Engine</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-3xl">
                  Unlike traditional platforms with self-reported checkboxes, Codexa enforces an authoritative 4-gate verification pipeline. Every gate is verified on the backend before the next chapter unlocks.
                </p>

                {/* The 4 Gates Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                  <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">Gate A</span>
                      <BookOpen size={16} className="text-blue-400" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Instructional Topics</h4>
                    <p className="text-[11px] text-slate-400">
                      All reading topics and visual code breakdowns in the chapter must be completed.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Gate B</span>
                      <Sparkles size={16} className="text-purple-400" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Chapter Recap</h4>
                    <p className="text-[11px] text-slate-400">
                      Interactive Socratic concept review and summary synthesis must be verified.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Gate C</span>
                      <HelpCircle size={16} className="text-amber-400" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Assessment Quiz</h4>
                    <p className="text-[11px] text-slate-400">
                      Timed assessment quiz requires a strict score &ge; 75% to pass the gate.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Gate D</span>
                      <Code2 size={16} className="text-emerald-400" />
                    </div>
                    <h4 className="font-bold text-sm text-white">Coding Challenges</h4>
                    <p className="text-[11px] text-slate-400">
                      All sequential programs must compile and pass &ge; 70% against hidden test cases.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-200">
                  <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>Anti-Tamper Auto-Cure:</strong> Any client-side flag tampering or spoofed completion records are detected and automatically reset to locked state on the server.
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: PRESENTER VIDEO FLOW */}
          {activeTab === "demo-flow" && (
            <motion.div
              key="demo-flow"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xl font-black text-white">
                    Showcase Screen Recording Guide (October 26, 2026)
                  </h3>
                  <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    Recommended 3–5 Minute Video Script
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use this sequential demonstration flow when recording the product showcase video. Click each step below to inspect talking points and jump directly into the live feature.
                </p>

                {/* 5-Step Demo Stepper */}
                <div className="space-y-3 pt-2">
                  {[
                    {
                      step: 1,
                      title: "1. Introduce Platform & Homepage",
                      duration: "0:00 - 0:45",
                      talkingPoints:
                        "Highlight KnowledgeStream AI & Codexa vision: unified ecosystem for modern software learners. Show the hero section, course catalog, and interactive 3D simulations.",
                      targetRoute: "/",
                      linkText: "View Landing Page",
                    },
                    {
                      step: 2,
                      title: "2. Explore Course Curriculum (Java, Python, C, C++)",
                      duration: "0:45 - 1:30",
                      talkingPoints:
                        "Navigate to course syllabus. Showcase the 52 chapters covering low-level C memory, C++ STL, Python ML foundations, and Java enterprise architecture.",
                      targetRoute: "/courses",
                      linkText: "Open Course Catalog",
                    },
                    {
                      step: 3,
                      title: "3. Launch Cursor IDE & Programming Challenge Gate",
                      duration: "1:30 - 2:45",
                      talkingPoints:
                        "Open the Cursor-like editor at /editor?course=java&chapter=1. Demonstrate the Monaco editor, file tabs, challenge drawer, constraints, and public I/O sample cases.",
                      targetRoute: "/editor?course=java&chapter=1",
                      linkText: "Launch IDE Demo",
                    },
                    {
                      step: 4,
                      title: "4. Demonstrate Code Execution, AI Help & Diagnostics",
                      duration: "2:45 - 3:45",
                      talkingPoints:
                        "Click 'Test Run' to execute code against public test cases. Showcase AI Socratic hints and compiler error parser detecting issues without spoiling answers.",
                      targetRoute: "/editor?course=java&chapter=1",
                      linkText: "Test Code Execution",
                    },
                    {
                      step: 5,
                      title: "5. Sequential Mastery & 4-Gate Progression",
                      duration: "3:45 - 4:30",
                      talkingPoints:
                        "Showcase sequential program unlocking (Program A score >= 70% unlocks Program B) and the strict 4-Gate requirement for unlocking the next chapter.",
                      targetRoute: "/showcase",
                      linkText: "Review 4-Gate Flow",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={`p-4 rounded-2xl border transition ${
                        activeDemoStep === s.step
                          ? "bg-white/10 border-cyan-500/40 shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/8"
                      }`}
                    >
                      <div
                        onClick={() => setActiveDemoStep(s.step)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                              activeDemoStep === s.step
                                ? "bg-cyan-500 text-black font-black"
                                : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {s.step}
                          </span>
                          <span className="font-bold text-sm text-white">{s.title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          {s.duration}
                        </span>
                      </div>

                      {activeDemoStep === s.step && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-xs">
                          <p className="text-slate-300 leading-relaxed">{s.talkingPoints}</p>
                          <div className="flex items-center gap-2">
                            <Link
                              href={s.targetRoute}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                            >
                              <span>{s.linkText}</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
