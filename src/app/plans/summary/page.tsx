"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Lock,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import {
  OFFICIAL_PLANS,
  calculateOrderSummary,
  isValidPlanTier,
  isValidDuration,
  PlanTier,
  PlanDurationMonths,
  OrderSummary,
} from "@/lib/subscription-config";
import { loadRazorpayScript, RazorpaySuccessResponse } from "@/lib/razorpay-checkout";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function OrderSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawPlan = searchParams.get("plan");
  const rawDuration = searchParams.get("duration");
  const rawSubject = searchParams.get("subject") || searchParams.get("course");

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { summary, calculationError } = useMemo(() => {
    try {
      if (!isValidPlanTier(rawPlan) || !isValidDuration(rawDuration)) {
        return {
          summary: null,
          calculationError: "Invalid plan or duration specified in URL. Durations must be 1 or 4 months.",
        };
      }
      const calculated = calculateOrderSummary(rawPlan, rawDuration, rawSubject);
      return { summary: calculated, calculationError: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to calculate order summary.";
      return { summary: null, calculationError: message };
    }
  }, [rawPlan, rawDuration, rawSubject]);

  async function handlePayNow() {
    if (!summary || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus("Creating secure payment order...");

    try {
      // 1. Load Razorpay script in parallel
      const scriptPromise = loadRazorpayScript();

      // 2. Create order on server
      const orderRes = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: summary.planTier,
          durationMonths: summary.durationMonths,
        }),
      });

      const orderData = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok || !orderData.success || !orderData.orderId) {
        if (orderRes.status === 401) {
          router.push(`/auth?redirect=/plans/summary?plan=${summary.planTier.toLowerCase()}&duration=${summary.durationMonths}`);
          return;
        }
        throw new Error(orderData.error || "Failed to initialize payment gateway order.");
      }

      setProcessingStatus("Loading secure Razorpay modal...");
      const scriptLoaded = await scriptPromise;

      if (!scriptLoaded || typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Could not load Razorpay gateway. Please check your internet connection.");
      }

      // 3. Configure Razorpay modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Codexa AI",
        description: `${summary.planName} (${summary.durationMonths} Months)`,
        order_id: orderData.orderId,
        theme: {
          color: summary.planTier === "PRO" ? "#7C3AED" : "#3B82F6",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setProcessingStatus("");
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          setProcessingStatus("Verifying payment cryptographically on server...");
          try {
            const verifyRes = await fetch("/api/subscription/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => ({}));

            if (verifyRes.ok && verifyData.success && verifyData.verified) {
              setProcessingStatus("Subscription activated! Redirecting...");
              router.push(
                `/plans/success?order_id=${response.razorpay_order_id}&plan=${summary.planTier.toLowerCase()}&payment_id=${response.razorpay_payment_id}`
              );
            } else {
              const errMsg = verifyData.error || "Payment verification failed.";
              router.push(
                `/plans/failure?reason=${encodeURIComponent(errMsg)}&order_id=${response.razorpay_order_id}&plan=${summary.planTier.toLowerCase()}`
              );
            }
          } catch (verifyErr: unknown) {
            const errStr = verifyErr instanceof Error ? verifyErr.message : "Network error verifying payment.";
            router.push(
              `/plans/failure?reason=${encodeURIComponent(errStr)}&plan=${summary.planTier.toLowerCase()}`
            );
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        setIsProcessing(false);
        setProcessingStatus("");
        const desc = response?.error?.description || "Payment was declined or cancelled.";
        setErrorMessage(desc);
      });

      rzp.open();
    } catch (err: unknown) {
      setIsProcessing(false);
      setProcessingStatus("");
      const errMsg = err instanceof Error ? err.message : "Failed to process payment.";
      setErrorMessage(errMsg);
    }
  }

  if (calculationError || !summary) {
    return (
      <div className="max-w-md mx-auto px-4 pt-40 pb-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-black text-white">Invalid Order Parameters</h2>
        <p className="text-xs text-slate-400">
          {calculationError || "Please return to the plans page and select a valid plan and duration."}
        </p>
        <button
          onClick={() => router.push("/plans")}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
        >
          View Available Plans
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
      {/* Back button */}
      {/* Back button */}
      <button
        onClick={() =>
          router.push(
            `/plans/duration?plan=${summary.planTier.toLowerCase()}${
              rawSubject ? `&subject=${rawSubject}` : ""
            }`
          )
        }
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Duration Selection
      </button>

      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <CreditCard size={13} /> Step 3 of 3: Order Summary
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Review Your Subscription</h1>
        <p className="text-slate-400 text-xs">
          Transparent pricing breakdown before gateway checkout. No hidden fees.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0E0E14]/90 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Plan Header Pill */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Subscription Plan
            </span>
            <div className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
              <span>{summary.planName}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {summary.durationMonths} {summary.durationMonths === 1 ? "Month" : "Months"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400">Monthly Rate</span>
            <div className="text-base font-black text-slate-300 font-mono">
              ₹{summary.monthlyRate}/mo
            </div>
          </div>
        </div>

        {/* Course / Bundle Access Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-cyan-300 font-black text-[10px] uppercase">
              Access Scope
            </span>
            <span className="font-bold text-white">
              {summary.accessDescription}
            </span>
          </div>
          {summary.selectedSubject && (
            <span className="text-[11px] text-slate-300 font-semibold self-start sm:self-auto">
              Selected: <strong className="text-cyan-300">{summary.selectedSubject}</strong>
            </span>
          )}
        </div>

        {/* Transparent Itemized Fee Breakdown */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Base Subscription Amount ({summary.durationMonths} mo)</span>
            <span className="font-mono font-bold text-white">₹{summary.basePrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Applicable GST ({summary.gstPercentage}%)</span>
              <span className="text-[10px] text-slate-500">(Government tax)</span>
            </span>
            <span className="font-mono font-bold text-white">₹{summary.gstAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Payment Gateway Charges</span>
              <span className="text-[10px] text-emerald-400 font-bold">(0% Waived)</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">₹{summary.feeAmount.toFixed(2)}</span>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
            <div>
              <span className="text-sm font-black text-white uppercase tracking-wider">
                Total Amount Payable
              </span>
              <p className="text-[10px] text-slate-400">One-time payment · No recurring charge</p>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              ₹{summary.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Included Features Snapshot */}
        <div className="pt-4 border-t border-white/10">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
            What You Get:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            {summary.features.map((feat, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pay Now Button */}
        <div className="pt-2">
          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className={`w-full py-4 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isProcessing
                ? "bg-slate-700 cursor-not-allowed text-slate-400"
                : "bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 hover:opacity-95 shadow-xl shadow-blue-500/25"
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin text-cyan-300" />
                <span>{processingStatus || "Processing Gateway Request..."}</span>
              </>
            ) : (
              <>
                <Lock size={15} className="text-cyan-300" />
                <span>Pay ₹{summary.totalAmount.toFixed(2)} via Razorpay</span>
              </>
            )}
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-500 font-semibold">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" /> 256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={13} className="text-blue-500" /> Official Razorpay Gateway
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-purple-400" /> Instant Activation
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OrderSummaryPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-cyan-500 selection:text-black">
      <Navbar />
      <Suspense fallback={<div className="pt-40 text-center text-slate-400">Loading order summary...</div>}>
        <OrderSummaryContent />
      </Suspense>
    </div>
  );
}
