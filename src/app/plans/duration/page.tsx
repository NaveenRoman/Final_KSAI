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
  const [selectedDuration, setSelectedDuration] = useState<PlanDurationMonths>(initialDuration);

  // 3. Resolve Subject (for Basic 1 Month single-subject access)
  const rawSubject = (searchParams.get("subject") || searchParams.get("course") || "python").toLowerCase();
  const initialSubject = AVAILABLE_SUBJECTS.some((s) => s.id === rawSubject) ? rawSubject : "python";
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(initialSubject as SubjectId);

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

      {/* DURATION CARDS GRID - LIGHT, CLEAN, HIGH-CONTRAST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8 max-w-3xl mx-auto items-stretch">
        {durationsList.map((dur) => {
          const pricing = planConfig.durations[dur];
          const isSelected = selectedDuration === dur;
          const isFourMonth = dur === 4;

          return (
            <div
              key={dur}
              onClick={() => setSelectedDuration(dur)}
              className={`rounded-3xl p-6 sm:p-7 border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between text-slate-900 ${
                isSelected
                  ? "bg-white border-indigo-600 ring-4 ring-indigo-500/20 shadow-2xl scale-[1.01]"
                  : "bg-white/95 border-slate-200 hover:border-indigo-300 hover:shadow-lg shadow-sm"
              }`}
            >
              {/* Tasteful Best Value Ribbon on 4-Month Option */}
              {isFourMonth && (
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1">
                  <Sparkles size={12} /> Best Value
                </div>
              )}

              <div className="space-y-4">
                {/* Header Row: Duration Title & Radio Checkmark */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                      Duration Option
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {pricing.label}
                    </h3>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                        : "border-slate-300 bg-slate-50 text-transparent"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>

                {/* Price Display */}
                <div className="py-1 border-y border-slate-100 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                      ₹{pricing.basePrice}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700">
                      one-time
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-700 font-extrabold">
                      (₹{pricing.monthlyRate}/month)
                    </span>
                    {pricing.savingsLabel && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
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
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black inline-flex items-center gap-1">
                          <BookOpen size={13} /> 1 Selected Subject Access
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black inline-flex items-center gap-1">
                          <Layers size={13} /> All 4 Subjects Bundle
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-black inline-flex items-center gap-1">
                        <Award size={13} /> Full Codexa Pro Career Suite
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
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
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-800"
                        >
                          ✓ {sub.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Course Badges List for Pro */}
                  {planTier === "PRO" && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black">
                        4 Languages
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black">
                        AI Interview Prep
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black">
                        Resume Studio
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Status Prompt */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span
                  className={`text-xs font-black ${
                    isSelected ? "text-indigo-600" : "text-slate-500"
                  }`}
                >
                  {isSelected ? "Selected Option ✓" : "Click to select"}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  Total: ₹{pricing.basePrice}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BASIC PLAN: SUBJECT SELECTOR WHEN 1 MONTH IS CHOSEN */}
      {planTier === "BASIC" && selectedDuration === 1 && (
        <div className="max-w-3xl mx-auto mb-8 p-5 sm:p-6 rounded-3xl bg-white border-2 border-indigo-200 shadow-md text-slate-900 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                Course Selection Required
              </span>
              <h4 className="text-base font-black text-slate-900">
                Choose your 1 selected subject for 1-month access:
              </h4>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 self-start sm:self-auto">
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
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                    isSubSelected
                      ? "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">{sub.label}</span>
                    {isSubSelected && (
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 truncate">{sub.tag}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600 font-semibold mt-3">
            Tip: Want all 4 programming languages together? Choose the <strong>4 Months (₹150)</strong> offer above to get the complete bundle.
          </p>
        </div>
      )}

      {/* SELECTED ORDER PREVIEW SUMMARY BOX */}
      <div className="max-w-xl mx-auto mb-8 p-5 rounded-3xl bg-slate-900/90 border border-white/10 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Order Snapshot
            </span>
            <div className="text-sm font-black text-white mt-0.5">
              {planConfig.name} · {activePricing.label}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400">Base Price</span>
            <div className="text-xl font-black text-cyan-400 font-mono">
              ₹{activePricing.basePrice}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-bold text-slate-400">Access Scope:</span>
          <span className="font-extrabold text-white text-right">
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
      </div>

      {/* Continue Action */}
      <div className="max-w-md mx-auto text-center space-y-4">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-[0.99]"
        >
          <span>Continue to Order Summary</span>
          <ArrowRight size={16} />
        </button>

        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck size={14} className="text-emerald-400" />
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
