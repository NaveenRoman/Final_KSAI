"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, ShieldAlert } from "lucide-react";

const PLANS = [
  {
    name: "Basic",
    price: "₹50",
    period: "/ month",
    description: "Essential coding suite with full curriculum, interactive editor, and AI guidance.",
    popular: false,
    color: "#3B82F6",
    href: "/plans/duration?plan=basic",
    features: [
      "Full Interactive Course Curriculum",
      "Cloud Code Editor & Sandbox",
      "Interactive Learning Notes",
      "Live AI Teacher Dictation & Audio Mode",
      "Daily Progress Monitoring & Analytics",
      "Personalized Learning Guidance",
    ],
    buttonText: "Select Basic Plan",
  },
  {
    name: "Pro",
    price: "₹70",
    period: "/ month",
    description: "Complete career acceleration suite with interview simulations and resume studio.",
    popular: true,
    color: "#7C3AED",
    href: "/plans/duration?plan=pro",
    features: [
      "Every Basic Feature Included",
      "AI Interview Preparation & Mock Sessions",
      "Professional Resume Builder & ATS Scanner",
      "Priority Sandboxed Container Execution",
      "Full Solution Analysis & AST Hints",
      "Career Readiness Verification",
    ],
    buttonText: "Claim Pro Access",
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-28 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3.5 py-1.5 rounded-full glass-panel border border-cyan-500/30">
          Transparent Investment
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
          Predictable Pricing for <span className="gradient-text-hero">Every Scale</span>
        </h2>
        <p className="text-slate-400 text-base sm:text-lg">
          Start for free, scale effortlessly with your project or engineering organization.
        </p>

        {/* Billing Toggle */}
        <div className="pt-4 flex items-center justify-center gap-4">
          <span className={`text-sm font-semibold ${!annual ? "text-white" : "text-slate-400"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="w-14 h-8 rounded-full glass-panel border border-white/20 p-1 flex items-center transition-colors relative"
          >
            <motion.div
              animate={{ x: annual ? 24 : 0 }}
              className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md"
            />
          </button>
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${annual ? "text-white" : "text-slate-400"}`}>
            Annual Billing
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
        {PLANS.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.15 }}
            whileHover={{ y: -8 }}
            className={`p-8 rounded-3xl border relative flex flex-col justify-between transition-all duration-300 ${
              plan.popular
                ? "bg-gradient-to-b from-blue-950/40 via-[#0F0F1D]/80 to-[#09090B]/90 border-blue-500/80 shadow-2xl shadow-blue-500/25 glow-border-blue"
                : "glass-panel border-white/10 hover:border-white/20"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-400 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1">
                <Sparkles size={13} /> RECOMMENDED
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                  {plan.price}
                </span>
                <span className="text-slate-400 text-sm font-medium">{plan.period}</span>
              </div>

              <ul className="space-y-3 pt-4 border-t border-white/10">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                    <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <a
                href={plan.href}
                className={`w-full py-4 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-400 text-white glow-btn shadow-xl shadow-blue-500/30"
                    : "glass-panel hover:bg-white/10 text-white border border-white/20"
                }`}
              >
                {plan.buttonText}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
