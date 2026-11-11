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
  calculateOrderSummary,
  isValidPlanTier,
  isValidDuration,
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
          subject: rawSubject || undefined,
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
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft size={15} /> Back to Duration Selection
      </button>

      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <CreditCard size={13} /> Step 3 of 3: Order Summary
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Review Your Subscription</h1>
        <p className="text-slate-300 text-xs sm:text-sm font-medium">
          Transparent pricing breakdown before gateway checkout. No hidden fees.
        </p>
      </div>

      {/* Main Order Card — SUBSCRIPTION SUMMARY CARD */}
      <div className="rounded-3xl border-2 border-cyan-500/30 bg-[#0F172A] p-6 sm:p-8 md:p-9 shadow-2xl space-y-6 dark-subscription-card">
        {/* Plan Header Pill */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider !text-white">
              Subscription Plan
            </span>
            <div className="text-xl sm:text-2xl font-black !text-white flex items-center gap-2.5 mt-1">
              <span>{summary.planName}</span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/30 !text-white font-bold border border-cyan-500/40">
                {summary.durationMonths} {summary.durationMonths === 1 ? "Month" : "Months"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold !text-white block">Monthly Rate</span>
            <div className="text-lg sm:text-xl font-black !text-white font-mono mt-0.5">
              ₹{summary.monthlyRate}/mo
            </div>
          </div>
        </div>

        {/* Course / Bundle Access Banner */}
        <div className="p-4 rounded-2xl bg-[#141E33] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/30 !text-white font-black text-[11px] uppercase tracking-wide">
              Access Scope
            </span>
            <span className="font-bold !text-white">
              {summary.accessDescription}
            </span>
          </div>
          {summary.selectedSubject && (
            <span className="text-xs !text-white font-medium self-start sm:self-auto">
              Selected: <strong className="!text-white font-bold underline">{summary.selectedSubject}</strong>
            </span>
          )}
        </div>

        {/* Transparent Itemized Fee Breakdown */}
        <div className="space-y-3.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium !text-white">Base Subscription Amount ({summary.durationMonths} mo)</span>
            <span className="font-mono font-bold !text-white">₹{summary.basePrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium !text-white">Applicable GST ({summary.gstPercentage}%)</span>
              <span className="text-[11px] !text-white font-normal">(Government tax)</span>
            </div>
            <span className="font-mono font-bold !text-white">₹{summary.gstAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium !text-white">Payment Gateway Charges</span>
              <span className="text-[11px] !text-white font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                (0% Waived)
              </span>
            </div>
            <span className="font-mono font-bold !text-white">₹{summary.feeAmount.toFixed(2)}</span>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-baseline">
            <div>
              <span className="text-base sm:text-lg font-black !text-white uppercase tracking-wider">
                Total Amount Payable
              </span>
              <p className="text-xs !text-white mt-0.5">One-time payment · No recurring charge</p>
            </div>
            <div className="text-3xl sm:text-4xl font-black !text-white font-mono tracking-tight">
              ₹{summary.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Included Features Snapshot */}
        <div className="pt-5 border-t border-slate-800">
          <span className="text-xs font-black !text-white uppercase tracking-wider block mb-3">
            What You Get:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            {summary.features.map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
                <span className="!text-white font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span className="!text-white">{errorMessage}</span>
          </div>
        )}

        {/* Pay Now Button */}
        <div className="pt-3">
          <button
            onClick={handlePayNow}
            disabled={isProcessing}
            className={`w-full py-4.5 px-6 rounded-2xl text-base font-black !text-white flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl min-h-[54px] active:scale-[0.99] ${
              isProcessing
                ? "bg-slate-800 cursor-not-allowed text-slate-400 border border-slate-700"
                : "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 shadow-cyan-500/20 hover:shadow-cyan-500/30"
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={18} className="animate-spin text-cyan-300" />
                <span className="!text-white">{processingStatus || "Processing Gateway Request..."}</span>
              </>
            ) : (
              <>
                <Lock size={18} className="text-white" />
                <span className="!text-white">Pay ₹{summary.totalAmount.toFixed(2)} via Razorpay</span>
              </>
            )}
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-5 text-xs !text-white font-medium">
          <span className="flex items-center gap-1.5 !text-white font-medium">
            <ShieldCheck size={15} className="text-emerald-400" /> 256-Bit SSL Encrypted
          </span>
          <span className="flex items-center gap-1.5 !text-white font-medium">
            <CheckCircle2 size={15} className="text-cyan-400" /> Official Razorpay Gateway
          </span>
          <span className="flex items-center gap-1.5 !text-white font-medium">
            <Sparkles size={15} className="text-purple-400" /> Instant Activation
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
