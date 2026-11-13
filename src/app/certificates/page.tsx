"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, ShieldCheck, CheckCircle2, Download, Printer, Share2, Eye,
  Sparkles, BookOpen, Clock, Lock, CheckCircle, ExternalLink, X, AlertCircle, Play,
  Search, ArrowRight, Bell, Copy, Check, ChevronDown, LayoutGrid, List, TrendingUp,
  QrCode, Shield, Menu, ArrowLeft
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
  const sessionUser = (session?.data as { user?: { email?: string; name?: string } } | undefined)?.user ?? null;
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
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const certPrintRef = useRef<HTMLDivElement>(null);

  // Handle Escape key and body scroll lock for mobile preview modal
  useEffect(() => {
    if (!mobilePreviewOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobilePreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePreviewOpen]);

  useEffect(() => {
    let active = true;
    if (!isPending) {
      if (sessionUser?.email) {
        fetch(`/api/certificates/my-certificates?email=${encodeURIComponent(sessionUser.email)}`)
          .then((r) => r.json())
          .then((d) => {
            if (active) {
              const certs = d.certificates || [];
              setCertificates(certs);
              if (certs.length > 0) {
                const completed = certs.find((c: CertificateItem) => c.isCompleted || c.progress >= 100);
                setSelectedCert(completed || certs[0]);
              }
              setLoading(false);
            }
          })
          .catch(() => { if (active) setLoading(false); });
      } else {
        // Fallback: verify server session before redirecting to avoid client-side race conditions
        fetch("/api/auth/me")
          .then((res) => {
            if (!res.ok) {
              if (active) router.push("/auth");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!active || !data?.user?.email) return;
            fetch(`/api/certificates/my-certificates?email=${encodeURIComponent(data.user.email)}`)
              .then((r) => r.json())
              .then((d) => {
                if (active) {
                  const certs = d.certificates || [];
                  setCertificates(certs);
                  if (certs.length > 0) {
                    const completed = certs.find((c: CertificateItem) => c.isCompleted || c.progress >= 100);
                    setSelectedCert(completed || certs[0]);
                  }
                  setLoading(false);
                }
              })
              .catch(() => { if (active) setLoading(false); });
          })
          .catch(() => {
            if (active) router.push("/auth");
          });
      }
    }
    return () => {
      active = false;
    };
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

  const renderPreviewContent = (isMobile = false) => (
    <div className="space-y-4 sm:space-y-5">
      {/* Header (desktop only, mobile has sticky modal top bar) */}
      {!isMobile && (
        <div className="space-y-0.5 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Award size={16} className="text-indigo-600" /> CERTIFICATE PREVIEW
          </h3>
          <p className="text-[11px] text-slate-600 font-semibold">High-fidelity verified ledger credential render</p>
        </div>
      )}

      {/* A4 CERTIFICATE RENDER FRAME */}
      <div className="relative w-full aspect-[1.414/1] bg-white rounded-xl border-2 border-indigo-600/80 shadow-md p-3 sm:p-4 flex flex-col justify-between text-center select-none overflow-hidden group">
        {/* Top Logo */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
            K
          </div>
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-600">KnowledgeStream AI</span>
        </div>

        {/* Title */}
        <div className="space-y-0.5">
          <h4 className="text-xs sm:text-sm font-black text-slate-900 font-serif leading-tight">Certificate of Completion</h4>
          <p className="text-[7px] sm:text-[8px] text-slate-500 font-black uppercase tracking-widest">THIS IS AWARDED TO</p>
        </div>

        {/* Student Name */}
        <div>
          <h3 className="text-sm sm:text-base font-black text-indigo-700 font-sans tracking-tight truncate">
            {previewStudentName}
          </h3>
          <p className="text-[7px] sm:text-[8px] text-slate-600 font-bold mt-0.5">For successfully completing</p>
          <h5 className="text-[10px] sm:text-xs font-black text-slate-900 mt-0.5 truncate">{previewCourseTitle}</h5>
        </div>

        {/* Bottom Row inside Certificate Frame */}
        <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-[8px]">
          {/* QR Code */}
          <div className="flex items-center gap-1 text-slate-600">
            <QrCode size={18} className="text-slate-800" />
          </div>

          {/* Gold Seal */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-xs border border-white">
            <Award size={13} />
          </div>

          {/* Signatures */}
          <div className="text-right">
            <div className="font-serif italic font-bold text-slate-900 text-[8px] sm:text-[9px]">Ajmeera Chandu</div>
            <div className="text-[6px] sm:text-[7px] text-slate-600 font-semibold">Academic Director</div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handlePrint}
          className="py-2.5 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 min-h-[44px]"
        >
          <Download size={13} /> <span>Download</span>
        </button>
        <button
          onClick={handleCopyLink}
          className="py-2.5 px-2 sm:px-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
        >
          <Share2 size={13} /> <span>Share</span>
        </button>
        <button
          onClick={handleVerifyCert}
          className="py-2.5 px-2 sm:px-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
        >
          <CheckCircle2 size={13} /> <span>Verify URL</span>
        </button>
      </div>

      {/* CERTIFICATE DETAILS SECTION */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)] text-xs">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">CERTIFICATE DETAILS</h4>

        <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] gap-2">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">Course Name</span>
          <span className="font-bold text-[var(--text-primary)] truncate text-right">{previewCourseTitle}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] gap-2">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">Issued On</span>
          <span className="font-bold text-[var(--text-primary)] truncate text-right">{previewIssueDate}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] gap-2">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">Certificate ID</span>
          <span className="font-mono font-bold text-cyan-400 truncate text-right">{previewCertId}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] gap-2">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">Credential Type</span>
          <span className="font-bold text-[var(--text-primary)] truncate text-right">Course Completion (Sample)</span>
        </div>

        <div className="flex justify-between items-center py-1 gap-2">
          <span className="text-[var(--text-secondary)] font-medium shrink-0">Verification Status</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold shrink-0">
            PREVIEW ONLY
          </span>
        </div>
      </div>

      {/* VERIFY CERTIFICATE ID BOX */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">VERIFY CERTIFICATE ID</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Certificate ID"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] font-semibold placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] min-h-[44px]"
          />
          <button
            onClick={handleVerifyCert}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 min-h-[44px] flex items-center justify-center shadow-md shadow-blue-500/20"
          >
            Verify
          </button>
        </div>
      </div>

      {/* QR CODE VERIFICATION BOX */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">QR CODE VERIFICATION</h4>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] shrink-0">
            <QrCode size={36} className="text-[var(--text-primary)]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
              <QrCode size={12} className="text-cyan-400" /> Scan QR Code
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-tight">
              This is a sample certificate QR code. Visual preview reference only.
            </p>
          </div>
        </div>
      </div>

      {/* PUBLIC VERIFICATION LINK BOX */}
      <div className="space-y-1.5 pt-1">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">PUBLIC VERIFICATION LINK</h4>
        <div className="flex items-center justify-between p-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-[11px] text-[var(--text-secondary)] font-medium min-h-[44px]">
          <span className="truncate pr-2">Not Applicable (Sample Preview)</span>
          <button
            onClick={handleCopyLink}
            aria-label="Copy public verification link"
            className="p-2 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans antialiased">
      {/* Unified Left Sidebar */}
      <LeftSidebar
        activeTab="Certificates"
        fullHeight={true}
      />

      {/* Main Container: Split into Center Workspace + Right Certificate Preview */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">
        {/* CENTER MAIN WORKSPACE */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar p-3.5 sm:p-5 pb-28 md:pb-6 flex flex-col gap-4 w-full min-w-0 max-w-full">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Mobile Global Navigation Toggle (< 768px) */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
                  }
                }}
                aria-label="Open navigation menu"
                className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-cyan)] active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">Certificates</h1>
                <p className="text-[11px] sm:text-xs text-[var(--text-muted)] font-medium mt-0.5 truncate">Your achievements. Your proof. Your future.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handleCopyLink}
                className="px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs min-h-[44px]"
              >
                <Share2 size={14} className="text-cyan-400" />
                <span className="hidden sm:inline">Share Achievements</span>
                <span className="sm:hidden">Share</span>
              </button>
              <div className="relative">
                <button className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer">
                  <Bell size={16} />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg-card)]">
                    1
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* TOP 4 STATS CARDS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Card 1: Total Certificates */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg shadow-black/20 flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-1">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">Total Certs</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5 sm:mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 mt-0.5 sm:mt-1 truncate">0 new this month</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Award size={18} />
              </div>
            </div>

            {/* Card 2: Courses Completed */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg shadow-black/20 flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-1">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">Completed</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5 sm:mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 mt-0.5 sm:mt-1 truncate">0 new this month</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <CheckCircle2 size={18} />
              </div>
            </div>

            {/* Card 3: XP Earned */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg shadow-black/20 flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-1">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">XP Earned</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5 sm:mt-1">{totalXp.toString().padStart(2, "0")}</h3>
                <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--text-muted)] mt-0.5 sm:mt-1 truncate">From completed</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <TrendingUp size={18} />
              </div>
            </div>

            {/* Card 4: Verified Certificates */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg shadow-black/20 flex items-center justify-between min-w-0">
              <div className="min-w-0 pr-1">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">Verified</p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-0.5 sm:mt-1">{completedCount.toString().padStart(2, "0")}</h3>
                <p className="text-[9px] sm:text-[10px] font-semibold text-cyan-400 mt-0.5 sm:mt-1 truncate">100% Secure</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                <ShieldCheck size={18} />
              </div>
            </div>
          </div>

          {/* PROGRESS TRACKER MILESTONE BANNER */}
          <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 w-full sm:w-auto custom-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[44px] sm:min-h-0 flex items-center ${
                  activeTab === "all"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xs"
                    : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                All Certificates
              </button>

              <button
                onClick={() => setActiveTab("completion")}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[44px] sm:min-h-0 flex items-center ${
                  activeTab === "completion"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xs"
                    : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                Course Completion
              </button>

              <button
                onClick={() => setActiveTab("skill")}
                className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[44px] sm:min-h-0"
              >
                Skill Certificates <Lock size={12} className="text-[var(--text-muted)]" />
              </button>

              <button
                onClick={() => setActiveTab("achievements")}
                className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[44px] sm:min-h-0"
              >
                Achievements <Lock size={12} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 sm:py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] font-semibold placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] min-h-[44px] sm:min-h-0"
                />
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="px-3 py-2 sm:py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-blue)] min-h-[44px] sm:min-h-0"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid View"
                  className={`p-2 sm:p-1.5 rounded-lg text-xs transition cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
                    viewMode === "grid" ? "bg-[var(--bg-elevated)] text-[var(--brand-cyan)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List View"
                  className={`p-2 sm:p-1.5 rounded-lg text-xs transition cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
                    viewMode === "list" ? "bg-[var(--bg-elevated)] text-[var(--brand-cyan)] font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              <div className="text-xs font-mono font-bold text-[var(--text-muted)] flex items-center gap-2">
                <Sparkles size={16} className="animate-spin text-cyan-400" /> Loading your certificates...
              </div>
            ) : completedCount === 0 ? (
              /* EMPTY STATE CARD */
              <div className="w-full max-w-lg bg-[var(--bg-card)] p-6 sm:p-10 rounded-3xl border border-[var(--border-subtle)] shadow-xl shadow-black/20 flex flex-col items-center text-center my-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs mb-4">
                  <Award size={32} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">You haven&apos;t earned a certificate yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm font-medium leading-relaxed">
                  Complete 100% of the chapters in any course from the catalog to earn your verified credential!
                </p>

                {/* Inner Track Progress Box */}
                <div className="w-full mt-6 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <TrendingUp size={14} /> Track Progress:
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                    <span className="truncate max-w-[240px]">{sampleTrackCourse.courseTitle}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold">{sampleTrackCourse.completedChapters}/{sampleTrackCourse.totalChapters} chapters ({sampleTrackCourse.progress}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${sampleTrackCourse.progress}%` }} />
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 w-full">
                  <button
                    onClick={() => {
                      notify("Viewing verified sample certificate credential preview!", "info");
                      if (typeof window !== "undefined" && window.innerWidth < 768) {
                        setMobilePreviewOpen(true);
                      }
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Sparkles size={14} className="text-cyan-400" /> See what you&apos;ll earn
                  </button>
                  <button
                    onClick={() => router.push("/courses/catalog")}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 min-h-[44px]"
                  >
                    Explore Courses Catalog <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* POPULATED CERTIFICATES GRID/LIST VIEW */
              <div className="w-full">
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" : "space-y-3"}>
                  {certificates.map((cert) => (
                    <div
                      key={cert.courseId}
                        onClick={() => {
                          setSelectedCert(cert);
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setMobilePreviewOpen(true);
                          }
                        }}
                        className={`p-4 sm:p-5 rounded-2xl border transition duration-200 cursor-pointer ${
                          selectedCert?.courseId === cert.courseId
                            ? "bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30 shadow-sm"
                            : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-blue-500/50 shadow-md shadow-black/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-cyan-400 uppercase border border-blue-500/20">
                              {cert.courseLanguage}
                            </span>
                            <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mt-1 truncate">{cert.courseTitle}</h4>
                            <p className="text-xs text-[var(--text-secondary)] font-medium truncate">Issued to {cert.studentName}</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Award size={22} />
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[var(--text-muted)] font-mono font-bold truncate">{cert.certificateId}</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={14} /> Unlocked &amp; Verified
                          </span>
                        </div>

                        {/* Mobile Dedicated Preview Action Button (< 768px) */}
                        <div className="md:hidden mt-3 pt-2 border-t border-[var(--border-subtle)]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCert(cert);
                              setMobilePreviewOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] shadow-xs active:scale-[0.98]"
                          >
                            <Eye size={15} /> View Certificate Preview
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM BANNER */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg border border-blue-400/30">
            <div>
              <h4 className="text-sm font-bold tracking-tight text-white drop-shadow-xs">Share your certified achievements!</h4>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">
                You&apos;re doing great. Explore courses catalog and start engineering new certified credentials.
              </p>
            </div>

            <button
              onClick={() => router.push("/courses/catalog")}
              className="px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md hover:shadow-lg"
            >
              Explore Courses <ArrowRight size={14} />
            </button>
          </div>
        </main>

        {/* RIGHT SIDEBAR: CERTIFICATE PREVIEW PANEL (Desktop >= 768px) */}
        <aside className="hidden md:flex md:w-[360px] lg:w-[420px] bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] h-full flex-col shrink-0 overflow-y-auto custom-scrollbar p-5">
          {renderPreviewContent(false)}
        </aside>
      </div>

      {/* DEDICATED FULL-SCREEN MOBILE CERTIFICATE PREVIEW MODAL (< 768px) */}
      {mobilePreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Certificate Preview"
          className="md:hidden fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col overflow-y-auto custom-scrollbar animate-in fade-in duration-200"
        >
          {/* Mobile Modal Sticky Top Bar */}
          <div className="sticky top-0 z-10 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              aria-label="Back to certificates list"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div className="min-w-0 text-center flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
                Certificate Preview
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold truncate">
                {previewCourseTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mobile Modal Content Body */}
          <div className="p-4 sm:p-5 pb-safe pb-12">
            {renderPreviewContent(true)}
          </div>
        </div>
      )}
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
