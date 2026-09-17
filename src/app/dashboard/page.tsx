"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { normalizeUserRole, getRoleDashboardPath } from "@/lib/roles";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { handleUserLogout } from "@/lib/auth-logout";
import { 
  BookOpen, Star, Sparkles, Trophy, Settings, LogOut, ChevronLeft, ChevronRight,
  TrendingUp, Award, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Terminal, ShieldCheck, Flame, Send, Bot, MessageSquare, GraduationCap, Code2,
  Bell, Search, Check, CheckSquare, Target, Edit3, X, RefreshCw, Lock
} from "lucide-react";

interface CourseSlide {
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  courseLanguage: string;
  progressPercent: number;
  completedChaptersCount: number;
  totalChaptersCount: number;
  currentChapter: {
    id: string;
    title: string;
    orderNumber: number;
    description: string;
  } | null;
  upNext: {
    title: string;
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Force Light Mode on Mount
  useEffect(() => {
    document.documentElement.classList.add("light");
    document.body.classList.add("light");
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme !== "light") {
        document.documentElement.classList.remove("light");
        document.body.classList.remove("light");
      }
    };
  }, []);

  // Dashboard state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Carousels state
  const [currentLearnIndex, setCurrentLearnIndex] = useState(0);
  const [currentCompleteIndex, setCurrentCompleteIndex] = useState(0);
  const learnAutoplayRef = useRef<NodeJS.Timeout | null>(null);
  const completeAutoplayRef = useRef<NodeJS.Timeout | null>(null);
  const [pausedLearn, setPausedLearn] = useState(false);
  const [pausedComplete, setPausedComplete] = useState(false);

  // AI Teacher chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "Ask me anything. I'm here to help you learn!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Weekly Goals modal & lock state
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [editTargetChapters, setEditTargetChapters] = useState(2);
  const [editTargetQuizzes, setEditTargetQuizzes] = useState(10);
  const [editTargetAIChats, setEditTargetAIChats] = useState(5);
  const [savingGoals, setSavingGoals] = useState(false);
  const [isGoalsLocked, setIsGoalsLocked] = useState(false);
  const [lockAlertMessage, setLockAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const lockedUntil = localStorage.getItem("ksai_goals_locked_until");
      if (lockedUntil) {
        const lockTime = parseInt(lockedUntil, 10);
        if (Date.now() < lockTime) {
          setIsGoalsLocked(true);
        } else {
          localStorage.removeItem("ksai_goals_locked_until");
          setIsGoalsLocked(false);
        }
      }
    } catch {
      setIsGoalsLocked(false);
    }
  }, []);

  const handleSaveGoals = () => {
    if (isGoalsLocked) {
      setIsGoalsModalOpen(false);
      setLockAlertMessage("🔒 This week's goals are already locked! Goal customization will unlock next Monday.");
      return;
    }

    setSavingGoals(true);
    setData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        weeklyGoals: {
          ...prev.weeklyGoals,
          chapters: { ...(prev.weeklyGoals?.chapters || {}), target: editTargetChapters },
          quizzes: { ...(prev.weeklyGoals?.quizzes || {}), target: editTargetQuizzes },
          aiSessions: { ...(prev.weeklyGoals?.aiSessions || {}), target: editTargetAIChats },
        },
      };
    });

    // Calculate next Monday timestamp
    const d = new Date();
    const day = d.getDay();
    const daysUntilMonday = (7 - day + 1) % 7 || 7;
    const nextMonday = new Date(d.setDate(d.getDate() + daysUntilMonday));
    nextMonday.setHours(0, 0, 0, 0);

    localStorage.setItem("ksai_goals_locked_until", nextMonday.getTime().toString());
    setIsGoalsLocked(true);

    setTimeout(() => {
      setSavingGoals(false);
      setIsGoalsModalOpen(false);
      setLockAlertMessage("🔒 Weekly goals set and locked for this week! Customization unlocks next Monday.");
    }, 300);
  };

  // Search & Profile Menu states and refs
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const ALL_SEARCH_TOPICS = [
    { title: "Java Enterprise & Object-Oriented Architecture", path: "/courses/java/curriculum", category: "Java Course", icon: "☕" },
    { title: "C Language Mastery & System Programming", path: "/courses/c/curriculum", category: "C Course", icon: "⚡" },
    { title: "C++ Object-Oriented & STL Mastery", path: "/courses/cpp/curriculum", category: "C++ Course", icon: "🚀" },
    { title: "Python AI & Data Structures Mastery", path: "/courses/python/curriculum", category: "Python Course", icon: "🐍" },
    { title: "Data Structures & Algorithms (DSA)", path: "/courses/cpp/curriculum", category: "Topic", icon: "📊" },
    { title: "Object-Oriented Programming (OOPs)", path: "/courses/java/curriculum", category: "Core Concept", icon: "💡" },
    { title: "Pointers & Dynamic Memory Management", path: "/courses/c/curriculum", category: "C Topic", icon: "🧠" },
    { title: "Generics & Collections Framework", path: "/courses/java/curriculum", category: "Java Topic", icon: "📦" },
    { title: "AI Practice Workspace & Quiz Generator", path: "/quiz-generator", category: "AI Tool", icon: "🤖" },
    { title: "Interactive Coding Editor", path: "/workspace", category: "IDE Workspace", icon: "💻" },
    { title: "Weekly Leaderboard Rankings", path: "/leaderboard", category: "Community", icon: "🏆" },
  ];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return ALL_SEARCH_TOPICS.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleLogout = async () => {
    await handleUserLogout();
  };

  // Heartbeat ping effect
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "HEARTBEAT" })
        });
      } catch (err) {
        console.error("Heartbeat log failed:", err);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch dashboard metrics
  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/dashboard", { signal });
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (!res.ok) {
        if (!signal?.aborted) {
          setError("Failed to load dashboard metrics");
        }
        return;
      }
      const json = await res.json();
      if (json.success && !signal?.aborted) {
        if (json.user?.role) {
          const normRole = normalizeUserRole(json.user.role);
          if (normRole !== "STUDENT") {
            router.replace(getRoleDashboardPath(normRole));
            return;
          }
        }
        setData(json);
      } else if (!signal?.aborted) {
        setError(json.error || "Failed to load dashboard metrics");
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && !signal?.aborted) {
        console.warn("Dashboard fetch warning:", err.message);
        setError(err.message || "Network error loading dashboard.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (!isPending) {
      if (!session) {
        router.push("/auth");
      } else {
        // Redirect non-student roles to their specialized dashboards
        const rawRole = (session?.user as any)?.role;
        if (rawRole) {
          const normRole = normalizeUserRole(rawRole);
          if (normRole !== "STUDENT") {
            router.replace(getRoleDashboardPath(normRole));
            return;
          }
        }
        fetchDashboardData(controller.signal);
      }
    }
    return () => {
      controller.abort();
    };
  }, [session, isPending, router]);

  // Continue Learning Autoplay Control
  const startLearnAutoplay = () => {
    stopLearnAutoplay();
    if (!pausedLearn && data?.continueLearningCourses && data.continueLearningCourses.length > 1) {
      learnAutoplayRef.current = setInterval(() => {
        setCurrentLearnIndex((prev) => (prev + 1) % data.continueLearningCourses.length);
      }, 5000);
    }
  };

  const stopLearnAutoplay = () => {
    if (learnAutoplayRef.current) {
      clearInterval(learnAutoplayRef.current);
      learnAutoplayRef.current = null;
    }
  };

  const triggerManualLearnSelect = (index: number) => {
    stopLearnAutoplay();
    setPausedLearn(true);
    setCurrentLearnIndex(index);
    setTimeout(() => {
      setPausedLearn(false);
    }, 6000);
  };

  // Course Completion Autoplay Control
  const startCompleteAutoplay = () => {
    stopCompleteAutoplay();
    if (!pausedComplete && data?.continueLearningCourses && data.continueLearningCourses.length > 1) {
      completeAutoplayRef.current = setInterval(() => {
        setCurrentCompleteIndex((prev) => (prev + 1) % data.continueLearningCourses.length);
      }, 6000);
    }
  };

  const stopCompleteAutoplay = () => {
    if (completeAutoplayRef.current) {
      clearInterval(completeAutoplayRef.current);
      completeAutoplayRef.current = null;
    }
  };

  const triggerManualCompleteSelect = (index: number) => {
    stopCompleteAutoplay();
    setPausedComplete(true);
    setCurrentCompleteIndex(index);
    setTimeout(() => {
      setPausedComplete(false);
    }, 6000);
  };

  useEffect(() => {
    if (data?.continueLearningCourses) {
      startLearnAutoplay();
    }
    return () => stopLearnAutoplay();
  }, [data, pausedLearn]);

  useEffect(() => {
    if (data?.continueLearningCourses) {
      startCompleteAutoplay();
    }
    return () => stopCompleteAutoplay();
  }, [data, pausedComplete]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // AI Teacher Send Message
  const handleSendChat = async (inputQuery: string, quickActionType?: string) => {
    const query = inputQuery.trim();
    if (!query && !quickActionType) return;

    let userPromptText = query;
    if (quickActionType === "explain") {
      userPromptText = "Can you explain the main concept of my current course chapter in simple terms?";
    } else if (quickActionType === "quiz") {
      userPromptText = "Generate a practice quiz question related to my current lesson!";
    } else if (quickActionType === "debug") {
      userPromptText = "How do I debug common syntax or logic errors in my code?";
    } else if (quickActionType === "summarize") {
      userPromptText = "Give me a quick 3-bullet summary of my study progress today.";
    }

    setChatMessages((prev) => [...prev, { sender: "user", text: userPromptText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userPromptText })
      });

      const responseData = await res.json();
      if (res.ok && responseData.reply) {
        setChatMessages((prev) => [...prev, { sender: "ai", text: responseData.reply }]);
      } else {
        setChatMessages((prev) => [
          ...prev, 
          { sender: "ai", text: responseData.error || "Sorry, I couldn't process that right now. Please try again!" }
        ]);
      }
    } catch (err) {
      console.error("AI Teacher chat failed:", err);
      setChatMessages((prev) => [
        ...prev, 
        { sender: "ai", text: "Network error connecting to AI Teacher. Please check your internet connection." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const {
  stats,
  continueLearningCourses = [],
  learningProgress,
  weeklyGoals,
  dailyRecap,
  heatmap = [],
  recommended = [],
  notifications: rawNotifications = {
    unreadCount: 0,
    list: [],
  },
} = data || {};
  const activeUser = data?.user || {};
  const firstName = activeUser.name ? activeUser.name.split(" ")[0] : "Student";

  // Compute Weekend Pending Goals Notification & Alert (Must be called unconditionally at top level for React Rules of Hooks)
  const computedNotifications = useMemo(() => {
    const rawList = rawNotifications?.list || [];
    let unreadCount = rawNotifications?.unreadCount || 0;

    const d = new Date();
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 6 || day === 0;

    const chaptersDone = weeklyGoals?.chapters?.current ?? 0;
    const chaptersTarget = weeklyGoals?.chapters?.target ?? 2;
    const quizzesDone = weeklyGoals?.quizzes?.current ?? 0;
    const quizzesTarget = weeklyGoals?.quizzes?.target ?? 10;
    const aiDone = weeklyGoals?.aiSessions?.current ?? 0;
    const aiTarget = weeklyGoals?.aiSessions?.target ?? 5;

    const isPendingGoals = chaptersDone < chaptersTarget || quizzesDone < quizzesTarget || aiDone < aiTarget;

    if (isWeekend && isPendingGoals) {
      const daysLeft = day === 6 ? 2 : 1;
      const pendingItems: string[] = [];
      if (chaptersDone < chaptersTarget) pendingItems.push(`${chaptersTarget - chaptersDone} Chapters`);
      if (quizzesDone < quizzesTarget) pendingItems.push(`${quizzesTarget - quizzesDone} Quizzes`);
      if (aiDone < aiTarget) pendingItems.push(`${aiTarget - aiDone} AI Chats`);

      const weekendAlertNotice = {
        id: "weekly-goal-weekend-alert",
        title: daysLeft === 1 ? "⚠️ 1 Day Left for Weekly Goals!" : "⚠️ 2 Days Left for Weekly Goals!",
        message: `You have pending targets (${pendingItems.join(", ")}). Only ${daysLeft} day${daysLeft > 1 ? "s" : ""} left to complete your goals before Monday reset!`,
        read: false,
        createdAt: new Date().toISOString(),
        isUrgent: true,
      };

      unreadCount += 1;
      return {
        unreadCount,
        list: [weekendAlertNotice, ...rawList],
        weekendPendingAlert: {
          daysLeft,
          pendingText: pendingItems.join(", "),
        },
      };
    }

    return {
      unreadCount,
      list: rawList,
      weekendPendingAlert: null,
    };
  }, [rawNotifications, weeklyGoals]);

  const notifications = computedNotifications;

  if (loading) {
    return (
      <div className="h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center flex-col space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#4F46E5] animate-spin" />
        <div className="text-slate-600 text-sm font-mono font-bold">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center flex-col space-y-4">
        <div className="p-8 rounded-3xl border border-red-200 bg-red-50/50 max-w-md text-center space-y-4 shadow-sm">
          <AlertTriangle className="text-red-500 mx-auto" size={40} />
          <h2 className="text-lg font-bold text-slate-900">Dashboard Error</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <LeftSidebar 
        activeTab="Dashboard" 
        userProfile={activeUser}
        isLight={false}
        fullHeight={true}
      />

      {/* Main Right Area — Single-Screen Viewport Fit Dashboard */}
      <main className="flex-1 h-full flex flex-col justify-between overflow-hidden p-2.5 sm:p-3 xl:p-3.5 gap-1.5 sm:gap-2 xl:gap-2.5 w-full min-w-0">
        
        {/* Header Row */}
        <div className="flex items-center justify-between flex-shrink-0 gap-3">
          <div>
            <h1 className="text-lg sm:text-xl xl:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
              Welcome back, {firstName}! <span className="animate-bounce inline-block text-base">👋</span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 leading-none mt-0.5">
              Keep learning, keep growing. You&apos;re doing great!
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Functional Search Input with Live Dropdown */}
            <div className="relative hidden md:block" ref={searchRef}>
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (searchResults.length > 0) {
                      router.push(searchResults[0].path);
                      setSearchOpen(false);
                    } else if (searchQuery.trim()) {
                      router.push(`/courses/catalog?search=${encodeURIComponent(searchQuery)}`);
                      setSearchOpen(false);
                    }
                  }
                }}
                placeholder="Search courses, topics..." 
                className="pl-8 pr-3 py-1 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 w-44 sm:w-52 lg:w-60 focus:outline-none focus:border-[#4F46E5] placeholder-slate-400 font-medium shadow-2xs transition-all"
              />

              {/* Live Search Results Dropdown */}
              {searchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-10 w-80 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 scrollbar-thin animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Search Results ({searchResults.length})
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      No matching courses or topics found.
                    </div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          router.push(item.path);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/60 transition-colors flex items-center gap-2.5 group cursor-pointer border border-transparent hover:border-indigo-100"
                      >
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-800 truncate group-hover:text-[#4F46E5] transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {item.category}
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-slate-400 group-hover:text-[#4F46E5] shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Notification Icon */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-7.5 h-7.5 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all hover:shadow-2xs cursor-pointer"
              >
                <Bell size={14} />
                {notifications?.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {notifications.unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-10 w-80 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 scrollbar-thin">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Notifications</span>
                    <span className="text-[10px] text-slate-400 font-medium">{notifications?.unreadCount} unread</span>
                  </div>
                  {notifications.list.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No notifications yet.</div>
                  ) : (
                    notifications.list.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-2 rounded-xl text-left text-xs transition-colors cursor-pointer border ${
                          n.read ? "bg-white border-transparent text-slate-500" : "bg-blue-50/40 border-slate-100 text-slate-800 hover:bg-blue-50/70"
                        }`}
                      >
                        <div className="font-extrabold flex items-center justify-between gap-2">
                          <span>{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar Button & Click Popover Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="focus:outline-none cursor-pointer group flex items-center gap-1.5"
                title="View Profile Details"
              >
                {activeUser.image ? (
                  <img 
                    src={activeUser.image} 
                    alt={activeUser.name || "User Profile"} 
                    className="w-7.5 h-7.5 rounded-full object-cover border-2 border-slate-200 group-hover:border-[#4F46E5] shadow-2xs transition-all"
                  />
                ) : (
                  <div className="w-7.5 h-7.5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-black text-[11px] shadow-2xs border-2 border-slate-200 group-hover:border-[#4338CA] transition-all">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Profile Dropdown Popover Card */}
              {profileMenuOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-fadeIn">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    {activeUser.image ? (
                      <img
                        src={activeUser.image}
                        alt={activeUser.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                        {firstName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="text-xs font-black text-slate-900 truncate leading-snug">
                        {activeUser.name || "Ajmeera Chandu"}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {activeUser.email || "student@knowledgestream.ai"}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[#4F46E5] text-[9px] font-black uppercase tracking-wider border border-indigo-100">
                          {activeUser.role || "Student"}
                        </span>
                        {activeUser.college && (
                          <span className="text-[10px] text-slate-400 font-bold truncate">
                            • {activeUser.college}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Navigation Links */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-400" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push("/courses");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <BookOpen size={14} className="text-slate-400" />
                      <span>My Enrolled Courses</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push("/leaderboard");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <Trophy size={14} className="text-slate-400" />
                      <span>Leaderboard Rankings</span>
                    </button>
                  </div>

                  {/* Divider & Logout */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut size={14} className="text-red-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Header Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Logout"
            >
              <LogOut size={12} className="text-red-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Weekend Pending Goals Alert Banner */}
        {computedNotifications.weekendPendingAlert && (
          <div className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-between shadow-2xs shrink-0 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">⚠️</span>
              <p className="text-[11px] text-slate-700 font-medium truncate">
                <span className="font-black text-slate-900">
                  {computedNotifications.weekendPendingAlert.daysLeft === 1 ? "1 Day Left:" : "2 Days Left:"}
                </span>{" "}
                Incomplete goals ({computedNotifications.weekendPendingAlert.pendingText}). Finish before reset!
              </p>
            </div>
            <button
              onClick={() => router.push("/courses")}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] transition shadow-2xs shrink-0 cursor-pointer"
            >
              Finish Targets →
            </button>
          </div>
        )}

        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-4 gap-2 xl:gap-2.5 flex-shrink-0 select-none h-[68px] xl:h-[72px] 2xl:h-[78px]">
          {/* Courses Enrolled */}
          <div className="p-2 xl:p-2.5 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex items-center gap-2.5 xl:gap-3 h-full min-w-0">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg xl:rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center leading-none">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate">Courses Enrolled</span>
              <span className="text-lg xl:text-xl font-black text-slate-900 leading-tight mt-0.5">{stats?.coursesCount ?? 0}</span>
              <span className="text-[10px] font-bold text-emerald-600 mt-0.5 truncate">
                ↑ {stats?.newThisMonth ?? 0} new <span className="text-slate-400 font-normal">this month</span>
              </span>
            </div>
          </div>

          {/* Chapters Completed */}
          <div className="p-2 xl:p-2.5 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex items-center gap-2.5 xl:gap-3 h-full min-w-0">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg xl:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center space-y-0.5 leading-none">
              <div className="flex justify-between items-end leading-none gap-1">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate">Chapters Completed</span>
                <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">Out of {stats?.totalChaptersCount ?? 0}</span>
              </div>
              <span className="text-lg xl:text-xl font-black text-slate-900 leading-tight">{stats?.completedChaptersCount ?? 0}</span>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${stats?.chaptersPercentage ?? 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 font-mono font-bold shrink-0">{stats?.chaptersPercentage ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Quiz Accuracy */}
          <div className="p-2 xl:p-2.5 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex items-center gap-2.5 xl:gap-3 h-full min-w-0">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg xl:rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Trophy size={16} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center leading-none">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate">Quiz Accuracy</span>
              <span className="text-lg xl:text-xl font-black text-slate-900 leading-tight mt-0.5">{stats?.quizAccuracy ?? 0}%</span>
              <span className="text-[10px] font-bold text-emerald-600 mt-0.5 truncate">
                ↑ {stats?.quizImprovement ?? 0}% <span className="text-slate-400 font-normal">improvement</span>
              </span>
            </div>
          </div>

          {/* Learning Streak */}
          <div className="p-2 xl:p-2.5 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex items-center gap-2.5 xl:gap-3 h-full min-w-0">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg xl:rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
              <Flame size={16} className="animate-pulse" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center leading-none">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate">Learning Streak</span>
              <span className="text-lg xl:text-xl font-black text-slate-900 leading-tight mt-0.5">{stats?.streak ?? 0} Days</span>
              <span className="text-[10px] font-bold text-orange-500 mt-0.5 truncate">
                Keep it up! 🔥
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================== */}
{/* 13D — TODAY'S LEARNING RECAP */}
{/* ===================================================== */}

<div className="flex-shrink-0 p-1.5 xl:p-2 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/40 shadow-2xs">

  <div className="flex items-center gap-2 xl:gap-3">

    {/* Header */}
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
        <TrendingUp size={13} />
      </div>

      <div className="leading-tight">
        <h3 className="text-[11px] font-black text-slate-900 leading-none">
          Today&apos;s Learning
        </h3>

        <p className="text-[8.5px] text-slate-500 font-medium leading-none mt-0.5">
          Daily recap
        </p>
      </div>
    </div>

    {/* Metrics */}
    <div className="grid grid-cols-6 gap-1.5 flex-1 min-w-0">

      {/* Activities */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-slate-400 truncate">
          Activity
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.events?.total ?? 0}
        </span>
      </div>

      {/* Questions */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-blue-100 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-blue-500 truncate">
          Questions
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.events?.questions ?? 0}
        </span>
      </div>

      {/* Practice */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-emerald-100 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-emerald-500 truncate">
          Practice
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.events?.practice ?? 0}
        </span>
      </div>

      {/* Mistakes */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-red-100 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-red-500 truncate">
          Mistakes
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.events?.mistakes ?? 0}
        </span>
      </div>

      {/* Corrections */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-amber-100 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-amber-600 truncate">
          Correct
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.events?.corrections ?? 0}
        </span>
      </div>

      {/* Topics */}
      <div className="px-2 py-0.5 rounded-lg bg-white border border-purple-100 flex items-center justify-between min-w-0">
        <span className="text-[8px] uppercase tracking-wider font-black text-purple-500 truncate">
          Topics
        </span>

        <span className="text-xs font-black text-slate-900 ml-1">
          {dailyRecap?.topicsCount ?? 0}
        </span>
      </div>

    </div>

    {/* Learning Summary */}
    <div className="hidden 2xl:block max-w-[200px] shrink-0 leading-tight">
      <div className="text-[8px] uppercase tracking-wider font-black text-indigo-600">
        AI Summary
      </div>

      <p className="text-[9px] text-slate-600 font-medium truncate mt-0.5">
        {dailyRecap?.summary || "Start learning today and your progress will appear here."}
      </p>
    </div>

  </div>

  {/* Strength / Weak Concept Strip */}
  {(dailyRecap?.strengths?.length > 0 ||
    dailyRecap?.weakConcepts?.length > 0) && (

    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-blue-100">

      {dailyRecap?.strengths?.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-emerald-600">
            💪 Strength:
          </span>

          {dailyRecap.strengths
            .slice(0, 3)
            .map((topic: string) => (
              <span
                key={`strength-${topic}`}
                className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700"
              >
                {topic}
              </span>
            ))}
        </div>
      )}

      {dailyRecap?.weakConcepts?.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-red-600">
            🔄 Review:
          </span>

          {dailyRecap.weakConcepts
            .slice(0, 3)
            .map((topic: string) => (
              <span
                key={`review-${topic}`}
                className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[9px] font-bold text-red-700"
              >
                {topic}
              </span>
            ))}
        </div>
      )}

    </div>
  )}

</div>

        {/* Middle Row: Continue Learning (2 cols) & Skill Mastery Matrix (3 cols) */}
        <div className="grid grid-cols-5 gap-2 xl:gap-2.5 flex-1 min-h-0 overflow-hidden">
          
          {/* Continue Learning Carousel - Ultra-Premium Modern Card */}
          <div className="col-span-2 p-2.5 xl:p-3 2xl:p-3.5 rounded-xl xl:rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-slate-50/50 via-white to-indigo-50/20 flex flex-col justify-between shadow-2xs relative group h-full overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-xs">
                  <Play size={11} className="text-white fill-white ml-0.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-[13px] font-black text-slate-900 tracking-tight leading-none">
                    Continue Learning
                  </h3>
                  <span className="text-[9px] text-slate-500 font-medium block leading-none mt-0.5">
                    Pick up right where you left off
                  </span>
                </div>
              </div>

              {continueLearningCourses.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-full border border-indigo-200">
                    {currentLearnIndex + 1}/{continueLearningCourses.length}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={() => triggerManualLearnSelect((currentLearnIndex - 1 + continueLearningCourses.length) % continueLearningCourses.length)}
                      className="w-5 h-5 rounded-md bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={11} />
                    </button>
                    <button 
                      onClick={() => triggerManualLearnSelect((currentLearnIndex + 1) % continueLearningCourses.length)}
                      className="w-5 h-5 rounded-md bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer"
                    >
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {continueLearningCourses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shadow-xs">
                  🎓
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-slate-900">No active course in progress</div>
                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Choose from our Python, Java, C++, or C curricula to start learning.
                  </p>
                </div>
                <button 
                  onClick={() => router.push("/courses/catalog")}
                  className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 transition-opacity cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between pt-1.5 relative space-y-2 min-h-0">
                {continueLearningCourses.map((course: CourseSlide, idx: number) => {
                  if (idx !== currentLearnIndex) return null;

                  const lang = (course.courseLanguage || "python").toLowerCase();
                  const langTag =
                    lang === "java"
                      ? { label: "Java Enterprise", bg: "bg-amber-50 text-amber-700 border-amber-200" }
                      : lang === "cpp"
                      ? { label: "Modern C++", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" }
                      : lang === "c"
                      ? { label: "C Language", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                      : { label: "Python AI", bg: "bg-cyan-50 text-cyan-700 border-cyan-200" };

                  return (
                    <div key={course.courseId} className="flex-1 flex flex-col justify-between space-y-1.5 min-h-0">
                      {/* Course Card Top Row */}
                      <div className="p-2 xl:p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex gap-2.5 items-start">
                        <div className="relative shrink-0">
                          <img 
                            src={course.courseThumbnail} 
                            alt={course.courseTitle}
                            className="w-12 h-12 xl:w-13 xl:h-13 rounded-lg object-cover border border-slate-200 shadow-2xs"
                          />
                          <span className={`absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-mono font-black border uppercase ${langTag.bg}`}>
                            {lang.toUpperCase()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.2 rounded border ${langTag.bg}`}>
                              {langTag.label}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">
                              {course.completedChaptersCount}/{course.totalChaptersCount || 11} Ch.
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-[13px] font-black text-slate-900 truncate tracking-tight leading-snug">
                            {course.courseTitle}
                          </h4>

                          <div className="text-[11px] font-black text-indigo-700 flex items-center gap-1 truncate">
                            <Sparkles size={11} className="text-indigo-600 shrink-0" />
                            <span className="truncate">Chapter {course.currentChapter?.orderNumber ?? 1}: {course.currentChapter?.title || "Concept Overview"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar Section */}
                      <div className="space-y-1 px-0.5">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-700 leading-none">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            Current Completion
                          </span>
                          <span className="font-mono text-indigo-600 font-black text-[10px] bg-indigo-50 px-1.5 py-0.2 rounded-md border border-indigo-200">
                            {course.progressPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 p-0.2 border border-slate-200/60 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 rounded-full transition-all duration-500 shadow-xs"
                            style={{ width: `${Math.max(5, course.progressPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button 
                          onClick={() => {
                            const startOrder = course.currentChapter?.orderNumber ?? ((course.courseLanguage === "c" || course.courseLanguage === "python") ? 0 : 1);
                            router.push(`/courses/${course.courseLanguage}/chapter/${startOrder}`);
                          }}
                          className="py-1.5 px-3 rounded-lg text-xs font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 transition-all text-center cursor-pointer shadow-xs shadow-blue-500/20 flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          <span>Resume</span>
                          <ArrowRight size={12} />
                        </button>
                        <button 
                          onClick={() => router.push(`/courses/${course.courseLanguage}/curriculum`)}
                          className="py-1.5 px-3 rounded-lg text-xs font-black text-slate-800 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 transition-all text-center cursor-pointer shadow-2xs flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          <BookOpen size={12} className="text-slate-600" />
                          <span>Curriculum</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Dot Pagination */}
                {continueLearningCourses.length > 1 && (
                  <div className="flex justify-center items-center gap-1 pt-0.5">
                    {continueLearningCourses.map((_course: CourseSlide, dIdx: number) => (
                      <button
                        key={dIdx}
                        onClick={() => triggerManualLearnSelect(dIdx)}
                        className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                          dIdx === currentLearnIndex ? "bg-indigo-600 w-4 shadow-xs" : "bg-slate-300 hover:bg-slate-400 w-1"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gamified Skill Mastery & XP Progress Graph (100% Dynamic Real Data) */}
          {(() => {
            const currentXp = activeUser?.xp ?? 0;
            const currentLevel = activeUser?.level ?? 1;
            const targetXp = activeUser?.targetXp ?? 1000;

            const levelTitle = currentLevel >= 10 
              ? "Level 10 Grandmaster" 
              : currentLevel >= 5 
              ? "Level 5 Tech Master" 
              : currentLevel >= 3 
              ? "Level 3 Code Warrior" 
              : "Level 1 Code Novice";

            // Dynamic Attribute Power Scores (0% for new users)
            const dsaPower = stats?.chaptersPercentage ?? 0;
            const quizAccuracyPower = stats?.quizAccuracy ?? 0;
            const aiCollabPower = Math.min((weeklyGoals?.aiSessions?.current ?? 0) * 20, 100);
            const streakPower = Math.min((stats?.streak ?? 0) * 20, 100);

            const getTierName = (val: number) => {
              if (val >= 85) return "Grandmaster";
              if (val >= 70) return "Master";
              if (val >= 50) return "Expert";
              if (val >= 25) return "Warrior";
              return "Novice";
            };

            // Dynamic Weekly XP Wave Chart (Extracted from heatmap current week)
            const currentWeekDays = (heatmap && heatmap.length > 0) ? heatmap[heatmap.length - 1]?.days || [] : [];
            const dailyActivityCounts = currentWeekDays.map((d: any) => d.count || 0);
            const dailyXpList = dailyActivityCounts.map((count: number) => count * 40);
            const maxDayXp = Math.max(...dailyXpList, 100);

            // SVG Y coords (80 = 0 XP / bottom, 15 = max XP / top)
            const yCoords = dailyXpList.length === 7
              ? dailyXpList.map((xp: number) => 80 - Math.round((xp / maxDayXp) * 65))
              : [80, 80, 80, 80, 80, 80, 80];

            const totalWeeklyXp = dailyXpList.reduce((a: number, b: number) => a + b, 0);
            const avgVelocity = Math.round(totalWeeklyXp / 7);

            // Dynamic Badges Status
            const isSpeedDemonUnlocked = (stats?.completedChaptersCount ?? 0) > 0;
            const isStreakMasterUnlocked = (stats?.streak ?? 0) >= 3;
            const isQuizTitanUnlocked = (stats?.quizAccuracy ?? 0) >= 80;
            const isGrandChampionUnlocked = (stats?.completedChaptersCount ?? 0) >= (stats?.totalChaptersCount ?? 999) && (stats?.totalChaptersCount ?? 0) > 0;

            return (
              <div className="col-span-3 p-2.5 xl:p-3 2xl:p-3.5 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-2xs relative space-y-1.5 h-full overflow-hidden">
                
                {/* Header: Gamified Level & XP Velocity */}
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 animate-pulse">
                      ⚡
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-[13px] font-black text-slate-900 flex items-center gap-1.5 leading-none">
                        Skill Mastery & XP Journey Matrix 🎮
                      </h3>
                      <p className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">
                        Real-time gamified performance tracking & XP growth curve
                      </p>
                    </div>
                  </div>

                  {/* Player Level Badge */}
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 px-2 py-0.5 rounded-lg shrink-0">
                    <ShieldCheck size={13} className="text-[#4F46E5]" />
                    <div>
                      <div className="text-[9px] font-black uppercase text-[#4F46E5] tracking-wider leading-none">
                        {levelTitle}
                      </div>
                      <div className="text-[8px] font-mono font-extrabold text-slate-600 leading-none mt-0.5">
                        {currentXp} / {targetXp} XP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid: Skill Radar Breakdown (Left) + Weekly XP Area Wave Chart (Right) */}
                <div className="grid grid-cols-2 gap-2 xl:gap-2.5 items-stretch flex-1 min-h-0 overflow-hidden py-0.5">
                  
                  {/* Left Column: Multi-Attribute Skill Mastery Meters */}
                  <div className="space-y-1 bg-slate-50/70 p-2 xl:p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-900 border-b border-slate-200/60 pb-0.5">
                      <span>⚡ Attribute Power Breakdown</span>
                      <span className="text-[8.5px] text-indigo-600 uppercase font-mono font-bold">Live Status</span>
                    </div>

                    {/* Skill 1: DSA & Logic */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-slate-700 leading-none">
                        <span className="flex items-center gap-1">🧠 Logic & DSA Power</span>
                        <span className="text-[#4F46E5]">{dsaPower}% • {getTierName(dsaPower)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${dsaPower}%` }} />
                      </div>
                    </div>

                    {/* Skill 2: Quiz Accuracy */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-slate-700 leading-none">
                        <span className="flex items-center gap-1">🎯 Quiz Accuracy & Retention</span>
                        <span className="text-purple-600">{quizAccuracyPower}% • {getTierName(quizAccuracyPower)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${quizAccuracyPower}%` }} />
                      </div>
                    </div>

                    {/* Skill 3: AI Collaboration */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-slate-700 leading-none">
                        <span className="flex items-center gap-1">🤖 AI Prompting & Debugging</span>
                        <span className="text-emerald-600">{aiCollabPower}% • {getTierName(aiCollabPower)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-600 rounded-full transition-all duration-500" style={{ width: `${aiCollabPower}%` }} />
                      </div>
                    </div>

                    {/* Skill 4: Streak Consistency */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-slate-700 leading-none">
                        <span className="flex items-center gap-1">🔥 Consistency & Streak</span>
                        <span className="text-amber-600">{stats?.streak || 0} Days • {getTierName(streakPower)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${streakPower}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Weekly XP Velocity Area Wave Chart */}
                  <div className="flex flex-col justify-between h-full bg-slate-50/70 p-2 xl:p-2.5 rounded-xl border border-slate-100 space-y-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-900 flex items-center gap-1">
                        📈 Weekly XP Growth Wave
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-mono text-[8px] font-black uppercase">
                        2x XP Weekend 🔥
                      </span>
                    </div>

                    {/* Dynamic SVG Area Curve Chart */}
                    <div className="h-16 xl:h-20 w-full relative pt-1">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 85">
                        <defs>
                          <linearGradient id="xpGradientDynamic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal Grid lines */}
                        <line x1="0" y1="20" x2="300" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                        <line x1="0" y1="50" x2="300" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />

                        {/* Dynamic Area Fill under curve */}
                        <path
                          d={`M 0 ${yCoords[0]} L 50 ${yCoords[1]} L 100 ${yCoords[2]} L 150 ${yCoords[3]} L 200 ${yCoords[4]} L 250 ${yCoords[5]} L 300 ${yCoords[6]} L 300 85 L 0 85 Z`}
                          fill="url(#xpGradientDynamic)"
                        />

                        {/* Dynamic Smooth Wave Line */}
                        <path
                          d={`M 0 ${yCoords[0]} L 50 ${yCoords[1]} L 100 ${yCoords[2]} L 150 ${yCoords[3]} L 200 ${yCoords[4]} L 250 ${yCoords[5]} L 300 ${yCoords[6]}`}
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Dynamic Interactive Points */}
                        <circle cx="0" cy={yCoords[0]} r="3" fill="#4F46E5" />
                        <circle cx="50" cy={yCoords[1]} r="3" fill="#4F46E5" />
                        <circle cx="100" cy={yCoords[2]} r="3" fill="#4F46E5" />
                        <circle cx="150" cy={yCoords[3]} r="3" fill="#4F46E5" />
                        <circle cx="200" cy={yCoords[4]} r="3" fill="#4F46E5" />
                        <circle cx="250" cy={yCoords[5]} r="4" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
                        <circle cx="300" cy={yCoords[6]} r="3" fill="#4F46E5" />
                      </svg>

                      {/* Days Labels */}
                      <div className="flex justify-between text-[8px] font-mono font-extrabold text-slate-400 pt-0.5">
                        <span>MON</span>
                        <span>TUE</span>
                        <span>WED</span>
                        <span>THU</span>
                        <span>FRI</span>
                        <span className="text-amber-600 font-black">SAT</span>
                        <span>SUN</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-600 pt-0.5 border-t border-slate-200/60">
                      <span>Velocity: <strong className="text-[#4F46E5]">+{avgVelocity} XP / day</strong></span>
                      <span className="text-emerald-600 font-black">Total: +{totalWeeklyXp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Achievement Badges Footer Strip */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 flex-shrink-0 text-xs">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    🏆 Achievements
                  </span>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-1 border ${
                      isSpeedDemonUnlocked
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                    }`}>
                      {isSpeedDemonUnlocked ? "⚡ Speed Demon" : "🔒 Speed Demon"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-1 border ${
                      isStreakMasterUnlocked
                        ? "bg-indigo-50 border-indigo-200 text-[#4F46E5]"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                    }`}>
                      {isStreakMasterUnlocked ? "🔥 Streak Master" : "🔒 Streak Master"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-1 border ${
                      isQuizTitanUnlocked
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                    }`}>
                      {isQuizTitanUnlocked ? "🎯 Quiz Titan" : "🔒 Quiz Titan"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black flex items-center gap-1 border ${
                      isGrandChampionUnlocked
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                    }`}>
                      {isGrandChampionUnlocked ? "👑 Grand Champion" : "🔒 Grand Champion"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bottom Row: Donut Chart, Goals, Heatmap */}
        <div className="grid grid-cols-3 gap-2 xl:gap-2.5 flex-shrink-0 h-[145px] xl:h-[160px] 2xl:h-[175px]">
          
          {/* Learning Progress Donut */}
          <div className="p-2 xl:p-2.5 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between overflow-hidden relative select-none h-full">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider pb-0.5 border-b border-slate-100 flex-shrink-0 leading-none">
              Learning Progress
            </h3>
            
            <div className="flex items-center gap-2.5 py-0.5 flex-1 min-h-0">
              <div className="relative w-16 h-16 xl:w-18 xl:h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" className="stroke-slate-100 fill-none" strokeWidth="7" />
                  <circle cx="40" cy="40" r="30" className="stroke-slate-300 fill-none" strokeWidth="7" 
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - (100 / 100) * (2 * Math.PI * 30)}
                  />
                  <circle cx="40" cy="40" r="30" className="stroke-[#7C3AED] fill-none" strokeWidth="7" 
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - ((learningProgress?.completedPercentage + learningProgress?.inProgressPercentage) / 100) * (2 * Math.PI * 30)}
                  />
                  <circle cx="40" cy="40" r="30" className="stroke-emerald-500 fill-none" strokeWidth="7" 
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - (learningProgress?.completedPercentage / 100) * (2 * Math.PI * 30)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] xl:text-xs font-black text-slate-900 leading-none font-mono">{learningProgress?.overallProgressPercent ?? 0}%</span>
                  <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-wide mt-0.5">Overall</span>
                </div>
              </div>

              {/* Legends list */}
              <div className="flex-1 space-y-0.5 text-[9.5px] xl:text-[10.5px] text-slate-700 font-bold min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Completed</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 shrink-0 text-[9px] xl:text-[10px]">{learningProgress?.completedCount} ({learningProgress?.completedPercentage}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] shrink-0" />
                    <span className="truncate">In Progress</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 shrink-0 text-[9px] xl:text-[10px]">{learningProgress?.inProgressCount} ({learningProgress?.inProgressPercentage}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="truncate">Remaining</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 shrink-0 text-[9px] xl:text-[10px]">{learningProgress?.remainingCount} ({learningProgress?.remainingPercentage}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Goals Widget */}
          <div className="p-2 xl:p-2.5 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between overflow-hidden relative select-none h-full">
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100 flex-shrink-0 gap-1 leading-none">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 truncate">
                This Week&apos;s Goals {isGoalsLocked && <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">LOCKED</span>}
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (isGoalsLocked) {
                    setLockAlertMessage("🔒 Weekly goals are locked for the current week to maintain your learning focus. Customization will unlock next Monday!");
                    return;
                  }
                  setEditTargetChapters(weeklyGoals?.chapters?.target ?? 2);
                  setEditTargetQuizzes(weeklyGoals?.quizzes?.target ?? 10);
                  setEditTargetAIChats(weeklyGoals?.aiSessions?.target ?? 5);
                  setIsGoalsModalOpen(true);
                }}
                className={`text-[9.5px] font-extrabold flex items-center gap-1 cursor-pointer transition shrink-0 ${
                  isGoalsLocked
                    ? "text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200"
                    : "text-[#4F46E5] hover:underline"
                }`}
              >
                {isGoalsLocked ? <Lock size={10} className="text-amber-600" /> : <Edit3 size={10} />}
                {isGoalsLocked ? "Locked" : "Edit Goals"}
              </button>
            </div>
            
            <div className="space-y-1 py-0.5 flex-1 flex flex-col justify-center text-[9.5px] xl:text-[10px] text-slate-700 font-extrabold">
              <div className="space-y-0.5">
                <div className="flex justify-between items-center leading-none">
                  <span className="flex items-center gap-1 truncate">🟢 Complete {weeklyGoals?.chapters?.target ?? 2} Chapters</span>
                  <span className="font-mono text-slate-500 font-bold text-[9px] shrink-0">{weeklyGoals?.chapters?.current ?? 0}/{weeklyGoals?.chapters?.target ?? 2}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, ((weeklyGoals?.chapters?.current ?? 0) / (weeklyGoals?.chapters?.target ?? 2)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between items-center leading-none">
                  <span className="flex items-center gap-1 truncate">🎯 Solve {weeklyGoals?.quizzes?.target ?? 10} Quiz Questions</span>
                  <span className="font-mono text-slate-500 font-bold text-[9px] shrink-0">{weeklyGoals?.quizzes?.current ?? 0}/{weeklyGoals?.quizzes?.target ?? 10}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, ((weeklyGoals?.quizzes?.current ?? 0) / (weeklyGoals?.quizzes?.target ?? 10)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between items-center leading-none">
                  <span className="flex items-center gap-1 truncate">🤖 AI Practice &amp; Chats</span>
                  <span className="font-mono text-slate-500 font-bold text-[9px] shrink-0">{weeklyGoals?.aiSessions?.current ?? 0}/{weeklyGoals?.aiSessions?.target ?? 5}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, ((weeklyGoals?.aiSessions?.current ?? 0) / (weeklyGoals?.aiSessions?.target ?? 5)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-center pt-0.5 border-t border-slate-100 flex-shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setEditTargetChapters(weeklyGoals?.chapters?.target ?? 2);
                  setEditTargetQuizzes(weeklyGoals?.quizzes?.target ?? 10);
                  setEditTargetAIChats(weeklyGoals?.aiSessions?.target ?? 5);
                  setIsGoalsModalOpen(true);
                }} 
                className="text-[9.5px] font-black text-[#4F46E5] hover:underline cursor-pointer leading-none"
              >
                Manage &amp; Customize Goals
              </button>
            </div>
          </div>

          {/* LeetCode Style Coding Activity Heatmap */}
          <div className="p-2 xl:p-2.5 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between overflow-hidden relative select-none h-full space-y-1">
            <div className="flex items-center justify-between pb-0.5 border-b border-slate-100 flex-shrink-0 leading-none">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Coding Activity Matrix 🟩
              </h3>
              <span className="text-[8px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                {heatmap.reduce((sum: number, w: any) => sum + w.days.reduce((dSum: number, d: any) => dSum + d.count, 0), 0)} Submissions
              </span>
            </div>
            
            <div className="flex flex-col justify-between flex-1 min-h-0 pt-0.5 space-y-1">
              {/* LeetCode Green Grid Matrix */}
              <div className="flex gap-0.5 sm:gap-1 justify-between items-center overflow-x-hidden py-0.5">
                {heatmap.map((week: any, wIdx: number) => (
                  <div key={wIdx} className="flex flex-col gap-0.5 shrink-0">
                    {week.days.map((day: any, dIdx: number) => (
                      <div 
                        key={dIdx}
                        title={`${day.date}: ${day.count} coding submissions`}
                        className={`w-2 h-2 xl:w-2.5 xl:h-2.5 rounded-2xs transition-all duration-200 hover:scale-125 cursor-pointer shadow-xs ${
                          day.intensity === 0 
                            ? "bg-slate-100 border border-slate-200/40 hover:bg-slate-200/60" 
                            : day.intensity === 1 
                            ? "bg-[#9BE9A8] border border-[#6CC686]" 
                            : day.intensity === 2 
                            ? "bg-[#40C463] border border-[#2E994B]" 
                            : day.intensity === 3 
                            ? "bg-[#30A14E] border border-[#237A39]" 
                            : "bg-[#216E39] border border-[#144A24] shadow-sm shadow-emerald-700/20"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* LeetCode Heatmap Swatches Legend */}
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider pt-0.5 border-t border-slate-100 flex-shrink-0">
                <span>Less</span>
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-2xs bg-slate-100 border border-slate-200/60" />
                  <div className="w-2 h-2 rounded-2xs bg-[#9BE9A8]" />
                  <div className="w-2 h-2 rounded-2xs bg-[#40C463]" />
                  <div className="w-2 h-2 rounded-2xs bg-[#30A14E]" />
                  <div className="w-2 h-2 rounded-2xs bg-[#216E39]" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended for You Row */}
        <div className="p-1.5 xl:p-2 px-2.5 sm:px-3 rounded-xl xl:rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between overflow-hidden flex-shrink-0 h-[56px] xl:h-[60px] 2xl:h-[66px] select-none">
          <div className="flex items-center justify-between pb-0.5 border-b border-slate-100 flex-shrink-0 leading-none">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider leading-none">
              Recommended for You
            </h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">Based on progress</span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin flex-shrink-0 relative">
            {recommended.length === 0 ? (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">All courses fully enrolled! Outstanding progress!</span>
            ) : (
              recommended.map((course: any) => (
                <div 
                  key={course.id}
                  onClick={() => {
                    if (course.badge === "Review Required") {
                      router.push(`/courses/${course.language}/curriculum`);
                    } else {
                      router.push(`/courses/${course.language}/curriculum`);
                    }
                  }}
                  className="flex-shrink-0 w-48 sm:w-52 p-1 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-[#4F46E5]/40 flex gap-2 items-center cursor-pointer transition-all hover:scale-[1.01] group shadow-2xs"
                >
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.2">
                    <div className="flex items-center justify-between gap-1 leading-none">
                      <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded border leading-none ${
                        course.badge === "Review Required" 
                          ? "bg-red-50 border-red-200 text-red-600" 
                          : "bg-indigo-50 border-indigo-100 text-[#4F46E5]"
                      }`}>
                        {course.badge}
                      </span>
                      <div className="flex items-center gap-0.5 text-[9px] text-amber-500 font-bold shrink-0">
                        <Star size={9} className="fill-amber-400 text-amber-500" />
                        <span>{course.rating}</span>
                      </div>
                    </div>
                    <h4 className="text-[10px] sm:text-[11px] font-black text-slate-900 truncate group-hover:text-[#4F46E5] transition-colors leading-tight">
                      {course.title}
                    </h4>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Weekly Goals Modal */}
        {isGoalsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Target size={18} className="text-[#4F46E5]" /> Customize Weekly Goals 🎯
                </h3>
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {isGoalsLocked && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                    <Lock size={16} className="text-amber-600 shrink-0" />
                    <span>This week&apos;s goals are locked to maintain focus. Goal customization will unlock next Monday!</span>
                  </div>
                )}

                {/* Target Chapters */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex justify-between">
                    <span>🟢 Target Chapters / Week</span>
                    <span className="font-mono text-[#4F46E5] font-black">{editTargetChapters} Chapters</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={editTargetChapters}
                    disabled={isGoalsLocked}
                    onChange={(e) => setEditTargetChapters(Number(e.target.value))}
                    className="w-full accent-[#4F46E5] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Target Quiz Questions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex justify-between">
                    <span>🎯 Target Quiz Questions / Week</span>
                    <span className="font-mono text-purple-600 font-black">{editTargetQuizzes} Quizzes</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={editTargetQuizzes}
                    disabled={isGoalsLocked}
                    onChange={(e) => setEditTargetQuizzes(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Target AI Sessions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex justify-between">
                    <span>🤖 Target AI Sessions / Week</span>
                    <span className="font-mono text-emerald-600 font-black">{editTargetAIChats} Sessions</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={editTargetAIChats}
                    disabled={isGoalsLocked}
                    onChange={(e) => setEditTargetAIChats(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoals}
                  disabled={savingGoals}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isGoalsLocked
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                  }`}
                >
                  {savingGoals ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : isGoalsLocked ? (
                    "🔒 Goals Locked for Week"
                  ) : (
                    "Save Goals & Lock for Week"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lock Alert Notice Modal */}
        {lockAlertMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-amber-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <Lock size={28} />
              </div>
              <h3 className="text-base font-black text-slate-900">Weekly Goals Locked 🔒</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed px-2">
                {lockAlertMessage}
              </p>
              <button
                type="button"
                onClick={() => setLockAlertMessage(null)}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-sm cursor-pointer"
              >
                Got It, Keep Learning!
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
