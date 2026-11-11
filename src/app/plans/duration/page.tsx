"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Layers,
  Award,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import {
  OFFICIAL_PLANS,
  AVAILABLE_SUBJECTS,
  PlanTier,
  PlanDurationMonths,
  SubjectId,
  resolveSubjectLabel,
} from "@/lib/subscription-config";

function DurationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Resolve Plan Tier
  const rawPlan = searchParams.get("plan")?.toUpperCase();
  const planTier: PlanTier = rawPlan === "PRO" ? "PRO" : "BASIC";

  // 2. Resolve Duration (Strictly 1 or 4)
  const rawDuration = Number(searchParams.get("duration"));
  const initialDuration: PlanDurationMonths = rawDuration === 4 ? 4 : 1;
  const [userDuration, setUserDuration] = useState<PlanDurationMonths | null>(null);
  const selectedDuration: PlanDurationMonths = userDuration ?? initialDuration;

  // 3. Resolve Subject (for Basic 1 Month single-subject access)
  const rawSubject = (searchParams.get("subject") || searchParams.get("course") || "python").toLowerCase();
  const initialSubject = (AVAILABLE_SUBJECTS.some((s) => s.id === rawSubject) ? rawSubject : "python") as SubjectId;
  const [userSubject, setUserSubject] = useState<SubjectId | null>(null);
  const selectedSubject: SubjectId = userSubject ?? initialSubject;

  const planConfig = OFFICIAL_PLANS[planTier];
  const durationsList: PlanDurationMonths[] = [1, 4];

  // Active pricing lookup
  const activePricing = planConfig.durations[selectedDuration];
  const selectedSubjectInfo = AVAILABLE_SUBJECTS.find((s) => s.id === selectedSubject) || AVAILABLE_SUBJECTS[0];

  const handlePlanSwitch = (newPlan: "basic" | "pro") => {
    // Retain valid duration (1 or 4) and subject
    router.push(
      `/plans/duration?plan=${newPlan}&duration=${selectedDuration}${
        newPlan === "basic" && selectedDuration === 1 ? `&subject=${selectedSubject}` : ""
      }`
    );
  };

  const handleContinue = () => {
    const subjectParam =
      planTier === "BASIC" && selectedDuration === 1 ? `&subject=${selectedSubject}` : "";
    router.push(
      `/plans/summary?plan=${planTier.toLowerCase()}&duration=${selectedDuration}${subjectParam}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
      {/* Back button */}
      <button
        onClick={() => router.push("/plans")}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Plans
      </button>

      {/* Step Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Calendar size={13} /> Step 2 of 3: Select Duration
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Choose Duration for{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent">
            {planConfig.name}
          </span>
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm font-medium">
          Select your subscription duration. Transparent pricing, upfront payment, zero auto-debit.
        </p>

        {/* Plan Switcher Toggle */}
        <div className="pt-3 flex items-center justify-center gap-2.5">
          <span className="text-xs text-slate-400 font-bold">Selected Plan:</span>
          <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => handlePlanSwitch("basic")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planTier === "BASIC"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap size={13} /> Basic (₹50/mo)
            </button>
            <button
              type="button"
              onClick={() => handlePlanSwitch("pro")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planTier === "PRO"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles size={13} /> Pro (₹70/mo)
            </button>
          </div>
        </div>
      </div>

      {/* DURATION CARDS GRID - CLEAN DARK NAVY, HIGH-CONTRAST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8 max-w-3xl mx-auto items-stretch">
        {durationsList.map((dur) => {
          const pricing = planConfig.durations[dur];
          const isSelected = selectedDuration === dur;
          const isFourMonth = dur === 4;

          return (
            <div
              key={dur}
              onClick={() => setUserDuration(dur)}
              className={`rounded-3xl p-6 sm:p-7 border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? "bg-[#0F172A] border-cyan-400 ring-4 ring-cyan-500/20 shadow-2xl scale-[1.01]"
                  : "bg-[#0B1120]/95 border-slate-800 hover:border-slate-700 hover:bg-[#0F172A]/80 shadow-lg"
              }`}
            >
              {/* Best Value Ribbon on 4-Month Option */}
              {isFourMonth && (
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1">
                  <Sparkles size={12} /> Best Value
                </div>
              )}

              <div className="space-y-4">
                {/* Header Row: Duration Title & Radio Checkmark */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Duration Option
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {pricing.label}
                    </h3>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-400 text-slate-950 font-black shadow-md"
                        : "border-slate-700 bg-slate-900/80 text-transparent"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>

                {/* Price Display */}
                <div className="py-2 border-y border-slate-800/80 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                      ₹{pricing.basePrice}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-300">
                      one-time
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-300 font-extrabold">
                      (₹{pricing.monthlyRate}/month)
                    </span>
                    {pricing.savingsLabel && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px]">
                        {pricing.savingsLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Course Access Description */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    {planTier === "BASIC" ? (
                      dur === 1 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5">
                          <BookOpen size={13} /> 1 Selected Subject Access
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5">
                          <Layers size={13} /> All 4 Subjects Bundle
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold inline-flex items-center gap-1.5">
                        <Award size={13} /> Full Codexa Pro Career Suite
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed">
                    {planTier === "BASIC" && dur === 1 && (
                      <>Choose 1 programming language course to access for 1 month of structured learning.</>
                    )}
                    {planTier === "BASIC" && dur === 4 && (
                      <>Simultaneous access to all 4 programming languages (Java, Python, C, C++) for 4 full months.</>
                    )}
                    {planTier === "PRO" && dur === 1 && (
                      <>Complete access to all 4 courses, AI interview simulator, and professional ATS resume studio for 1 month.</>
                    )}
                    {planTier === "PRO" && dur === 4 && (
                      <>Complete career suite with all 4 courses, AI interview simulator, and ATS resume studio with maximum savings for 4 months.</>
                    )}
                  </p>

                  {/* Course Badges List for 4-Month Basic Bundle */}
                  {planTier === "BASIC" && dur === 4 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {AVAILABLE_SUBJECTS.map((sub) => (
                        <span
                          key={sub.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200"
                        >
                          ✓ {sub.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Course Badges List for Pro */}
                  {planTier === "PRO" && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 font-bold">
                        4 Languages
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 font-bold">
                        AI Interview Prep
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 font-bold">
                        Resume Studio
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Status Prompt */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span
                  className={`text-xs font-black ${
                    isSelected ? "text-cyan-400" : "text-slate-400"
                  }`}
                >
                  {isSelected ? "Selected Option ✓" : "Click to select"}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  Total: ₹{pricing.basePrice}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BASIC PLAN: SUBJECT SELECTOR WHEN 1 MONTH IS CHOSEN */}
      {planTier === "BASIC" && selectedDuration === 1 && (
        <div className="max-w-3xl mx-auto mb-8 p-6 sm:p-7 rounded-3xl bg-[#0F172A] border-2 border-cyan-500/30 shadow-2xl text-white animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                Course Selection Required
              </span>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                Choose your 1 selected subject for 1-month access:
              </h4>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 self-start sm:self-auto">
              Selected: {selectedSubjectInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
            {AVAILABLE_SUBJECTS.map((sub) => {
              const isSubSelected = selectedSubject === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setUserSubject(sub.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                    isSubSelected
                      ? "bg-indigo-950/70 border-cyan-400 ring-2 ring-cyan-500/20 shadow-lg text-white"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{sub.label}</span>
                    {isSubSelected && (
                      <div className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 truncate">{sub.tag}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-300 font-medium mt-4">
            Tip: Want all 4 programming languages together? Choose the <strong className="text-white">4 Months (₹150)</strong> offer above to get the complete bundle.
          </p>
        </div>
      )}

      {/* SELECTED ORDER PREVIEW SUMMARY BOX — ORDER SNAPSHOT CARD */}
      <div className="max-w-xl mx-auto mb-8 p-6 sm:p-7 rounded-3xl bg-[#0F172A] border-2 border-cyan-500/30 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Order Snapshot
            </span>
            <div className="text-base sm:text-lg font-black text-white mt-1">
              {planConfig.name} · {activePricing.label}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 block">Base Price</span>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-0.5">
              ₹{activePricing.basePrice}
            </div>
          </div>
        </div>

        <div className="flex items-start sm:items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="font-bold text-cyan-400 shrink-0">Access Scope:</span>
          <span className="font-extrabold text-white text-right leading-snug">
            {planTier === "BASIC" ? (
              selectedDuration === 1 ? (
                <>1 Subject: {resolveSubjectLabel(selectedSubject)} Programming</>
              ) : (
                <>All 4 Subjects Bundle (Java, Python, C, C++)</>
              )
            ) : (
              <>Full Codexa Pro Suite (4 Subjects + Career Studio)</>
            )}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Duration:</span>
            <span className="text-white font-bold">{activePricing.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Effective Rate:</span>
            <span className="text-white font-bold font-mono">₹{activePricing.monthlyRate}/mo</span>
          </div>
        </div>
      </div>

      {/* Continue Action */}
      <div className="max-w-md mx-auto text-center space-y-4">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4.5 px-6 rounded-2xl text-base font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[54px] active:scale-[0.99]"
        >
          <span>Continue to Order Summary</span>
          <ArrowRight size={18} />
        </button>

        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck size={15} className="text-emerald-400" />
          No auto-debit · Secure one-time payment · Step 2 of 3
        </p>
      </div>
    </div>
  );
}

export default function DurationPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-cyan-500 selection:text-black">
      <Navbar />
      <Suspense fallback={<div className="pt-40 text-center text-slate-400">Loading duration options...</div>}>
        <DurationContent />
      </Suspense>
    </div>
  );
}
