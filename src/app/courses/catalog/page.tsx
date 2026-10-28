"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightAIPanel } from "@/components/dashboard/RightAIPanel";
import { Sparkles, BookOpen, Star, Clock, ShieldCheck, CheckCircle, X, ArrowRight } from "lucide-react";

interface CourseCatalogItem {
  id: string;
  title: string;
  description: string;
  language: string;
  price: number;
  level: string;
  category: string;
  thumbnail: string;
  duration: string;
  lessons: number;
  rating: number;
  instructor: string;
}

interface EnrollmentItem {
  id: string;
  courseId: string;
}

interface CatalogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionUserWithRole {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  on?: (event: string, handler: (response: unknown) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface WindowWithRazorpay {
  Razorpay?: RazorpayConstructor;
}

// ============================================================================
// DEMO PURCHASE MODE:
// When true, clicking "Subscribe" triggers an interactive visual demo success flow
// without creating Razorpay payment orders or altering real database enrollments.
// Toggle this to false once Razorpay production credentials are configured.
// ============================================================================
const DEMO_PURCHASE_MODE = true;

const DEMO_CONFETTI_PIECES = [
  { left: 8, width: 8, height: 12, color: "#3B82F6", delay: 0.05, duration: 2.2, rotate: 25 },
  { left: 16, width: 6, height: 10, color: "#10B981", delay: 0.15, duration: 2.5, rotate: -40 },
  { left: 24, width: 9, height: 14, color: "#8B5CF6", delay: 0.1, duration: 2.1, rotate: 60 },
  { left: 32, width: 7, height: 11, color: "#F59E0B", delay: 0.25, duration: 2.7, rotate: -20 },
  { left: 40, width: 8, height: 12, color: "#EC4899", delay: 0.08, duration: 2.3, rotate: 45 },
  { left: 48, width: 10, height: 10, color: "#06B6D4", delay: 0.2, duration: 2.4, rotate: 90 },
  { left: 56, width: 7, height: 13, color: "#6366F1", delay: 0.12, duration: 2.6, rotate: -65 },
  { left: 64, width: 9, height: 11, color: "#10B981", delay: 0.3, duration: 2.2, rotate: 30 },
  { left: 72, width: 6, height: 12, color: "#F59E0B", delay: 0.05, duration: 2.8, rotate: -15 },
  { left: 80, width: 8, height: 10, color: "#EC4899", delay: 0.18, duration: 2.4, rotate: 75 },
  { left: 88, width: 7, height: 14, color: "#3B82F6", delay: 0.22, duration: 2.1, rotate: -50 },
  { left: 94, width: 8, height: 9, color: "#14B8A6", delay: 0.35, duration: 2.9, rotate: 40 },
  { left: 12, width: 7, height: 11, color: "#F43F5E", delay: 0.4, duration: 2.3, rotate: -35 },
  { left: 28, width: 9, height: 9, color: "#8B5CF6", delay: 0.28, duration: 2.5, rotate: 80 },
  { left: 44, width: 7, height: 11, color: "#F59E0B", delay: 0.32, duration: 2.6, rotate: -45 },
  { left: 60, width: 8, height: 13, color: "#3B82F6", delay: 0.45, duration: 2.4, rotate: 15 },
  { left: 76, width: 6, height: 10, color: "#10B981", delay: 0.38, duration: 2.7, rotate: -70 },
  { left: 84, width: 9, height: 12, color: "#A855F7", delay: 0.42, duration: 2.2, rotate: 55 },
  { left: 92, width: 7, height: 9, color: "#06B6D4", delay: 0.5, duration: 2.8, rotate: -30 },
  { left: 5, width: 8, height: 11, color: "#EC4899", delay: 0.48, duration: 2.5, rotate: 65 },
];

const DEFAULT_PREVIEW_COURSE: CourseCatalogItem = {
  id: "course-preview-sample",
  title: "Python Pro: Zero to Hero Architecture",
  description: "Master modern Python programming, AI systems, data pipelines, and distributed applications.",
  language: "python",
  price: 999,
  level: "BEGINNER TO ADVANCED",
  category: "ARTIFICIAL INTELLIGENCE",
  thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
  duration: "40 Hours",
  lessons: 32,
  rating: 4.95,
  instructor: "Codenthra AI",
};

export default function ExploreCoursesCatalogPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const user = useMemo<CatalogUser | null>(() => {
    if (!session?.user) return null;
    const sessionUser = session.user as SessionUserWithRole;
    return {
      id: sessionUser.id,
      name: sessionUser.name ?? "",
      email: sessionUser.email ?? "",
      role: sessionUser.role ?? "Student",
    };
  }, [session]);

  const [activeTab, setActiveTab] = useState("Explore Courses");
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingCourseId, setBuyingCourseId] = useState<string | null>(null);
  const [notifiedCourses, setNotifiedCourses] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Success Modal State (Production Gateway Flow)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCourseLanguage, setSuccessCourseLanguage] = useState("");

  // Demo Purchase Success Modal State (Demo Simulation Flow)
  const [showDemoSuccessModal, setShowDemoSuccessModal] = useState(false);
  const [demoSuccessCourse, setDemoSuccessCourse] = useState<CourseCatalogItem | null>(null);

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      const razorpayObj = typeof window !== "undefined" ? (window as unknown as WindowWithRazorpay).Razorpay : undefined;
      if (razorpayObj) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchCatalogAndEnrollments = useCallback(async (email: string) => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        fetch("/api/courses"),
        fetch(`/api/courses/my-courses?email=${encodeURIComponent(email)}`)
      ]);

      const coursesData = await coursesRes.json();
      const enrollmentsData = await enrollmentsRes.json();

      if (Array.isArray(coursesData)) {
        setCourses(coursesData);
      } else if (coursesData.success && Array.isArray(coursesData.courses)) {
        setCourses(coursesData.courses);
      }

      if (enrollmentsData.enrollments) {
        setEnrollments(enrollmentsData.enrollments);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Unable to load course catalog details.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchedEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;

    if (!session?.user) {
      router.push("/auth");
      return;
    }

    const email = session.user.email || "";
    if (fetchedEmailRef.current !== email) {
      fetchedEmailRef.current = email;
      fetchCatalogAndEnrollments(email);
    }
  }, [session, isPending, router, fetchCatalogAndEnrollments]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handlePreviewPurchaseAnimation = () => {
    const sampleCourse = courses.length > 0 ? courses[0] : DEFAULT_PREVIEW_COURSE;
    setDemoSuccessCourse(sampleCourse);
    setShowDemoSuccessModal(true);
  };

  const handleBuyCourse = async (course: CourseCatalogItem) => {
    // ------------------------------------------------------------------------
    // DEMO-ONLY PURCHASE SUCCESS FLOW:
    // Triggers client-side success animation directly. Bypasses payment gateway
    // order creation and avoids database state changes during demo sessions.
    // ------------------------------------------------------------------------
    if (DEMO_PURCHASE_MODE) {
      setDemoSuccessCourse(course);
      setShowDemoSuccessModal(true);
      return;
    }

    if (!user) return;
    setBuyingCourseId(course.id);

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: course.price,
          currency: "INR",
          courseId: course.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();

      // If user is already enrolled
      if (data.alreadyEnrolled) {
        alert("You are already enrolled in this course!");
        fetchCatalogAndEnrollments(user.email);
        return;
      }

      if (!res.ok || !data.success) {
        alert(data.error || "Order creation failed.");
        return;
      }

      // Free Course Test Mode: Immediate enrollment without opening Razorpay
      if (data.freeTestMode) {
        const enrollRes = await fetch("/api/courses/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: course.id,
          }),
        });

        const enrollData = await enrollRes.json();
        if (enrollData.success) {
          setSuccessCourseLanguage(course.language.toLowerCase());
          setShowSuccessModal(true);
          fetchCatalogAndEnrollments(user.email);
        } else {
          alert(enrollData.error || "Enrollment failed.");
        }
        return;
      }

      const { isMock } = data;

      if (isMock) {
        alert("🔧 Local Dev Mode: Simulating Razorpay Payment Gateway. Click OK to confirm purchase.");
        
        const enrollRes = await fetch("/api/courses/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: user.email,
            courseId: course.id,
            paidAmount: course.price,
            paymentId: `pay_mock_${Date.now()}`,
          }),
        });

        const enrollData = await enrollRes.json();
        if (enrollData.success) {
          setSuccessCourseLanguage(course.language.toLowerCase());
          setShowSuccessModal(true);
          // Refresh enrollments list
          fetchCatalogAndEnrollments(user.email);
        } else {
          alert(enrollData.error || "Enrollment failed.");
        }
      } else {
        const scriptLoaded = await loadRazorpayScript();
        const RazorpayCtor = typeof window !== "undefined" ? (window as unknown as WindowWithRazorpay).Razorpay : undefined;
        if (!scriptLoaded || !RazorpayCtor) {
          alert("Failed to load Razorpay SDK. Please check your internet connection.");
          return;
        }

        const options: RazorpayOptions = {
          key: data.key,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "KnowledgeStream AI",
          description: course.title,
          order_id: data.order.id,
          handler: async function (response: RazorpaySuccessResponse) {
            const enrollRes = await fetch("/api/courses/enroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userEmail: user.email,
                courseId: course.id,
                paidAmount: course.price,
                paymentId: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const enrollData = await enrollRes.json();
            if (enrollData.success) {
              setSuccessCourseLanguage(course.language.toLowerCase());
              setShowSuccessModal(true);
              fetchCatalogAndEnrollments(user.email);
            } else {
              alert(enrollData.error || "Enrollment failed.");
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
        };
        const rzp = new RazorpayCtor(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to complete checkout order.");
    } finally {
      setBuyingCourseId(null);
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#0F172A] flex overflow-hidden font-sans antialiased">
      {/* Left Sidebar Menu */}
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userProfile={user || undefined}
        isLight={false}
        fullHeight={true}
      />

      {/* Center Main Workspace Content Area */}
      <main data-lenis-prevent className="flex-1 overflow-y-auto h-full p-4 sm:p-6 lg:p-8 space-y-6 w-full custom-scrollbar bg-slate-50">
        
        {/* Welcome Header */}
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-100">
              <Sparkles size={12} /> Professional Paths &bull; Browse Catalog
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Explore Available Courses 🚀
            </h1>
            <p className="text-slate-500 text-xs font-medium">
              Unlock access to interactive curricula, Sandbox coding workspaces, speech modules, and AI Mentor tutoring.
            </p>
          </div>

          {DEMO_PURCHASE_MODE && (
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={handlePreviewPurchaseAnimation}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-amber-900 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-300 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
                title="Preview the purchase success animation and confirmation modal without modifying enrollments"
              >
                <Sparkles size={13} className="text-amber-600 animate-pulse" />
                <span>Preview Purchase Animation</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          /* Loading Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-3 animate-pulse">
                <div className="h-24 bg-slate-200 rounded-xl w-full" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-slate-500 text-xs font-medium">{error}</div>
        ) : (
          /* Courses Grid */
          <div className="space-y-8">
            {/* Active Available Courses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-600" /> Active Enrolment Courses ({courses.length})
                </h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Instant Access Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {courses.map((course) => {
                  const isEnrolled = enrollments.some((e) => e.courseId === course.id);
                  const isBuying = buyingCourseId === course.id;

                  return (
                    <div
                      key={course.id}
                      className="glass-panel rounded-2xl border border-slate-200/90 bg-white hover:border-[#4F46E5]/50 transition-all duration-300 shadow-xs flex flex-col justify-between overflow-hidden group hover:shadow-md"
                    >
                      <div
                        onClick={() => {
                          if (isEnrolled) {
                            router.push(`/courses/${course.language.toLowerCase()}`);
                          } else {
                            router.push(`/courses/${course.language.toLowerCase()}/curriculum`);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {/* Thumbnail Banner */}
                        <div className="relative h-28 w-full overflow-hidden">
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 uppercase">
                              {course.level}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-extrabold bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                              <Star size={11} className="fill-amber-400 text-amber-400" />
                              <span>{course.rating}</span>
                            </div>
                          </div>
                        </div>

                        {/* Body Content */}
                        <div className="p-3.5 space-y-1">
                          <span className="text-[9px] font-mono font-black text-[#4F46E5] uppercase tracking-wider block">
                            {course.category}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#4F46E5] transition-colors truncate">
                            {course.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug font-medium">
                            {course.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer specs & purchase triggers */}
                      <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div className="flex flex-col text-[9px] text-slate-500 font-mono leading-tight">
                          <span className="flex items-center gap-1 font-bold">
                            <Clock size={11} className="text-slate-400" /> {course.lessons} Lessons
                          </span>
                          <span className="truncate max-w-[120px]">By {course.instructor}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black text-slate-900">
                            ₹{course.price}
                          </span>
                          
                          {isEnrolled ? (
                            <button
                              onClick={() => {
                                const langClean = (course.language || "").toLowerCase().trim();
                                const targetSlug = langClean === "c++" || langClean === "cpp" ? "cpp" : langClean === "c" ? "c" : langClean === "java" ? "java" : "python";
                                router.push(`/courses/${targetSlug}`);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <CheckCircle size={12} />
                              View Course
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBuyCourse(course);
                              }}
                              disabled={isBuying}
                              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 disabled:opacity-50 shadow-md shadow-blue-500/15 flex items-center gap-1"
                            >
                              <Sparkles size={12} className="animate-pulse" />
                              {isBuying ? "Connecting..." : "Subscribe"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UPCOMING COURSES SECTION - EXACT COLOR GRADING & CARD STYLING */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-100">
                    <Sparkles size={12} /> Next-Gen Curriculum &bull; Coming Soon
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Upcoming Specialization Paths ⏳
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                  Pre-register for early launch access
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  {
                    id: "upcoming-dbms",
                    title: "DBMS & Distributed SQL Systems",
                    category: "DATABASE ENGINEERING",
                    description: "Master Relational Databases, Complex SQL Queries, Indexing, Transactions (ACID), Normalization, and NoSQL Architecture.",
                    level: "INTERMEDIATE",
                    instructor: "Codenthra AI",
                    thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800&auto=format&fit=crop",
                    lessons: 24,
                    price: "₹1999",
                    rating: "4.90"
                  },
                  {
                    id: "upcoming-dsa",
                    title: "Data Structures & Algorithms (DS Mastery)",
                    category: "CORE COMPUTER SCIENCE",
                    description: "Master Arrays, Linked Lists, Trees, Graphs, Dynamic Programming, and System Optimization with LeetCode Problem Solving.",
                    level: "BEGINNER TO ADVANCED",
                    instructor: "Codenthra AI",
                    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
                    lessons: 32,
                    price: "₹2499",
                    rating: "4.98"
                  },
                  {
                    id: "upcoming-ml",
                    title: "Machine Learning & Deep Neural Networks (ML)",
                    category: "ARTIFICIAL INTELLIGENCE",
                    description: "Hands-on ML with Python, Supervised & Unsupervised Learning, PyTorch, Model Deployment, and LLM Engineering.",
                    level: "ADVANCED",
                    instructor: "Codenthra AI",
                    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
                    lessons: 30,
                    price: "₹2999",
                    rating: "4.95"
                  },
                  {
                    id: "upcoming-webdev",
                    title: "Full-Stack Web Architecture (Next.js & Node)",
                    category: "WEB DEVELOPMENT",
                    description: "Build production-ready web apps with Next.js, Node.js, Prisma ORM, WebSockets, TailwindCSS, and Cloud Deployment.",
                    level: "INTERMEDIATE",
                    instructor: "Codenthra AI",
                    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop",
                    lessons: 28,
                    price: "₹1999",
                    rating: "4.92"
                  }
                ].map((item) => {
                  const isNotified = notifiedCourses.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="glass-panel rounded-2xl border border-slate-200/90 bg-white hover:border-[#4F46E5]/50 transition-all duration-300 shadow-xs flex flex-col justify-between overflow-hidden group hover:shadow-md"
                    >
                      <div>
                        {/* Thumbnail Banner - Identical to active cards */}
                        <div className="relative h-28 w-full overflow-hidden">
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 uppercase">
                              {item.level}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-extrabold bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                              <Star size={11} className="fill-amber-400 text-amber-400" />
                              <span>{item.rating}</span>
                            </div>
                          </div>
                        </div>

                        {/* Body Content - Identical fonts & colors */}
                        <div className="p-3.5 space-y-1">
                          <span className="text-[9px] font-mono font-black text-[#4F46E5] uppercase tracking-wider block">
                            {item.category}
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#4F46E5] transition-colors truncate">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug font-medium">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer specs & purchase triggers - Identical colors & buttons */}
                      <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div className="flex flex-col text-[9px] text-slate-500 font-mono leading-tight">
                          <span className="flex items-center gap-1 font-bold">
                            <Clock size={11} className="text-slate-400" /> {item.lessons} Lessons
                          </span>
                          <span className="truncate max-w-[120px]">By {item.instructor}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black text-slate-900">
                            {item.price}
                          </span>

                          <button
                            onClick={() => {
                              setNotifiedCourses((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all shadow-md shadow-blue-500/15 flex items-center gap-1 cursor-pointer ${
                              isNotified
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95"
                                : "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95"
                            }`}
                          >
                            {isNotified ? (
                              <>
                                <CheckCircle size={12} />
                                Notified
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} className="animate-pulse" />
                                Pre-Register 🔔
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right Copilot Panel */}
      <RightAIPanel />

      {/* Subscription Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Subscription Confirmed! 🎉
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Subscribed! You now have access to this course. Your sandbox workspace, notes, chatbot, and exams are fully unlocked.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/courses/${successCourseLanguage}`);
                }}
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 transition-opacity shadow-md"
              >
                Go directly to the course
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                Return to Explore Courses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Purchase Success Modal Overlay */}
      {showDemoSuccessModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowDemoSuccessModal(false)}
        >
          {/* Scoped CSS animations for confetti and checkmark */}
          <style>{`
            @keyframes ksaiConfettiFall {
              0% { transform: translateY(-12px) rotate(0deg); opacity: 1; }
              85% { opacity: 0.85; }
              100% { transform: translateY(380px) rotate(720deg); opacity: 0; }
            }
            @keyframes ksaiModalPop {
              0% { opacity: 0; transform: scale(0.92) translateY(12px); }
              60% { transform: scale(1.02) translateY(-2px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes ksaiDrawCircle {
              0% { stroke-dashoffset: 214; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes ksaiDrawCheck {
              0% { stroke-dashoffset: 50; }
              100% { stroke-dashoffset: 0; }
            }
            .animate-confetti-particle {
              animation-name: ksaiConfettiFall;
              animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
              animation-iteration-count: infinite;
            }
            .animate-ksai-modal {
              animation: ksaiModalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-ksai-circle {
              animation: ksaiDrawCircle 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .animate-ksai-check {
              animation: ksaiDrawCheck 0.45s 0.35s cubic-bezier(0.65, 0, 0.45, 1) both;
            }
          `}</style>

          <div
            className="relative w-full max-w-md sm:max-w-lg rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-8 text-center space-y-5 animate-ksai-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-emerald-400/20 via-blue-500/15 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Subtle Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" aria-hidden="true">
              {DEMO_CONFETTI_PIECES.map((piece, i) => (
                <span
                  key={i}
                  className="absolute block rounded-sm opacity-0 animate-confetti-particle"
                  style={{
                    left: `${piece.left}%`,
                    top: `-10px`,
                    width: `${piece.width}px`,
                    height: `${piece.height}px`,
                    backgroundColor: piece.color,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: `${piece.duration}s`,
                    transform: `rotate(${piece.rotate}deg)`,
                  }}
                />
              ))}
            </div>

            {/* Close 'X' Button in Top Corner */}
            <button
              type="button"
              onClick={() => setShowDemoSuccessModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer z-10"
            >
              <X size={18} />
            </button>

            {/* Success Checkmark Animation with Ambient Pulse */}
            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center pt-1">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
              <div className="absolute inset-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-inner" />
              <svg
                className="relative w-16 h-16 sm:w-20 sm:h-20"
                viewBox="0 0 80 80"
                fill="none"
              >
                {/* Background Track */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#D1FAE5"
                  strokeWidth="5"
                />
                {/* Animated Emerald Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#10B981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="214"
                  strokeDashoffset="0"
                  className="animate-ksai-circle"
                />
                {/* Animated Checkmark */}
                <path
                  d="M26 41 L36 51 L55 31"
                  stroke="#059669"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="50"
                  strokeDashoffset="0"
                  className="animate-ksai-check"
                />
              </svg>
            </div>

            {/* Primary Header & Message */}
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/70">
                <Sparkles size={13} className="text-emerald-500 animate-pulse" />
                <span>Subscription Confirmed</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                You have successfully purchased this course!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                Your enrollment is ready. Dive straight into interactive AI guidance, sandbox exercises, and full course lessons.
              </p>
            </div>

            {/* Course Summary Card */}
            {demoSuccessCourse && (
              <div className="relative z-10 rounded-2xl bg-slate-50 border border-slate-200/90 p-3 sm:p-4 flex items-center gap-3.5 text-left shadow-xs">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <Image
                    src={demoSuccessCourse.thumbnail}
                    alt={demoSuccessCourse.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono font-black text-[#4F46E5] uppercase tracking-wider block truncate">
                    {demoSuccessCourse.category}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">
                    {demoSuccessCourse.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                    <span>{demoSuccessCourse.lessons} Lessons</span>
                    <span>&bull;</span>
                    <span className="font-bold text-emerald-600">Lifetime Access</span>
                  </div>
                </div>
              </div>
            )}

            {/* Demo Mode Notice Badge */}
            <div className="relative z-10 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50/90 border border-amber-200/70 text-amber-800 text-[11px] font-semibold">
              <ShieldCheck size={13} className="text-amber-600 shrink-0" />
              <span>Demo Simulation &bull; No charge was processed</span>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDemoSuccessModal(false);
                  if (demoSuccessCourse) {
                    const langClean = (demoSuccessCourse.language || "").toLowerCase().trim();
                    const targetSlug =
                      langClean === "c++" || langClean === "cpp"
                        ? "cpp"
                        : langClean === "c"
                        ? "c"
                        : langClean === "java"
                        ? "java"
                        : "python";
                    router.push(`/courses/${targetSlug}`);
                  }
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 transition-opacity shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue Learning</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowDemoSuccessModal(false)}
                className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
