import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  AVAILABLE_SUBJECTS,
  calculateOrderSummary,
  calculateUpgradeSummary,
  isValidPlanTier,
  isValidDuration,
  UpgradeSummary,
} from "@/lib/subscription-config";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user strictly using Better Auth getSession
    const session = await auth.api.getSession({
      headers: await headers().catch(() => req.headers),
    });
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to initiate subscription order." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { plan, durationMonths, subject, isUpgrade } = body;

    // 2. Validate requested plan & duration
    if (!isValidPlanTier(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected. Must be BASIC or PRO." },
        { status: 400 }
      );
    }

    if (!isValidDuration(durationMonths)) {
      return NextResponse.json(
        { error: "Invalid duration selected. Must be 1 or 4 months." },
        { status: 400 }
      );
    }

    // Check if this is an Upgrade from active Basic to Pro
    const activeSub = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });

    const isUpgradeRequested = Boolean(
      isUpgrade || (plan === "PRO" && activeSub && activeSub.plan === "BASIC")
    );

    let upgradeSummary: UpgradeSummary | null = null;
    if (isUpgradeRequested) {
      if (!activeSub || activeSub.plan !== "BASIC") {
        return NextResponse.json(
          { error: "Cannot upgrade: No active Basic subscription found to credit." },
          { status: 400 }
        );
      }
      upgradeSummary = calculateUpgradeSummary({
        activeSub,
        targetDurationMonths: durationMonths,
      });
    }

    // 3. Normalize & Validate Subject against database courses
    let cleanSubject = typeof subject === "string" ? subject.trim().toLowerCase() : "";
    if (cleanSubject === "c++") cleanSubject = "cpp";

    let targetCourseIds: string[] = [];

    if (!isUpgradeRequested && plan === "BASIC" && durationMonths === 1) {
      if (!cleanSubject) {
        return NextResponse.json(
          { error: "A valid subject (python, java, c, cpp) is required for the 1-month Basic plan." },
          { status: 400 }
        );
      }

      const isValidSubject = AVAILABLE_SUBJECTS.some((s) => s.id === cleanSubject);
      if (!isValidSubject) {
        return NextResponse.json(
          { error: `Invalid subject: '${cleanSubject}'. Must be python, java, c, or cpp.` },
          { status: 400 }
        );
      }

      const targetCourse = await db.course.findFirst({
        where: { language: cleanSubject },
      });

      if (!targetCourse) {
        return NextResponse.json(
          { error: `Course for subject '${cleanSubject}' is not available in the catalog.` },
          { status: 404 }
        );
      }

      targetCourseIds = [targetCourse.id];
    } else {
      // Basic 4 Months, Pro, & Pro Upgrade: All 4 Subjects Bundle
      const bundleCourses = await db.course.findMany({
        where: { language: { in: ["python", "java", "c", "cpp"] } },
      });

      if (!bundleCourses || bundleCourses.length === 0) {
        return NextResponse.json(
          { error: "Required courses are not configured in the catalog." },
          { status: 404 }
        );
      }

      targetCourseIds = bundleCourses.map((c) => c.id);
    }

    // 4. Strictly derive pricing & tax server-side (NEVER trust client amounts)
    const summary = calculateOrderSummary(plan, durationMonths, cleanSubject || undefined);

    // Fail-closed Razorpay credential check with whitespace/quote sanitization
    const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const key_id = rawKeyId.trim().replace(/^["']|["']$/g, "");
    const key_secret = rawKeySecret.trim().replace(/^["']|["']$/g, "");

    const hasKeyId = Boolean(key_id.length > 0);
    const hasKeySecret = Boolean(key_secret.length > 0);

    if (!hasKeyId || !hasKeySecret) {
      console.error("[Subscription] Razorpay credentials missing on server:", {
        hasKeyId,
        hasKeySecret,
      });
      return NextResponse.json(
        { error: "Payment gateway credentials are not configured on the server." },
        { status: 503 }
      );
    }

    // 5. Initialize Razorpay client with sanitized credentials
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receipt = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveSubject = cleanSubject || (durationMonths === 4 || plan === "PRO" || isUpgradeRequested ? "ALL_4_SUBJECTS" : "");

    // Effective pricing parameters: standard order vs upgrade order
    const effectiveAmountPaise = upgradeSummary ? upgradeSummary.amountPaise : summary.amountPaise;
    const effectiveBasePrice = upgradeSummary ? upgradeSummary.netUpgradeBase : summary.basePrice;
    const effectiveGstAmount = upgradeSummary ? upgradeSummary.upgradeGst : summary.gstAmount;
    const effectiveFeeAmount = upgradeSummary ? upgradeSummary.feeAmount : summary.feeAmount;
    const effectiveTotalAmount = upgradeSummary ? upgradeSummary.totalUpgradeAmount : summary.totalAmount;

    const orderOptions = {
      amount: effectiveAmountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        planTier: upgradeSummary ? "PRO" : summary.planTier,
        durationMonths: String(upgradeSummary ? upgradeSummary.targetDurationMonths : summary.durationMonths),
        subject: effectiveSubject,
        courseIds: targetCourseIds.join(","),
        type: isUpgradeRequested ? "SUBSCRIPTION_UPGRADE" : "SUBSCRIPTION",
        isUpgrade: isUpgradeRequested ? "true" : "false",
        previousSubscriptionId: upgradeSummary?.previousSubscriptionId || "",
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // 6. Record PaymentOrder in database
    await db.paymentOrder.create({
      data: {
        orderId: order.id,
        userId: user.id,
        plan: upgradeSummary ? "PRO" : summary.planTier,
        durationMonths: upgradeSummary ? upgradeSummary.targetDurationMonths : summary.durationMonths,
        baseAmount: effectiveBasePrice,
        gstAmount: effectiveGstAmount,
        feeAmount: effectiveFeeAmount,
        totalAmount: effectiveTotalAmount,
        amountPaise: effectiveAmountPaise,
        currency: "INR",
        status: "CREATED",
        receipt,
        metadata: JSON.stringify({
          userEmail: user.email,
          gstPercentage: upgradeSummary ? upgradeSummary.gstPercentage : summary.gstPercentage,
          subject: effectiveSubject,
          courseIds: targetCourseIds,
          planTier: upgradeSummary ? "PRO" : summary.planTier,
          durationMonths: upgradeSummary ? upgradeSummary.targetDurationMonths : summary.durationMonths,
          isUpgrade: isUpgradeRequested,
          previousSubscriptionId: upgradeSummary?.previousSubscriptionId || null,
          unusedCredit: upgradeSummary?.unusedBaseCredit || 0,
          originalBasicTotal: upgradeSummary?.originalBasicTotal || null,
          upgradeExplanation: upgradeSummary?.explanation || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: key_id,
      summary,
      isUpgrade: isUpgradeRequested,
      upgradeSummary,
    });
  } catch (error: unknown) {
    console.error("Subscription Order Creation Error:", error);
    const err = error as { statusCode?: number; error?: { code?: string; description?: string }; message?: string };
    
    if (err?.statusCode === 401 || err?.error?.description?.includes("Authentication failed")) {
      const configuredKey = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
      const isLive = configuredKey.startsWith("rzp_live_");
      console.error("[Subscription] Razorpay Authentication Failed (HTTP 401). Credential Diagnostic:", {
        isLive,
        keyPrefix: isLive ? "rzp_live_" : configuredKey.startsWith("rzp_test_") ? "rzp_test_" : "UNKNOWN",
        keyLength: configuredKey.length,
        hasSecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
        secretLength: (process.env.RAZORPAY_KEY_SECRET || "").trim().length,
        diagnostic: isLive
          ? "Server is using an rzp_live_ Key ID. Verify that RAZORPAY_KEY_SECRET in Vercel matches this live key."
          : "Server is using an rzp_test_ Key ID. Live payments require an rzp_live_ Key ID and matching Live Secret.",
      });
    }

    const errorMsg =
      err?.error?.description || err?.message || "Failed to create subscription order.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Safe Configuration Diagnostic endpoint (GET).
 * Reports whether Razorpay credentials exist, whether mode is LIVE or TEST,
 * and key prefix WITHOUT ever printing or exposing secret values or full keys.
 */
export async function GET() {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

  const key_id = rawKeyId.trim().replace(/^["']|["']$/g, "");
  const key_secret = rawKeySecret.trim().replace(/^["']|["']$/g, "");

  const hasKeyId = Boolean(key_id.length > 0);
  const hasKeySecret = Boolean(key_secret.length > 0);
  const isLive = key_id.startsWith("rzp_live_");
  const isTest = key_id.startsWith("rzp_test_");

  return NextResponse.json({
    status: "ok",
    gateway: "Razorpay",
    diagnostics: {
      hasKeyId,
      hasKeySecret,
      isLive,
      isTest,
      keyPrefix: isLive ? "rzp_live_" : isTest ? "rzp_test_" : hasKeyId ? "UNKNOWN_PREFIX" : "MISSING",
      keyIdLength: key_id.length,
      keySecretLength: key_secret.length,
      readyForLive: isLive && hasKeySecret && key_secret.length >= 16,
    },
  });
}
