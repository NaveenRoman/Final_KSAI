"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, ArrowLeft, Home, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";

function FailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const reason = searchParams.get("reason") || "Your payment could not be processed by the gateway.";
  const plan = searchParams.get("plan") || "basic";

  return (
    <div className="max-w-md mx-auto px-4 pt-40 pb-24 text-center space-y-6 relative z-10">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/25 flex items-center justify-center text-red-400 mx-auto text-2xl font-bold shadow-xl shadow-red-500/10">
        <AlertCircle size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Payment Unsuccessful</h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {reason}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0E0E14] border border-white/10 text-left text-xs space-y-2 text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <HelpCircle size={14} className="text-blue-400" />
          <span>Troubleshooting Tips:</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
          <li>Ensure UPI ID or card details are entered correctly.</li>
          <li>Check that your bank permits online merchant transactions.</li>
          <li>No charges were made to your account.</li>
        </ul>
      </div>

      <div className="space-y-2.5 pt-2">
        <button
          onClick={() => router.push(`/plans/duration?plan=${plan.toLowerCase()}`)}
          className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <RefreshCw size={15} />
          <span>Try Again</span>
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Home size={14} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
}

export default function PlansFailurePage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-cyan-500 selection:text-black">
      <Navbar />
      <Suspense fallback={<div className="pt-40 text-center text-slate-400">Loading...</div>}>
        <FailureContent />
      </Suspense>
    </div>
  );
}
