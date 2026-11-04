"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan: string | null;
  subscription?: {
    plan: string;
    daysRemaining: number;
    endDate: string;
  } | null;
}

export default function PlansPage() {
  const router = useRouter();
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        setSubStatus(data);
        setLoadingStatus(false);
      })
      .catch(() => setLoadingStatus(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-cyan-500 selection:text-black">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-400/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="text-cyan-400" /> Transparent Student Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Choose Your <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">Codexa Plan</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            All plans include our isolated compiler sandbox, curriculum, and AI mentor. Select your plan below to proceed to duration and order summary.
          </p>

          {/* Current Membership Indicator */}
          {!loadingStatus && subStatus?.hasActiveSubscription && (
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-lg">
              <ShieldCheck size={16} />
              <span>
                You currently have an active <strong>{subStatus.plan}</strong> subscription ({subStatus.subscription?.daysRemaining} days remaining).
              </span>
            </div>
          )}
        </div>

        {/* Two Plan Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          {/* BASIC PLAN CARD */}
          <div className="rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-8 sm:p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Foundational Tier</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Basic</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                  <Zap size={22} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-400">
                Core interactive coding suite, curated courses, live teacher dictation, and learning analytics.
              </p>

              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono">₹50</span>
                  <span className="text-slate-400 text-sm font-semibold">/ month</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Flexible options: 1 month (₹50) · 2 months (₹100) · 6 months (₹300)
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Features Included:</span>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>1. Courses:</strong> Full interactive curriculum &amp; challenges</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>2. Code Editor:</strong> Real-time isolated compiler sandbox</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>3. Notes:</strong> Interactive learning journal &amp; revision notes</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>4. Live Teaching:</strong> AI teacher dictation &amp; audio mode</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>5. Monitoring:</strong> Daily progress tracking &amp; activity heatmaps</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>6. Guidance:</strong> Adaptive recommendations &amp; hint engines</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 mt-6">
              <button
                onClick={() => router.push("/plans/duration?plan=basic")}
                className="w-full py-4 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Select Basic Plan</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* PRO PLAN CARD */}
          <div className="rounded-3xl border-2 border-blue-500/80 bg-gradient-to-b from-blue-950/40 via-[#0F0F1E]/90 to-[#09090B] p-8 sm:p-10 flex flex-col justify-between relative shadow-2xl shadow-blue-500/20 hover:border-cyan-400 transition-all duration-300">
            {/* Popular Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-400 text-white text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
              <Sparkles size={12} /> RECOMMENDED FOR CAREER
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Career Acceleration</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Pro</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
                  <Sparkles size={22} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                Complete learning suite plus AI interview mock rounds and professional ATS resume studio.
              </p>

              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono">₹70</span>
                  <span className="text-slate-400 text-sm font-semibold">/ month</span>
                </div>
                <p className="text-[11px] text-cyan-400/90 font-medium mt-1">
                  Flexible options: 1 month (₹70) · 2 months (₹140) · 6 months (₹420)
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3.5">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Includes Every Basic Feature, Plus:</span>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>1. AI Interview Preparation:</strong> Full technical &amp; HR mock rounds</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>2. Professional Resume Builder:</strong> ATS score analysis &amp; PDF export</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <Check size={16} className="text-slate-500 shrink-0 mt-0.5" />
                    <span>Includes Courses, Editor, Notes, Teaching, Monitoring &amp; Guidance</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 mt-6">
              <button
                onClick={() => router.push("/plans/duration?plan=pro")}
                className="w-full py-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Select Pro Plan</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-20 max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#0E0E14]/80 p-6 sm:p-8">
          <h3 className="text-base sm:text-lg font-black text-white mb-6 text-center">
            Detailed Plan Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-4 font-bold">Feature</th>
                  <th className="pb-4 font-bold text-center">Basic (₹50/mo)</th>
                  <th className="pb-4 font-bold text-center text-cyan-400">Pro (₹70/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-3.5 font-medium">Full Course Curriculum</td>
                  <td className="py-3.5 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Cloud Code Editor &amp; Sandbox</td>
                  <td className="py-3.5 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Interactive Learning Notes</td>
                  <td className="py-3.5 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Live AI Teaching &amp; Audio Dictation</td>
                  <td className="py-3.5 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium">Progress Monitoring &amp; Guidance</td>
                  <td className="py-3.5 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">✓</td>
                </tr>
                <tr className="bg-blue-500/5">
                  <td className="py-3.5 font-bold text-white">AI Interview Preparation</td>
                  <td className="py-3.5 text-center text-slate-500">—</td>
                  <td className="py-3.5 text-center text-cyan-400 font-bold">✓ Included</td>
                </tr>
                <tr className="bg-blue-500/5">
                  <td className="py-3.5 font-bold text-white">Resume Builder &amp; ATS Scanner</td>
                  <td className="py-3.5 text-center text-slate-500">—</td>
                  <td className="py-3.5 text-center text-cyan-400 font-bold">✓ Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
