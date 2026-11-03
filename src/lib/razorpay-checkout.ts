"use client";

/**
 * KnowledgeStream AI — Centralized Razorpay Checkout Utility
 *
 * Capabilities:
 * 1. Singleton script loader for checkout.js (loads once, cached promise)
 * 2. Concurrency lock to prevent duplicate clicks and order submissions
 * 3. Secure order creation via /api/create-order (server-side price derivation)
 * 4. Automatic modal lifecycle management (ondismiss and payment.failed)
 * 5. Cryptographic payment verification via /api/verify-payment transmitting
 *    razorpay_payment_id, razorpay_order_id, and razorpay_signature
 */

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface CheckoutResult {
  paymentId: string;
  orderId: string;
  signature: string;
  enrollment?: any;
  verified: boolean;
  alreadyEnrolled?: boolean;
  isFreeTest?: boolean;
}

export interface CheckoutOptions {
  courseId?: string;
  service?: string;
  currency?: string;
  userEmail?: string;
  userName?: string;
  courseTitle?: string;
  themeColor?: string;
  onSuccess: (result: CheckoutResult) => void | Promise<void>;
  onError?: (error: string) => void;
  onDismiss?: () => void;
  onStateChange?: (state: "idle" | "creating_order" | "ready" | "verifying" | "success" | "error") => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;
let isCheckoutActive = false;

/**
 * Loads Razorpay Checkout.js script once as a singleton promise.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => {
        scriptLoadingPromise = null;
        resolve(false);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptLoadingPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Main entry point to initiate Razorpay Standard Checkout.
 */
export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  if (isCheckoutActive) {
    console.warn("[Razorpay Checkout] Checkout is already in progress. Ignoring duplicate click.");
    return;
  }

  isCheckoutActive = true;
  options.onStateChange?.("creating_order");

  try {
    // 1. Kick off script loading in parallel with order creation
    const scriptPromise = loadRazorpayScript();

    // 2. Request backend order creation (prices strictly derived server-side)
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: options.courseId,
        service: options.service,
        currency: options.currency || "INR",
        userEmail: options.userEmail,
      }),
    });

    const orderData = await orderRes.json().catch(() => ({}));

    // Handle already enrolled
    if (orderData.alreadyEnrolled) {
      isCheckoutActive = false;
      options.onStateChange?.("success");
      await options.onSuccess({
        paymentId: "already_enrolled",
        orderId: "",
        signature: "",
        alreadyEnrolled: true,
        verified: true,
      });
      return;
    }

    // Handle server-configured Free Course Test Mode
    if (orderData.freeTestMode) {
      const enrollRes = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: options.courseId,
          userEmail: options.userEmail,
        }),
      });
      const enrollData = await enrollRes.json().catch(() => ({}));

      isCheckoutActive = false;
      options.onStateChange?.("success");

      if (enrollData.success) {
        await options.onSuccess({
          paymentId: `free_test_${options.courseId || "service"}`,
          orderId: "",
          signature: "",
          isFreeTest: true,
          verified: true,
          enrollment: enrollData.enrollment,
        });
      } else {
        const errorMsg = enrollData.error || "Free test mode enrollment failed.";
        options.onError?.(errorMsg);
      }
      return;
    }

    if (!orderRes.ok || !orderData.success || (!orderData.order_id && !orderData.order?.id)) {
      const errMsg = orderData.error || "Failed to create payment order.";
      isCheckoutActive = false;
      options.onStateChange?.("error");
      options.onError?.(errMsg);
      return;
    }

    // 3. Ensure Checkout.js script is ready
    const scriptLoaded = await scriptPromise;
    if (!scriptLoaded || typeof window === "undefined" || !window.Razorpay) {
      isCheckoutActive = false;
      options.onStateChange?.("error");
      options.onError?.("Razorpay SDK could not be loaded. Please check your internet connection and try again.");
      return;
    }

    const orderId = orderData.order_id || orderData.order.id;
    const amount = orderData.amount || orderData.order.amount;
    const currency = orderData.currency || orderData.order.currency || "INR";
    const razorpayKey = orderData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // 4. Configure Razorpay modal options
    const rzpOptions: any = {
      key: razorpayKey,
      amount: amount,
      currency: currency,
      name: "KnowledgeStream AI",
      description: options.courseTitle || orderData.order?.notes?.courseTitle || "Premium Access",
      order_id: orderId,
      prefill: {
        name: options.userName || "Student",
        email: options.userEmail || "",
        contact: "9999999999",
      },
      theme: {
        color: options.themeColor || "#3B82F6",
      },
      modal: {
        ondismiss: function () {
          isCheckoutActive = false;
          options.onStateChange?.("idle");
          options.onDismiss?.();
        },
      },
      handler: async function (response: RazorpaySuccessResponse) {
        options.onStateChange?.("verifying");
        try {
          // 5. Mandatory server-side cryptographic signature verification
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: options.courseId,
              service: options.service,
              userEmail: options.userEmail,
            }),
          });

          const verifyData = await verifyRes.json().catch(() => ({}));

          if (verifyRes.ok && verifyData.success && verifyData.verified) {
            isCheckoutActive = false;
            options.onStateChange?.("success");
            await options.onSuccess({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              enrollment: verifyData.enrollment,
              alreadyEnrolled: verifyData.alreadyEnrolled,
              verified: true,
            });
          } else {
            isCheckoutActive = false;
            options.onStateChange?.("error");
            const err = verifyData.error || "Payment verification failed.";
            options.onError?.(err);
          }
        } catch (verifyErr: any) {
          isCheckoutActive = false;
          options.onStateChange?.("error");
          options.onError?.(verifyErr.message || "Network error verifying payment.");
        }
      },
    };

    options.onStateChange?.("ready");
    const rzp = new window.Razorpay(rzpOptions);

    rzp.on("payment.failed", function (response: any) {
      isCheckoutActive = false;
      options.onStateChange?.("error");
      const failReason = response?.error?.description || "Payment failed or was cancelled.";
      options.onError?.(failReason);
    });

    rzp.open();
  } catch (err: any) {
    isCheckoutActive = false;
    options.onStateChange?.("error");
    options.onError?.(err.message || "Failed to initiate payment gateway.");
  }
}
