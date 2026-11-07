"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import {
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Printer,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Globe,
  Mail,
  Phone,
  MapPin,
  User,
  Briefcase,
  Code2,
  GraduationCap,
  ArrowLeft,
  FileCheck,
  Target,
  LayoutTemplate,
  Wand2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
  Menu
} from "lucide-react";

// Initial Clean Candidate Profile (User enters their own details)
const INITIAL_CANDIDATE = {
  personalInfo: {
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    githubUrl: "",
  },
  summary: "",
  skills: [] as string[],
  experience: [] as Array<{
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    bullets: string[];
  }>,
  projects: [] as Array<{
    id: string;
    title: string;
    techStack: string;
    description: string;
    bullets: string[];
  }>,
  education: [] as Array<{
    id: string;
    institution: string;
    degree: string;
    startDate: string;
    endDate: string;
    gpa: string;
  }>,
};

// Sample JDs for quick testing presets
const SAMPLE_JDS = [
  {
    company: "Google",
    title: "Senior Full-Stack AI Engineer",
    text: `Looking for a Senior Full-Stack AI Engineer to build cloud developer tools using Next.js 16, React, TypeScript, and TailwindCSS. Integrate Gemini AI models for real-time code execution, speech dictation, and automated debugging. Experience in Java Spring Boot or Python FastAPI microservices required. Key skills: GraphQL, Microservices, Kubernetes, System Architecture.`,
  },
  {
    company: "Amazon AWS",
    title: "Backend Java Specialist",
    text: `Seeking Backend Java Engineer to design high-concurrency microservices using Java 21, Spring Boot, Kafka, Redis, and PostgreSQL. Implement unit testing, CI/CD pipelines, and sub-10ms API routing. Key skills: Kafka, AWS ECS, Microservices, Multithreading.`,
  },
];

export default function ProfessionalResumeStudio() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // 4-Step Professional Pipeline:
  // 1 = Upload JD
  // 2 = Enter Candidate Details
  // 3 = AI JD Match & Gap Analysis
  // 4 = Interactive Studio & Live A4 Preview
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Module Lock & Razorpay Payment State (₹1 INR) - Set to true for now as requested
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [isBuying, setIsBuying] = useState(false);

  // Step 1 State: Job Description (Starts empty for user input)
  const [jdText, setJdText] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdTargetRole, setJdTargetRole] = useState("");
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Step 2 & 4 State: Candidate Profile
  const [resumeData, setResumeData] = useState(INITIAL_CANDIDATE);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [template, setTemplate] = useState<"modern" | "executive" | "creative" | "classic">("modern");
  const [activeAccordion, setActiveAccordion] = useState<string>("personal");

  // Step 3 AI Match Results
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    tailoredSummary: string;
    recommendedBullets: string[];
    feedback: string[];
  } | null>(null);

  // AI Polish states
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false);
  const [enhancingBulletId, setEnhancingBulletId] = useState<string | null>(null);

  // User Profile
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        const currentUser = {
          id: (session.user as any).id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: (session.user as any).role ?? "Student",
        };
        setUser(currentUser);
        setResumeData((prev) => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: prev.personalInfo.fullName || currentUser.name,
            email: prev.personalInfo.email || currentUser.email,
          },
        }));

        // Check Pro Subscription status
        fetch("/api/subscription/status")
          .then((res) => res.json())
          .then((data) => {
            if (data.plan === "PRO" || data.isAdmin) {
              setIsUnlocked(true);
            } else {
              const unlockKey = currentUser.email ? `ksai_resume_module_paid_v2_${currentUser.email}` : "ksai_resume_module_paid_v2_guest";
              setIsUnlocked(localStorage.getItem(unlockKey) === "true");
            }
          })
          .catch(() => setIsUnlocked(false));
      } else {
        router.push("/auth");
      }
    }
  }, [session, isPending, router]);

  // Handle Upgrade to Codexa Pro to Unlock Resume Builder
  const handleUnlockModule = async () => {
    router.push("/plans/duration?plan=pro");
  };

  const handleSidebarTabChange = (_tab: string) => {
    // LeftSidebar handles global navigation directly
  };

  // Handle PDF / Text File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJdFileName(file.name);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPdfBase64(result);
        setJdText(`📄 PDF Document Attached: "${file.name}"\n\n(Codenthra AI will read and extract all job requirements and technical keywords directly from this PDF file).`);
      };
      reader.readAsDataURL(file);
    } else {
      setPdfBase64(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setJdText(content);
      };
      reader.readAsText(file);
    }
  };

  // Step 2 -> 3: AI Match & Gap Analysis
  const handleRunAiMatchAnalysis = async () => {
    setIsAnalyzingMatch(true);
    setStep(3);

    try {
      const res = await fetch("/api/ai/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "align_with_jd",
          jobDescription: jdText,
          pdfBase64: pdfBase64,
          targetRole: jdTargetRole || resumeData.personalInfo.jobTitle,
          company: jdCompany || "Target Employer",
          resumeData: resumeData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchResult({
          score: data.score !== undefined ? data.score : 25,
          matchedKeywords: data.matchedKeywords || [],
          missingKeywords: data.missingKeywords || [],
          tailoredSummary: data.tailoredSummary || resumeData.summary,
          recommendedBullets: data.recommendedBullets || [],
          feedback: data.feedback || [],
        });
      }
    } catch (e) {
      console.error("Match Analysis Error:", e);
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  // Step 3 -> 4: Apply AI Suggestions and Open Studio
  const handleApplySuggestionsAndOpenStudio = () => {
    if (matchResult) {
      setResumeData((prev) => {
        const updatedSkills = [...prev.skills];
        matchResult.missingKeywords.forEach((k) => {
          if (!updatedSkills.includes(k)) updatedSkills.push(k);
        });

        const updatedExp = prev.experience.map((item, i) => {
          if (i === 0 && matchResult.recommendedBullets && matchResult.recommendedBullets.length > 0) {
            return { ...item, bullets: matchResult.recommendedBullets };
          }
          return item;
        });

        return {
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            jobTitle: jdTargetRole || prev.personalInfo.jobTitle,
          },
          summary: matchResult.tailoredSummary || prev.summary,
          skills: updatedSkills,
          experience: updatedExp,
        };
      });
    }
    setStep(4);
  };

  // Individual Form Helpers
  const handlePersonalInfoChange = (field: string, val: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: val },
    }));
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !resumeData.skills.includes(trimmed)) {
      setResumeData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setResumeData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleEnhanceSummary = async () => {
    setIsEnhancingSummary(true);
    try {
      const res = await fetch("/api/ai/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize_summary",
          text: resumeData.summary,
          targetRole: resumeData.personalInfo.jobTitle || "Software Engineer",
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResumeData((prev) => ({ ...prev, summary: data.result }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancingSummary(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(resumeData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resumeData.personalInfo.fullName.replace(/\s+/g, "_")}_Resume.json`;
    a.click();
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, nav, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Left Sidebar */}
      <LeftSidebar
        activeTab="Resume Builder"
        onTabChange={handleSidebarTabChange}
        userProfile={user || undefined}
        isLight={false}
        fullHeight={true}
      />

      {/* Main Container */}
      <main data-lenis-prevent className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#F8FAFC]">
        {/* Top Professional Pipeline Navigation Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs no-print">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Global Navigation Toggle (< 768px) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
                }
              }}
              aria-label="Open navigation menu"
              className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                Codenthra AI Resume Builder Studio
              </h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                JD Upload ➔ Profile Entry ➔ AI Gap Analysis ➔ Interactive A4 Studio
              </p>
            </div>
          </div>

          {/* Step Stepper Pills (Only visible when unlocked) */}
          {isUnlocked ? (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStep(1)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  step === 1 ? "bg-blue-600 text-white shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload size={13} /> 1. Upload JD
              </button>
              <span className="text-slate-300 text-[10px]">➔</span>
              <button
                onClick={() => setStep(2)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  step === 2 ? "bg-blue-600 text-white shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User size={13} /> 2. Enter Profile
              </button>
              <span className="text-slate-300 text-[10px]">➔</span>
              <button
                onClick={() => setStep(3)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  step === 3 ? "bg-blue-600 text-white shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Target size={13} /> 3. AI JD Match
              </button>
              <span className="text-slate-300 text-[10px]">➔</span>
              <button
                onClick={() => setStep(4)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  step === 4 ? "bg-blue-600 text-white shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileCheck size={13} /> 4. Resume Studio
              </button>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
              <Lock size={14} className="text-amber-600" /> Module Locked &bull; ₹1 Payment Required
            </div>
          )}
        </div>

        {/* Locked Module Screen / Full Pipeline */}
        {!isUnlocked ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar flex items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-10 space-y-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl">
                <Lock size={36} />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold">
                  <Sparkles size={13} className="text-purple-600" /> Premium Module &bull; Lifetime Access
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Unlock Codenthra AI Resume Builder
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Engineered for FAANG & top tech roles. Build job-targeted resumes, scan JD PDFs natively, and get real-time ATS match scoring.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>Native Base64 PDF Job Description Parser</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>FAANG ATS Keyword Gap & Match Evaluation</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>4 Professional A4 Templates (Modern, Executive, Creative, Classic)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>1-Click High-Res Vector PDF Download</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-950 font-mono">₹70</span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">Included in Codexa Pro</span>
                </div>

                <button
                  onClick={handleUnlockModule}
                  className="w-full py-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck size={18} className="text-cyan-300" /> Upgrade to Codexa Pro (₹70/mo) ➔
                </button>

                <p className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Includes AI Interview Preparation &amp; Resume Builder
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Upload Job Description */}
            {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold">
                  <Upload size={14} /> Step 1 of 4
                </div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                  Upload Target Job Description (JD)
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Attach your target job posting PDF or paste the job responsibilities. Codenthra AI will match your profile against this exact job!
                </p>
              </div>

              {/* PDF Upload Box */}
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 transition-all p-8 text-center space-y-4 shadow-xs relative">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                  <Upload size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {jdFileName ? `Attached: ${jdFileName}` : "Click or Drag & Drop Job Description PDF / Document"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Supports .pdf, .txt, .docx files
                  </p>
                </div>
              </div>

              {/* Sample JDs */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                  Or pick a sample target job description:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_JDS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setJdCompany(s.company);
                        setJdTargetRole(s.title);
                        setJdText(s.text);
                        setJdFileName(null);
                        setPdfBase64(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                    >
                      <CheckCircle2 size={14} className="text-blue-600" /> {s.company}: {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* JD Inputs */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">Target Company</label>
                    <input
                      type="text"
                      value={jdCompany}
                      onChange={(e) => setJdCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      placeholder="Google / Amazon / TCS"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">Target Job Title</label>
                    <input
                      type="text"
                      value={jdTargetRole}
                      onChange={(e) => setJdTargetRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      placeholder="Senior Full-Stack Engineer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-900 block flex items-center justify-between">
                    <span>Job Description Text Requirements</span>
                    {pdfBase64 && (
                      <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ PDF Attached Natively
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={5}
                    value={jdText}
                    onChange={(e) => {
                      setJdText(e.target.value);
                      if (pdfBase64) setPdfBase64(null);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed custom-scrollbar"
                    placeholder="Paste job description text here..."
                  />
                </div>
              </div>

              {/* Next Action */}
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  Continue to Enter Profile Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Enter Candidate Profile Details */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold">
                  <User size={14} /> Step 2 of 4
                </div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                  Enter Your Candidate Profile
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Fill in your experience, skills, and projects. Codenthra AI will match them against the target JD in the next step!
                </p>
              </div>

              {/* Profile Details Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                  <User size={16} className="text-blue-600" /> Personal Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.fullName}
                      onChange={(e) => handlePersonalInfoChange("fullName", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Current / Target Title</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.jobTitle}
                      onChange={(e) => handlePersonalInfoChange("jobTitle", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                {/* Email, Phone, Location, GitHub */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 block mb-1">Location</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => handlePersonalInfoChange("location", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      placeholder="Hyderabad, India"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 block mb-1">GitHub / Portfolio URL</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.githubUrl}
                      onChange={(e) => handlePersonalInfoChange("githubUrl", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      placeholder="github.com/myusername"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-900 block flex items-center justify-between">
                    <span>Professional Summary</span>
                    <button
                      type="button"
                      onClick={handleEnhanceSummary}
                      disabled={isEnhancingSummary}
                      className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 size={12} className={isEnhancingSummary ? "animate-spin" : ""} /> ✨ AI Polish
                    </button>
                  </label>
                  <textarea
                    rows={3}
                    value={resumeData.summary}
                    onChange={(e) => setResumeData((prev) => ({ ...prev, summary: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-black text-slate-900 block flex items-center justify-between">
                    <span>Core Skills & Technologies</span>
                    <span className="text-[10px] text-slate-400 font-bold">Press Enter to Add</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSkill(newSkillInput)}
                      placeholder="e.g. Next.js, Java, Docker, Python..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill(newSkillInput)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {resumeData.skills.map((s, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-700">
                        {s}
                        <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-rose-600 font-bold">&times;</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 block flex items-center gap-2">
                      <Briefcase size={16} className="text-emerald-600" /> Work Experience
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setResumeData((prev) => ({
                          ...prev,
                          experience: [
                            ...prev.experience,
                            {
                              id: `exp-${Date.now()}`,
                              company: "",
                              role: "",
                              startDate: "",
                              endDate: "",
                              description: "",
                              bullets: [""],
                            },
                          ],
                        }))
                      }
                      className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Experience
                    </button>
                  </div>

                  {resumeData.experience.map((exp) => (
                    <div key={exp.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() =>
                          setResumeData((prev) => ({
                            ...prev,
                            experience: prev.experience.filter((i) => i.id !== exp.id),
                          }))
                        }
                        className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, company: e.target.value } : i)),
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="Company Name (e.g. Google / Microsoft)"
                        />
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, role: e.target.value } : i)),
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="Role Title (e.g. Software Engineer)"
                        />
                      </div>
                      {exp.bullets.map((b, bIdx) => (
                        <input
                          key={bIdx}
                          type="text"
                          value={b}
                          onChange={(e) => {
                            const newB = [...exp.bullets];
                            newB[bIdx] = e.target.value;
                            setResumeData((prev) => ({
                              ...prev,
                              experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, bullets: newB } : i)),
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800"
                          placeholder="Accomplishment bullet point (e.g. Engineered REST APIs...)"
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Projects */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 block flex items-center gap-2">
                      <Globe size={16} className="text-blue-600" /> Featured Projects
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setResumeData((prev) => ({
                          ...prev,
                          projects: [
                            ...prev.projects,
                            {
                              id: `proj-${Date.now()}`,
                              title: "",
                              techStack: "",
                              description: "",
                              bullets: [""],
                            },
                          ],
                        }))
                      }
                      className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Project
                    </button>
                  </div>

                  {resumeData.projects.map((proj) => (
                    <div key={proj.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                      <button
                        type="button"
                        onClick={() =>
                          setResumeData((prev) => ({
                            ...prev,
                            projects: prev.projects.filter((i) => i.id !== proj.id),
                          }))
                        }
                        className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              projects: prev.projects.map((i) => (i.id === proj.id ? { ...i, title: e.target.value } : i)),
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="Project Title (e.g. AI Portfolio App)"
                        />
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) =>
                            setResumeData((prev) => ({
                              ...prev,
                              projects: prev.projects.map((i) => (i.id === proj.id ? { ...i, techStack: e.target.value } : i)),
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-blue-600"
                          placeholder="Tech Stack (e.g. Next.js, Python)"
                        />
                      </div>
                      {proj.bullets.map((b, bIdx) => (
                        <input
                          key={bIdx}
                          type="text"
                          value={b}
                          onChange={(e) => {
                            const newB = [...proj.bullets];
                            newB[bIdx] = e.target.value;
                            setResumeData((prev) => ({
                              ...prev,
                              projects: prev.projects.map((i) => (i.id === proj.id ? { ...i, bullets: newB } : i)),
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800"
                          placeholder="Project highlight bullet point..."
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Back to Upload JD
                </button>
                <button
                  onClick={handleRunAiMatchAnalysis}
                  className="px-6 py-3 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Zap size={16} className="text-yellow-300 fill-yellow-300" /> ✨ Run AI Match Analysis ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI JD Match & Gap Analysis Breakdown */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
              {isAnalyzingMatch ? (
                <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
                  <RefreshCw size={38} className="animate-spin text-purple-600 mx-auto" />
                  <h3 className="text-base font-black text-slate-900">
                    Codenthra AI is scanning your profile against {jdCompany}: {jdTargetRole}...
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Comparing candidate skills, calculating ATS match score, and extracting missing keywords...</p>
                </div>
              ) : matchResult ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold">
                      <Target size={14} /> Step 3 of 4: AI Match Analysis
                    </div>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                      Match Evaluation {jdCompany ? `for ${jdCompany}` : "for Target Position"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Codenthra AI analyzed your profile vs target JD. Here is your gap analysis and keywords match score!
                    </p>
                  </div>

                  {/* Score Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex flex-wrap items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <p className="text-3xl font-black">{matchResult.score}% ATS Match</p>
                      <p className="text-xs font-bold text-cyan-200">
                        {jdTargetRole || "Target Role"} {jdCompany ? `at ${jdCompany}` : ""}
                      </p>
                    </div>

                    <button
                      onClick={handleApplySuggestionsAndOpenStudio}
                      className="px-6 py-3 rounded-2xl text-xs font-extrabold text-slate-900 bg-cyan-300 hover:bg-cyan-200 shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      🚀 Open Resume Studio & Fine-Tune <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Keywords Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Matched Keywords */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-emerald-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 size={16} className="text-emerald-500" /> Matched Skills & Keywords
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.matchedKeywords && matchResult.matchedKeywords.length > 0 ? (
                          matchResult.matchedKeywords.map((k, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                              ✓ {k}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 font-medium italic">
                            No matching technical skills found in candidate profile. Add your skills in Step 2 to improve your ATS score!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Missing Keywords */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-amber-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertCircle size={16} className="text-amber-500" /> Missing Keywords (Auto-Inject)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.missingKeywords.map((k, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddSkill(k)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
                          >
                            + {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tailored Summary Recommendation */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600" /> Recommended Executive Summary
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      {matchResult.tailoredSummary}
                    </p>
                  </div>

                  {/* Bottom Action */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={16} /> Back to Edit Profile
                    </button>
                    <button
                      onClick={handleApplySuggestionsAndOpenStudio}
                      className="px-6 py-3 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      Apply AI Keywords & Open Studio ➔
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Step 4: Interactive Resume Studio & Live A4 Document Preview */}
        {step === 4 && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Left Form Editor Pane */}
            <div className="w-full lg:w-1/2 h-full overflow-y-auto p-4 sm:p-6 border-r border-slate-200 bg-slate-50/70 space-y-4 custom-scrollbar no-print">
              {/* Studio Header Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Step 4: Codenthra Resume Studio</h3>
                  <p className="text-[11px] text-cyan-200 font-medium">Fine-tune details & export pixel-perfect PDF</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as any)}
                    className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 outline-none cursor-pointer"
                  >
                    <option value="modern">Modern Tech (ATS Standard)</option>
                    <option value="executive">Executive Modern</option>
                    <option value="creative">Creative AI</option>
                    <option value="classic">Silicon Valley Classic</option>
                  </select>

                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-300 text-slate-900 text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={14} /> Download PDF
                  </button>
                </div>
              </div>

              {/* Accordion 1: Personal Info */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "personal" ? "" : "personal")}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/60 font-black text-slate-900 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <User size={16} className="text-blue-600" /> Personal Info
                  </span>
                  {activeAccordion === "personal" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeAccordion === "personal" && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={resumeData.personalInfo.fullName}
                          onChange={(e) => handlePersonalInfoChange("fullName", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Title</label>
                        <input
                          type="text"
                          value={resumeData.personalInfo.jobTitle}
                          onChange={(e) => handlePersonalInfoChange("jobTitle", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Professional Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "summary" ? "" : "summary")}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/60 font-black text-slate-900 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-600" /> Executive Summary
                  </span>
                  {activeAccordion === "summary" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeAccordion === "summary" && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Summary Text</span>
                      <button
                        onClick={handleEnhanceSummary}
                        disabled={isEnhancingSummary}
                        className="px-3 py-1 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Wand2 size={12} className={isEnhancingSummary ? "animate-spin" : ""} /> ✨ AI Polish
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={resumeData.summary}
                      onChange={(e) => setResumeData((prev) => ({ ...prev, summary: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Accordion 3: Skills */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "skills" ? "" : "skills")}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/60 font-black text-slate-900 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Code2 size={16} className="text-cyan-600" /> Skills Stack
                  </span>
                  {activeAccordion === "skills" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeAccordion === "skills" && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSkill(newSkillInput)}
                        placeholder="Add skill..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      />
                      <button
                        onClick={() => handleAddSkill(newSkillInput)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {resumeData.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-700 flex items-center gap-1">
                          {s}
                          <button onClick={() => handleRemoveSkill(s)} className="hover:text-rose-600 font-bold">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Work Experience */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "experience" ? "" : "experience")}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/60 font-black text-slate-900 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase size={16} className="text-emerald-600" /> Work Experience
                  </span>
                  {activeAccordion === "experience" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeAccordion === "experience" && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    {resumeData.experience.map((exp) => (
                      <div key={exp.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() =>
                            setResumeData((prev) => ({
                              ...prev,
                              experience: prev.experience.filter((i) => i.id !== exp.id),
                            }))
                          }
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) =>
                              setResumeData((prev) => ({
                                ...prev,
                                experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, company: e.target.value } : i)),
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                            placeholder="Company Name"
                          />
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) =>
                              setResumeData((prev) => ({
                                ...prev,
                                experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, role: e.target.value } : i)),
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                            placeholder="Role Title"
                          />
                        </div>
                        {exp.bullets.map((b, bIdx) => (
                          <textarea
                            key={bIdx}
                            rows={2}
                            value={b}
                            onChange={(e) => {
                              const newB = [...exp.bullets];
                              newB[bIdx] = e.target.value;
                              setResumeData((prev) => ({
                                ...prev,
                                experience: prev.experience.map((i) => (i.id === exp.id ? { ...i, bullets: newB } : i)),
                              }));
                            }}
                            className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed"
                          />
                        ))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setResumeData((prev) => ({
                          ...prev,
                          experience: [
                            ...prev.experience,
                            {
                              id: `exp-${Date.now()}`,
                              company: "",
                              role: "",
                              startDate: "",
                              endDate: "",
                              description: "",
                              bullets: [""],
                            },
                          ],
                        }))
                      }
                      className="w-full py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Experience Item
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 5: Featured Projects */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === "projects" ? "" : "projects")}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/60 font-black text-slate-900 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" /> Featured Projects
                  </span>
                  {activeAccordion === "projects" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {activeAccordion === "projects" && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    {resumeData.projects.map((proj) => (
                      <div key={proj.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() =>
                            setResumeData((prev) => ({
                              ...prev,
                              projects: prev.projects.filter((i) => i.id !== proj.id),
                            }))
                          }
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) =>
                              setResumeData((prev) => ({
                                ...prev,
                                projects: prev.projects.map((i) => (i.id === proj.id ? { ...i, title: e.target.value } : i)),
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900"
                            placeholder="Project Title (e.g. AI Workspace)"
                          />
                          <input
                            type="text"
                            value={proj.techStack}
                            onChange={(e) =>
                              setResumeData((prev) => ({
                                ...prev,
                                projects: prev.projects.map((i) => (i.id === proj.id ? { ...i, techStack: e.target.value } : i)),
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-blue-600"
                            placeholder="Tech Stack (e.g. Next.js, Python)"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setResumeData((prev) => ({
                          ...prev,
                          projects: [
                            ...prev.projects,
                            {
                              id: `proj-${Date.now()}`,
                              title: "",
                              techStack: "",
                              description: "",
                              bullets: [""],
                            },
                          ],
                        }))
                      }
                      className="w-full py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Project Item
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Live A4 Document Preview */}
            <div className="w-full lg:w-1/2 h-full overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex flex-col items-center custom-scrollbar print-area">
              {/* TEMPLATE 1: MODERN TECH (ATS Standard) */}
              {template === "modern" && (
                <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 font-sans space-y-5">
                  <div className="border-b-2 border-blue-600 pb-4 mb-4">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
                      {resumeData.personalInfo.fullName}
                    </h1>
                    <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mt-1">
                      {resumeData.personalInfo.jobTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 font-semibold mt-3">
                      <span>📧 {resumeData.personalInfo.email}</span> &bull;
                      <span>📞 {resumeData.personalInfo.phone}</span> &bull;
                      <span>📍 {resumeData.personalInfo.location}</span> &bull;
                      <span>🌐 {resumeData.personalInfo.githubUrl}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xs font-black text-blue-700 uppercase tracking-widest border-b border-slate-200 pb-1">
                      Professional Summary
                    </h2>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium pt-1">
                      {resumeData.summary}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black text-blue-700 uppercase tracking-widest border-b border-slate-200 pb-1">
                      Core Technical Skills & Stack
                    </h2>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {resumeData.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 text-[10.5px] font-extrabold border border-blue-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-blue-700 uppercase tracking-widest border-b border-slate-200 pb-1">
                      Work Experience
                    </h2>
                    {resumeData.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-black text-slate-950">
                          <span>{exp.role} &bull; <span className="text-blue-600">{exp.company}</span></span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">{exp.startDate} - {exp.endDate}</span>
                        </div>
                        <ul className="list-disc list-inside text-[10.5px] text-slate-800 space-y-1 pt-1 font-medium leading-relaxed">
                          {exp.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-blue-700 uppercase tracking-widest border-b border-slate-200 pb-1">
                      Featured Projects
                    </h2>
                    {resumeData.projects.map((proj) => (
                      <div key={proj.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-black text-slate-950">
                          <span>{proj.title}</span>
                          <span className="text-[10px] text-blue-600 font-mono font-bold">{proj.techStack}</span>
                        </div>
                        <ul className="list-disc list-inside text-[10.5px] text-slate-800 space-y-1 font-medium">
                          {proj.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TEMPLATE 2: EXECUTIVE MODERN */}
              {template === "executive" && (
                <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 font-sans space-y-6">
                  {/* Executive Header Banner */}
                  <div className="bg-slate-950 text-white p-8 rounded-2xl space-y-3 -mx-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                      {resumeData.personalInfo.fullName}
                    </h1>
                    <p className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest">
                      {resumeData.personalInfo.jobTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300 font-semibold pt-2 border-t border-slate-800">
                      <span>📧 {resumeData.personalInfo.email}</span> &bull;
                      <span>📞 {resumeData.personalInfo.phone}</span> &bull;
                      <span>📍 {resumeData.personalInfo.location}</span> &bull;
                      <span>🌐 {resumeData.personalInfo.githubUrl}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b-2 border-slate-950 pb-1">
                      Executive Overview
                    </h2>
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                      {resumeData.summary}
                    </p>
                  </div>

                  {/* 2-Column Body */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* Left Column (Skills) */}
                    <div className="col-span-1 space-y-4 border-r border-slate-200 pr-4">
                      <div className="space-y-2">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
                          Core Competencies
                        </h3>
                        <div className="flex flex-col gap-1.5">
                          {resumeData.skills.map((s, idx) => (
                            <div key={idx} className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span> {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Experience & Projects) */}
                    <div className="col-span-2 space-y-5">
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b-2 border-slate-950 pb-1">
                          Leadership & Experience
                        </h3>
                        {resumeData.experience.map((exp) => (
                          <div key={exp.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-black text-slate-950">
                              <span>{exp.role}</span>
                              <span className="text-[10px] text-slate-500 font-mono font-bold">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <p className="text-[10.5px] font-extrabold text-cyan-800">{exp.company}</p>
                            <ul className="list-disc list-inside text-[10.5px] text-slate-800 space-y-1 pt-1 font-medium leading-relaxed">
                              {exp.bullets.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b-2 border-slate-950 pb-1">
                          Key Projects
                        </h3>
                        {resumeData.projects.map((proj) => (
                          <div key={proj.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-black text-slate-950">
                              <span>{proj.title}</span>
                              <span className="text-[10px] text-slate-600 font-mono font-bold">{proj.techStack}</span>
                            </div>
                            <ul className="list-disc list-inside text-[10.5px] text-slate-800 space-y-1 font-medium">
                              {proj.bullets.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TEMPLATE 3: CREATIVE AI */}
              {template === "creative" && (
                <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm flex overflow-hidden font-sans">
                  {/* Left Purple Sidebar (35%) */}
                  <div className="w-[35%] bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg">
                        {resumeData.personalInfo.fullName ? resumeData.personalInfo.fullName.charAt(0) : "C"}
                      </div>

                      <div className="space-y-1">
                        <h1 className="text-xl font-black text-white leading-tight uppercase">
                          {resumeData.personalInfo.fullName}
                        </h1>
                        <p className="text-xs font-bold text-cyan-300">
                          {resumeData.personalInfo.jobTitle}
                        </p>
                      </div>

                      <div className="space-y-2 text-[10.5px] text-slate-300 pt-3 border-t border-purple-800/60 font-medium">
                        <div className="truncate">📧 {resumeData.personalInfo.email}</div>
                        <div>📞 {resumeData.personalInfo.phone}</div>
                        <div>📍 {resumeData.personalInfo.location}</div>
                        <div className="truncate">🌐 {resumeData.personalInfo.githubUrl}</div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-purple-800/60">
                        <h3 className="text-xs font-black text-purple-200 uppercase tracking-widest">
                          Tech Skills Stack
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeData.skills.map((s, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-900/60 text-purple-200 text-[10px] font-bold border border-purple-400/30">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-purple-400/80 font-bold uppercase tracking-widest">
                      Codenthra Verified AI Candidate
                    </div>
                  </div>

                  {/* Right Main Content (65%) */}
                  <div className="w-[65%] p-6 sm:p-8 space-y-6 bg-white text-slate-900">
                    <div className="space-y-2">
                      <h2 className="text-xs font-black text-purple-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1">
                        Executive Summary
                      </h2>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                        {resumeData.summary}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xs font-black text-purple-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1">
                        Professional Work History
                      </h2>
                      {resumeData.experience.map((exp) => (
                        <div key={exp.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-black text-slate-950">
                            <span className="text-purple-700 font-extrabold">{exp.role}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{exp.startDate} - {exp.endDate}</span>
                          </div>
                          <p className="text-[10.5px] font-extrabold text-slate-800">{exp.company}</p>
                          <ul className="list-disc list-inside text-[10.5px] text-slate-700 space-y-1 font-medium leading-relaxed">
                            {exp.bullets.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xs font-black text-purple-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1">
                        Featured Engineering Projects
                      </h2>
                      {resumeData.projects.map((proj) => (
                        <div key={proj.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-black text-slate-950">
                            <span>{proj.title}</span>
                            <span className="text-[10px] text-purple-600 font-mono font-bold">{proj.techStack}</span>
                          </div>
                          <ul className="list-disc list-inside text-[10.5px] text-slate-700 space-y-1 font-medium">
                            {proj.bullets.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TEMPLATE 4: SILICON VALLEY CLASSIC */}
              {template === "classic" && (
                <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 font-serif space-y-5">
                  {/* Centered Traditional Header */}
                  <div className="text-center space-y-1">
                    <h1 className="text-3xl font-serif font-black text-slate-950 tracking-tight uppercase">
                      {resumeData.personalInfo.fullName}
                    </h1>
                    <p className="text-xs font-serif font-bold text-slate-800 uppercase tracking-widest">
                      {resumeData.personalInfo.jobTitle}
                    </p>
                    <p className="text-[11px] font-serif text-slate-700 border-t border-b border-slate-900 py-1 my-2">
                      {resumeData.personalInfo.email} &bull; {resumeData.personalInfo.phone} &bull; {resumeData.personalInfo.location} &bull; {resumeData.personalInfo.githubUrl}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <h2 className="text-xs font-serif font-bold text-slate-950 uppercase tracking-widest border-b border-slate-900 pb-0.5">
                      OBJECTIVE / SUMMARY
                    </h2>
                    <p className="text-[11px] font-serif text-slate-800 leading-relaxed pt-1">
                      {resumeData.summary}
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="space-y-1">
                    <h2 className="text-xs font-serif font-bold text-slate-950 uppercase tracking-widest border-b border-slate-900 pb-0.5">
                      TECHNICAL SKILLS
                    </h2>
                    <p className="text-[11px] font-serif text-slate-900 pt-1 leading-normal">
                      <span className="font-bold">Core Stack: </span>
                      {resumeData.skills.join(" • ")}
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-serif font-bold text-slate-950 uppercase tracking-widest border-b border-slate-900 pb-0.5">
                      WORK EXPERIENCE
                    </h2>
                    {resumeData.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-serif font-bold text-slate-950">
                          <span>{exp.company} — <span className="italic font-normal">{exp.role}</span></span>
                          <span className="text-[10.5px] text-slate-700 font-mono">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] font-serif text-slate-800 space-y-1 pt-0.5 leading-relaxed">
                          {exp.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-serif font-bold text-slate-950 uppercase tracking-widest border-b border-slate-900 pb-0.5">
                      KEY PROJECTS
                    </h2>
                    {resumeData.projects.map((proj) => (
                      <div key={proj.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-serif font-bold text-slate-950">
                          <span>{proj.title}</span>
                          <span className="text-[10.5px] text-slate-700 font-mono font-bold">{proj.techStack}</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] font-serif text-slate-800 space-y-1 leading-relaxed">
                          {proj.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </main>
</div>
  );
}
