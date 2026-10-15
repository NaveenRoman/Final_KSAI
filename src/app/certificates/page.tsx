"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, ShieldCheck, CheckCircle2, Download, Printer, Share2, Eye,
  Sparkles, BookOpen, Clock, Lock, CheckCircle, ExternalLink, X, AlertCircle, Play,
  Search, ArrowRight, Bell, Copy, Check, ChevronDown, LayoutGrid, List, TrendingUp,
  QrCode, Shield
} from "lucide-react";
import { useNotification } from "@/components/ui/NotificationContext";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";

interface CertificateItem {
  certificateId: string;
  courseId: string;
  courseTitle: string;
  courseLanguage: string;
  courseLevel: string;
  instructor: string;
  studentName: string;
  studentCollege: string;
  studentDepartment: string;
  progress: number;
  completedChapters: number;
  totalChapters: number;
  isCompleted: boolean;
  issueDate: string | null;
  enrolledAt: string;
}

function CertificatesContent() {
  const router = useRouter();
  const { notify } = useNotification();
  const session = useSession();
  const sessionUser = (session?.data as any)?.user ?? null;
  const isPending = session?.isPending ?? false;

  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "completion" | "skill" | "achievements">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [verifyInput, setVerifyInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [lockedCertInfo, setLockedCertInfo] = useState<CertificateItem | null>(null);

  const certPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending) {
      if (sessionUser?.email) {
        fetch(`/api/certificates/my-certificates?email=${encodeURIComponent(sessionUser.email)}`)
          .then((r) => r.json())
          .then((d) => {
            const certs = d.certificates || [];
            setCertificates(certs);
            if (certs.length > 0) {
              const completed = certs.find((c: CertificateItem) => c.isCompleted || c.progress >= 100);
              setSelectedCert(completed || certs[0]);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        router.push("/auth");
      }
    }
  }, [isPending, sessionUser, router]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const link = `https://knowledgestreamai.com/verify/${selectedCert?.certificateId || "KS-AI-SAMPLE-00000"}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    notify("Public verification link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleVerifyCert = () => {
    const input = verifyInput.trim();
    if (!input) {
      notify("Please enter a Certificate ID to verify.", "warning");
      return;
    }
    const cleanId = input.toUpperCase();
    const match = certificates.find((c) => c.certificateId.toUpperCase() === cleanId);
    if (match && (match.isCompleted || match.progress >= 100)) {
      notify(`Certificate ${cleanId} verified! Course: ${match.courseTitle} (${match.studentName}) ✅`, "success");
    } else if (match) {
      notify(`Certificate ${cleanId} is in progress (${match.progress}%). Not yet eligible for completion certification.`, "warning");
    } else {
      notify(`Certificate ID "${cleanId}" not found in verified records. ❌`, "error");
    }
  };

  const completedCount = certificates.filter((c) => c.isCompleted || c.progress >= 100).length;
  const totalXp = completedCount * 500;

  // Sample course for tracking progress display if no certs earned
  const sampleTrackCourse = certificates.length > 0 ? certificates[0] : {
    courseTitle: "C Language Mastery & System Programming",
    completedChapters: 0,
    totalChapters: 11,
    progress: 0,
  };

  // Preview Certificate details
  const previewStudentName = selectedCert?.studentName || sessionUser?.name || "Alex Johnson";
  const previewCourseTitle = selectedCert?.courseTitle || "Python Programming";
  const previewIssueDate = selectedCert?.issueDate 
    ? new Date(selectedCert.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "August 11, 2026";
  const previewCertId = selectedCert?.certificateId || "KS-AI-SAMPLE-00000";

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
      {/* Unified Left Sidebar */}
      <LeftSidebar
        activeTab="Certificates"
        fullHeight={true}
      />

      {/* Main Container: Split into Center Workspace + Right Certificate Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER MAIN WORKSPACE */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Certificates</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Your achievements. Your proof. Your future.</p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Share2 size={14} className="text-slate-500" /> Share Achievements
              </button>
              <div className="relative">
                <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition cursor-pointer">
                  <Bell size={15} />
                  <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    1
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* TOP 4 STATS CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Certificates */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Total Certificates</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">0 new this month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Award size={20} />
              </div>
            </div>

            {/* Card 2: Courses Completed */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Courses Completed</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">0 new this month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>

            {/* Card 3: XP Earned */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">XP Earned From Certs</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalXp.toString().padStart(2, "0")}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1">From completed courses</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Card 4: Verified Certificates */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Verified Certificates</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[10px] font-bold text-cyan-600 mt-1">100% Secure & Verified</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* PROGRESS TRACKER MILESTONE BANNER - LIGHT HIGH CONTRAST CARD */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 px-2.5 py-0.5 rounded-full shadow-2xs">
                    KEEP GOING!
                  </span>
                  <span className="text-xs font-black text-slate-900 truncate max-w-[240px]">
                    {sampleTrackCourse.courseTitle}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">Stage: Enrolled</p>
              </div>
            </div>

            {/* Timeline Steps - 100% Black Bold High Visibility Labels */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full md:w-auto justify-between md:justify-end text-[9px] font-black uppercase tracking-wider py-1">
              <div className="flex flex-col items-center gap-1 min-w-[65px] text-indigo-600">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                  ✓
                </div>
                <span className="font-black text-indigo-700">ENROLLED</span>
                <span className="text-[8px] text-slate-500 lowercase font-bold">Aug 24</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200 shrink-0" />

              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-black">
                  2
                </div>
                <span className="text-slate-800 font-black">IN PROGRESS</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200 shrink-0" />

              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-black">
                  3
                </div>
                <span className="text-slate-800 font-black">HALFWAY</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200 shrink-0" />

              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-black">
                  4
                </div>
                <span className="text-slate-800 font-black">ALMOST THERE</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200 shrink-0" />

              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-black">
                  5
                </div>
                <span className="text-slate-800 font-black">COMPLETED</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-200 shrink-0" />

              <div className="flex flex-col items-center gap-1 min-w-[75px]">
                <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-black">
                  6
                </div>
                <span className="text-slate-800 font-black">CERTIFICATE EARNED</span>
              </div>
            </div>
          </div>

          {/* FILTER TABS & SEARCH CONTROLS BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#4F46E5] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Certificates
              </button>

              <button
                onClick={() => setActiveTab("completion")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === "completion"
                    ? "bg-[#4F46E5] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Course Completion
              </button>

              <button
                onClick={() => setActiveTab("skill")}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                Skill Certificates <Lock size={12} className="text-slate-500" />
              </button>

              <button
                onClick={() => setActiveTab("achievements")}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
              >
                Achievements <Lock size={12} className="text-slate-500" />
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <div className="relative w-40 sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    viewMode === "grid" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    viewMode === "list" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CERTIFICATES DISPLAY AREA */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[350px]">
            {loading ? (
              <div className="text-xs font-mono font-bold text-slate-600 flex items-center gap-2">
                <Sparkles size={16} className="animate-spin text-indigo-600" /> Loading your certificates...
              </div>
            ) : completedCount === 0 ? (
              /* EMPTY STATE CARD - HIGH CONTRAST TEXT */
              <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center my-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs mb-4">
                  <Award size={32} />
                </div>

                <h3 className="text-lg font-black text-slate-900">You haven't earned a certificate yet</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm font-semibold leading-relaxed">
                  Complete 100% of the chapters in any course from the catalog to earn your verified credential!
                </p>

                {/* Inner Track Progress Box */}
                <div className="w-full mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-amber-800 font-black">
                      <TrendingUp size={14} /> Track Progress:
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-black text-slate-900">
                    <span className="truncate max-w-[240px]">{sampleTrackCourse.courseTitle}</span>
                    <span className="text-[11px] text-slate-700 font-extrabold">{sampleTrackCourse.completedChapters}/{sampleTrackCourse.totalChapters} chapters ({sampleTrackCourse.progress}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${sampleTrackCourse.progress}%` }} />
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6 w-full">
                  <button
                    onClick={() => notify("Complete 100% course chapters to unlock verified PDF certificate & QR link!", "info")}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} className="text-indigo-600" /> See what you'll earn
                  </button>
                  <button
                    onClick={() => router.push("/courses/catalog")}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    Explore Courses Catalog <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* POPULATED CERTIFICATES GRID/LIST VIEW */
              <div className="w-full">
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                  {certificates.map((cert) => {
                    const isUnlocked = cert.isCompleted || cert.progress >= 100;
                    return (
                      <div
                        key={cert.courseId}
                        onClick={() => setSelectedCert(cert)}
                        className={`p-5 rounded-2xl border transition duration-200 cursor-pointer ${
                          selectedCert?.courseId === cert.courseId
                            ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-900 uppercase">
                              {cert.courseLanguage}
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-1">{cert.courseTitle}</h4>
                            <p className="text-xs text-slate-600 font-bold">Issued to {cert.studentName}</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Award size={22} />
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-mono font-bold">{cert.certificateId}</span>
                          <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Unlocked & Verified
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM BANNER - VIBRANT INDIGO GRADIENT WITH 100% WHITE TEXT */}
          <div className="rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#3730A3] text-white p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg border border-indigo-400/30">
            <div>
              <h4 className="text-sm font-black tracking-tight text-white drop-shadow-xs">Share your certified achievements!</h4>
              <p className="text-xs text-indigo-100 mt-0.5 font-bold">
                You're doing great. Explore courses catalog and start engineering new certified credentials.
              </p>
            </div>

            <button
              onClick={() => router.push("/courses/catalog")}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-slate-50 text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md hover:shadow-lg"
            >
              Explore Courses <ArrowRight size={14} />
            </button>
          </div>
        </main>

        {/* RIGHT SIDEBAR: CERTIFICATE PREVIEW PANEL - HIGH CONTRAST */}
        <aside className="w-[380px] lg:w-[420px] bg-white border-l border-slate-200 h-full flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Header */}
          <div className="space-y-0.5 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Award size={16} className="text-indigo-600" /> CERTIFICATE PREVIEW
            </h3>
            <p className="text-[11px] text-slate-600 font-semibold">High-fidelity verified ledger credential render</p>
          </div>

          {/* A4 CERTIFICATE RENDER FRAME */}
          <div className="relative w-full aspect-[1.414/1] bg-white rounded-xl border-2 border-indigo-600/80 shadow-md p-4 flex flex-col justify-between text-center select-none overflow-hidden group">
            {/* Top Logo */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                K
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">KnowledgeStream AI</span>
            </div>

            {/* Title */}
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-slate-900 font-serif leading-tight">Certificate of Completion</h4>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">THIS IS AWARDED TO</p>
            </div>

            {/* Student Name */}
            <div>
              <h3 className="text-base font-black text-indigo-700 font-sans tracking-tight">
                {previewStudentName}
              </h3>
              <p className="text-[8px] text-slate-600 font-bold mt-0.5">For successfully completing</p>
              <h5 className="text-xs font-black text-slate-900 mt-0.5">{previewCourseTitle}</h5>
            </div>

            {/* Bottom Row inside Certificate Frame */}
            <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-[8px]">
              {/* QR Code */}
              <div className="flex items-center gap-1 text-slate-600">
                <QrCode size={20} className="text-slate-800" />
              </div>

              {/* Gold Seal */}
              <div className="w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-xs border border-white">
                <Award size={14} />
              </div>

              {/* Signatures */}
              <div className="text-right">
                <div className="font-serif italic font-bold text-slate-900 text-[9px]">Ajmeera Chandu</div>
                <div className="text-[7px] text-slate-600 font-semibold">Academic Director</div>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className="py-2 px-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Download size={13} /> Download
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Share2 size={13} /> Share
            </button>
            <button
              onClick={handleVerifyCert}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={13} /> Verify URL
            </button>
          </div>

          {/* CERTIFICATE DETAILS SECTION - HIGH CONTRAST */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">CERTIFICATE DETAILS</h4>
            
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Course Name</span>
              <span className="font-black text-slate-900">{previewCourseTitle}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Issued On</span>
              <span className="font-black text-slate-900">{previewIssueDate}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Certificate ID</span>
              <span className="font-mono font-black text-indigo-700">{previewCertId}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Credential Type</span>
              <span className="font-black text-slate-900">Course Completion (Sample)</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-700 font-bold">Verification Status</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black">
                PREVIEW ONLY
              </span>
            </div>
          </div>

          {/* VERIFY CERTIFICATE ID BOX */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">VERIFY CERTIFICATE ID</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Certificate ID"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={handleVerifyCert}
                className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
              >
                Verify
              </button>
            </div>
          </div>

          {/* QR CODE VERIFICATION BOX */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700">QR CODE VERIFICATION</h4>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                <QrCode size={40} className="text-slate-800" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                  <QrCode size={12} className="text-indigo-600" /> Scan QR Code
                </p>
                <p className="text-[10px] text-slate-700 font-medium leading-tight">
                  This is a sample certificate QR code. Visual preview reference only.
                </p>
              </div>
            </div>
          </div>

          {/* PUBLIC VERIFICATION LINK BOX */}
          <div className="space-y-1.5 pt-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700">PUBLIC VERIFICATION LINK</h4>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 font-bold">
              <span className="truncate pr-2">Not Applicable (Sample Preview)</span>
              <button
                onClick={handleCopyLink}
                className="p-1 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer shrink-0"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#F8FAFC] flex items-center justify-center text-xs font-mono font-bold text-slate-500">Loading Certificates...</div>}>
      <CertificatesContent />
    </Suspense>
  );
}

