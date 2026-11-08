import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  AVAILABLE_SUBJECTS,
  calculateOrderSummary,
  isValidPlanTier,
  isValidDuration,
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
    const { plan, durationMonths, subject } = body;

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

    // 3. Normalize & Validate Subject against database courses
    let cleanSubject = typeof subject === "string" ? subject.trim().toLowerCase() : "";
    if (cleanSubject === "c++") cleanSubject = "cpp";

    let targetCourseIds: string[] = [];

    if (plan === "BASIC" && durationMonths === 1) {
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
      // Basic 4 Months & Pro: All 4 Subjects Bundle
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

    // 4. Fail-closed Razorpay credential check
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error("[Subscription] Razorpay credentials missing on server.");
      return NextResponse.json(
        { error: "Payment gateway credentials are not configured on the server." },
        { status: 503 }
      );
    }

    // 5. Initialize Razorpay client
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receipt = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const effectiveSubject = cleanSubject || (durationMonths === 4 || plan === "PRO" ? "ALL_4_SUBJECTS" : "");

    const orderOptions = {
      amount: summary.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        planTier: summary.planTier,
        durationMonths: String(summary.durationMonths),
        subject: effectiveSubject,
        courseIds: targetCourseIds.join(","),
        type: "SUBSCRIPTION",
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // 6. Record PaymentOrder in database
    await db.paymentOrder.create({
      data: {
        orderId: order.id,
        userId: user.id,
        plan: summary.planTier,
        durationMonths: summary.durationMonths,
        baseAmount: summary.basePrice,
        gstAmount: summary.gstAmount,
        feeAmount: summary.feeAmount,
        totalAmount: summary.totalAmount,
        amountPaise: summary.amountPaise,
        currency: "INR",
        status: "CREATED",
        receipt,
        metadata: JSON.stringify({
          userEmail: user.email,
          gstPercentage: summary.gstPercentage,
          subject: effectiveSubject,
          courseIds: targetCourseIds,
          planTier: summary.planTier,
          durationMonths: summary.durationMonths,
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
    });
  } catch (error: unknown) {
    console.error("Subscription Order Creation Error:", error);
    const err = error as { error?: { description?: string }; message?: string };
    const errorMsg =
      err?.error?.description || err?.message || "Failed to create subscription order.";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
