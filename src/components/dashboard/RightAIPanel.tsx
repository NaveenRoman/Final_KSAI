"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Code2,
  ChevronRight,
  ChevronLeft,
  Flame,
  Zap,
  Target,
  MessageSquare,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RightAIPanelProps {
  isLight?: boolean;
}

export function RightAIPanel({ isLight = true }: RightAIPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Student Customizable Timer States
  const [initialSeconds, setInitialSeconds] = useState(1500); // Default 25 mins choice
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [timerActive, setTimerActive] = useState(false);
  const [customInputMins, setCustomInputMins] = useState("25");

  // Ref for auto scrolling chat stream to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const setCustomMinutes = (mins: number) => {
    const validMins = Math.max(1, Math.min(360, mins || 1));
    const totalSec = validMins * 60;
    setInitialSeconds(totalSec);
    setTimerSeconds(totalSec);
    setCustomInputMins(validMins.toString());
    setTimerActive(false);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInputMins(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 360) {
      const totalSec = num * 60;
      setInitialSeconds(totalSec);
      setTimerSeconds(totalSec);
      setTimerActive(false);
    }
  };

  const adjustMinutes = (delta: number) => {
    const currentMins = Math.round(initialSeconds / 60);
    setCustomMinutes(currentMins + delta);
  };

  // Chat Stream State
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "ai",
      text: "👋 Hello! I'm KnowledgeStream AI Copilot. How can I help you with your courses, concepts, or code today?",
      time: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Recommended tasks completion state
  const [tasks, setTasks] = useState([
    { id: "1", label: "Complete System Design Chapter 4", done: false, icon: BookOpen },
    { id: "2", label: "Solve 1 SQL Indexing Challenge", done: true, icon: Code2 },
    { id: "3", label: "Generate AI Practice Quiz", done: false, icon: Zap }
  ]);

  // Auto-scroll chat to bottom whenever messages or typing state change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Pomodoro countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const handleSend = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time: "Now"
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          message: userText,
          language: "Java",
          learningLevel: "intermediate"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText =
          data?.response ||
          data?.data?.response ||
          "I can help answer your questions on KnowledgeStream AI!";

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: responseText,
            time: "Just now"
          }
        ]);
      } else {
        throw new Error("Server error");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `🔥 **Course Recommendation:** For developer job placement, we recommend starting with **Java Full Stack Masterclass** and **DBMS & SQL Query Mastery**!`,
          time: "Just now"
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Progress percentage for timer bar
  const progressPercent = Math.min(100, Math.max(0, ((initialSeconds - timerSeconds) / initialSeconds) * 100));

  if (!isOpen) {
    return (
      <aside className="w-12 h-screen border-l border-slate-200 bg-white py-4 flex flex-col items-center sticky top-0 right-0 z-30 hidden xl:flex select-none shadow-xs">
        <button
          onClick={() => setIsOpen(true)}
          className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
          title="Expand AI Copilot"
        >
          <ChevronLeft size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 h-screen border-l border-slate-200 bg-white p-3.5 flex flex-col sticky top-0 right-0 z-30 hidden xl:flex select-none shadow-xs font-sans overflow-hidden">
      
      {/* TOP COPILOT HEADER */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1">
              KnowledgeStream Copilot
            </h3>
            <p className="text-[10px] font-bold text-slate-400">AI Assistant v2.4</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA: POMODORO + GOALS + CHAT */}
      <div className="flex-1 min-h-0 flex flex-col space-y-3 py-2 overflow-hidden">
        
        {/* FOCUS POMODORO WIDGET - SLEEK COMPACT CUSTOM TIMER */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-indigo-600" /> Focus Pomodoro
            </span>
            <span className="text-[9.5px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Flame size={10} className="fill-amber-500 text-amber-500" /> {Math.round(initialSeconds / 60)}m Focus
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between gap-1 bg-white p-0.5 rounded-xl border border-slate-200 text-[9.5px] font-bold">
            {[15, 25, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => setCustomMinutes(mins)}
                disabled={timerActive}
                style={{ color: initialSeconds === mins * 60 ? "#ffffff" : "#475569" }}
                className={`flex-1 py-0.5 rounded-lg transition-all cursor-pointer ${
                  initialSeconds === mins * 60
                    ? "bg-indigo-600 shadow-2xs font-extrabold"
                    : "hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Custom Time Input & Fine Tuning Controls & Digital Display */}
          <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500">
              <span>Custom:</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => adjustMinutes(-5)}
                  disabled={timerActive || Math.round(initialSeconds / 60) <= 5}
                  className="px-1 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] disabled:opacity-40 cursor-pointer"
                  title="Subtract 5 mins"
                >
                  -5m
                </button>
                <button
                  onClick={() => adjustMinutes(-1)}
                  disabled={timerActive || Math.round(initialSeconds / 60) <= 1}
                  className="px-1 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] disabled:opacity-40 cursor-pointer"
                  title="Subtract 1 min"
                >
                  -1m
                </button>
                <button
                  onClick={() => adjustMinutes(1)}
                  disabled={timerActive || Math.round(initialSeconds / 60) >= 360}
                  className="px-1 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] disabled:opacity-40 cursor-pointer"
                  title="Add 1 min"
                >
                  +1m
                </button>
                <button
                  onClick={() => adjustMinutes(5)}
                  disabled={timerActive || Math.round(initialSeconds / 60) >= 355}
                  className="px-1 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] disabled:opacity-40 cursor-pointer"
                  title="Add 5 mins"
                >
                  +5m
                </button>
              </div>
            </div>

            {/* Direct Minute Input & Dynamic Timer Display */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customInputMins}
                  onChange={handleCustomInputChange}
                  disabled={timerActive}
                  placeholder="Mins"
                  className="w-9 text-center font-black text-xs text-indigo-600 bg-transparent focus:outline-none disabled:opacity-50"
                  title="Type any custom minutes (1-360)"
                />
                <span className="text-[9px] font-extrabold text-slate-400 uppercase">min</span>
              </div>

              <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {formatTimer(timerSeconds)}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTimerActive(!timerActive)}
              style={{ color: "#ffffff" }}
              className={`flex-1 py-1.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer ${
                timerActive
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {timerActive ? <Pause size={12} className="text-white" /> : <Play size={12} className="text-white" />}
              {timerActive ? "Pause Focus" : `Start ${Math.round(initialSeconds / 60)}m Focus`}
            </button>

            <button
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(initialSeconds);
              }}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
              title="Reset Session"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* RECOMMENDED GOALS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-1.5 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Target size={13} className="text-indigo-600" /> Recommended Goals
            </span>
            <span className="text-[9px] font-extrabold text-slate-400">
              {tasks.filter((t) => t.done).length}/{tasks.length} Done
            </span>
          </div>

          <div className="space-y-1">
            {tasks.map((task) => {
              const IconComponent = task.icon;
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-1.5 rounded-xl border text-[11px] flex items-center justify-between cursor-pointer transition-all ${
                    task.done
                      ? "bg-emerald-50/60 border-emerald-200 text-slate-400 line-through"
                      : "bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-300 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <IconComponent size={12} className={task.done ? "text-emerald-500" : "text-indigo-600"} />
                    <span className="truncate text-[10.5px]">{task.label}</span>
                  </div>
                  <CheckCircle2
                    size={13}
                    className={task.done ? "text-emerald-600 fill-emerald-100 shrink-0" : "text-slate-300 shrink-0"}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* AI CHAT COPILOT STREAM - DYNAMICALLY EXPANDING FULL VIEWPORT */}
        <div className="flex-1 min-h-0 flex flex-col space-y-2 pt-1">
          <div className="flex items-center justify-between text-[10.5px] font-black text-slate-900 uppercase tracking-wider shrink-0">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={13} className="text-indigo-600" /> Codenthra Chat Stream
            </span>
            <Sparkles size={12} className="text-amber-500" />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex flex-wrap gap-1 shrink-0">
            {[
              { label: "🔥 Which course is best?", query: "Which course is best for developer jobs?" },
              { label: "☕ Java Course Features", query: "What features does Java Full Stack offer?" },
              { label: "📜 How to earn Certificate?", query: "How to earn Skill Passport Certificate?" }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                className="px-1.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-[9.5px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat Messages List - FLEX 1 EXPANDING WITH SMOOTH AUTOSCROLL */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-2.5 rounded-2xl text-xs leading-normal border shadow-2xs ${
                    m.sender === "user"
                      ? "bg-indigo-50/90 border-indigo-200 ml-4"
                      : "bg-slate-50 border-slate-200 mr-2"
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span className={`font-black uppercase tracking-wider ${m.sender === "user" ? "text-indigo-700" : "text-slate-500"}`}>
                      {m.sender === "user" ? "You" : "Codenthra AI"}
                    </span>
                    <span className="text-slate-400">{m.time}</span>
                  </div>
                  <p
                    style={{ color: m.sender === "user" ? "#0f172a" : "#1e293b" }}
                    className={`whitespace-pre-wrap break-words text-xs ${m.sender === "user" ? "font-extrabold" : "font-medium"}`}
                  >
                    {m.text}
                  </p>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 animate-pulse flex items-center gap-2"
                >
                  <Bot size={13} className="text-indigo-600" /> Codenthra AI is thinking...
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatBottomRef} />
          </div>
        </div>
      </div>

      {/* INPUT FORM AT BOTTOM */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="pt-2 border-t border-slate-100 flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Codenthra AI anything..."
          className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
        />
        <button
          type="submit"
          style={{ color: "#ffffff" }}
          className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-2xs"
          title="Send Message"
        >
          <Send size={13} className="text-white" />
        </button>
      </form>
    </aside>
  );
}
