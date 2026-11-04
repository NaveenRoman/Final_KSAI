"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Calendar, Sparkles, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { OFFICIAL_PLANS, PlanTier, PlanDurationMonths } from "@/lib/subscription-config";

function DurationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan")?.toUpperCase();
  const planTier: PlanTier = rawPlan === "PRO" ? "PRO" : "BASIC";

  const [selectedDuration, setSelectedDuration] = useState<PlanDurationMonths>(1);
  const planConfig = OFFICIAL_PLANS[planTier];

  const durationsList: PlanDurationMonths[] = [1, 2, 6];

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
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Calendar size={13} /> Step 2 of 3: Select Duration
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          Choose Duration for{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {planConfig.name}
          </span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          Select how long you would like your subscription active. All plans are paid upfront for the chosen period.
        </p>

        {/* Plan Switcher */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Selected Plan:</span>
          <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-white/10">
            <button
              onClick={() => router.push("/plans/duration?plan=basic")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                planTier === "BASIC" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Basic (₹50/mo)
            </button>
            <button
              onClick={() => router.push("/plans/duration?plan=pro")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                planTier === "PRO" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Pro (₹70/mo)
            </button>
          </div>
        </div>
      </div>

      {/* Duration Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {durationsList.map((dur) => {
          const pricing = planConfig.durations[dur];
          const isSelected = selectedDuration === dur;

          return (
            <div
              key={dur}
              onClick={() => setSelectedDuration(dur)}
              className={`rounded-2xl p-6 border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? "border-cyan-400 bg-gradient-to-b from-blue-950/50 via-[#101026] to-[#09090B] shadow-xl shadow-blue-500/10 scale-[1.02]"
                  : "border-white/10 bg-[#0E0E14]/80 hover:border-white/25 hover:bg-[#12121C]"
              }`}
            >
              {dur === 6 && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-[10px] font-black uppercase text-white shadow-md">
                  Best Value
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">{pricing.label}</span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "border-cyan-400 bg-cyan-400 text-black" : "border-slate-600"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                <div>
                  <div className="text-3xl font-black text-white font-mono">₹{pricing.basePrice}</div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (₹{pricing.monthlyRate}/month)
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Full {planConfig.name} access active continuously for {dur} {dur === 1 ? "month" : "months"}.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5">
                <span
                  className={`text-xs font-bold ${
                    isSelected ? "text-cyan-400" : "text-slate-500"
                  }`}
                >
                  {isSelected ? "Selected ✓" : "Click to select"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Action */}
      <div className="max-w-md mx-auto text-center space-y-4">
        <button
          onClick={() =>
            router.push(`/plans/summary?plan=${planTier.toLowerCase()}&duration=${selectedDuration}`)
          }
          className="w-full py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Order Summary</span>
          <ArrowRight size={16} />
        </button>

        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-500" />
          No auto-debit · Secure one-time payment via Razorpay
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
