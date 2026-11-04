"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Code2, BookOpen, Video, FileText, Sparkles, Home } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");
  const plan = searchParams.get("plan")?.toUpperCase() || "PRO";

  const [subDetails, setSubDetails] = useState<any>(null);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasActiveSubscription) {
          setSubDetails(data.subscription);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24 relative z-10 text-center">
      {/* Success Badge */}
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-2xl shadow-emerald-500/20 mb-6">
        <CheckCircle2 size={44} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
        <Sparkles size={13} /> Payment Verified &amp; Activated
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
        Welcome to Codexa {plan === "PRO" ? "Pro" : "Basic"}!
      </h1>
      <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
        Your payment has been cryptographically confirmed and your account subscription is active immediately.
      </p>

      {/* Subscription Receipt Card */}
      <div className="my-8 rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-6 sm:p-8 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <span className="font-bold text-slate-400">Subscription Tier</span>
          <span className="font-black text-cyan-400 uppercase tracking-wider">
            Codexa {plan} Plan
          </span>
        </div>

        {subDetails?.endDate && (
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <span className="font-bold text-slate-400">Valid Until</span>
            <span className="font-mono font-bold text-white">
              {new Date(subDetails.endDate).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        )}

        {paymentId && (
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <span className="font-bold text-slate-400">Razorpay Payment ID</span>
            <span className="font-mono text-slate-300 text-[11px]">{paymentId}</span>
          </div>
        )}

        {orderId && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">Order Reference</span>
            <span className="font-mono text-slate-300 text-[11px]">{orderId}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 max-w-md mx-auto">
        <button
          onClick={() => router.push("/editor")}
          className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Code2 size={16} />
          <span>Launch Cloud Code Editor</span>
          <ArrowRight size={14} />
        </button>

        {plan === "PRO" && (
          <button
            onClick={() => router.push("/interview")}
            className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Video size={16} className="text-purple-400" />
            <span>Start AI Interview Mock Practice</span>
          </button>
        )}

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Home size={14} />
          <span>Return to Student Dashboard</span>
        </button>
      </div>
    </div>
  );
}

export default function PlansSuccessPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-cyan-500 selection:text-black">
      <Navbar />
      <Suspense fallback={<div className="pt-40 text-center text-slate-400">Loading confirmation...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
