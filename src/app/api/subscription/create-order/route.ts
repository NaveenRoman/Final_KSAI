import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateOrderSummary, isValidPlanTier, isValidDuration } from "@/lib/subscription-config";

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
    const { plan, durationMonths } = body;

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

    // 3. Strictly derive pricing & tax server-side (NEVER trust client amounts)
    const summary = calculateOrderSummary(plan, durationMonths);

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

    const orderOptions = {
      amount: summary.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user.id,
        userEmail: user.email || "",
        planTier: summary.planTier,
        durationMonths: String(summary.durationMonths),
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
