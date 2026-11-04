import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { activateSubscriptionRecord } from "@/lib/subscription-service";
import { PlanTier, PlanDurationMonths } from "@/lib/subscription-config";

interface RazorpayPaymentEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  notes?: Record<string, string>;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user strictly using Better Auth getSession
    const session = await auth.api.getSession({
      headers: await headers().catch(() => req.headers),
    });
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify subscription payment." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // 2. Strict presence check for all 3 cryptographic fields
    if (!razorpay_order_id || typeof razorpay_order_id !== "string" || !razorpay_order_id.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: razorpay_order_id." },
        { status: 400 }
      );
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== "string" || !razorpay_payment_id.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: razorpay_payment_id." },
        { status: 400 }
      );
    }

    if (!razorpay_signature || typeof razorpay_signature !== "string" || !razorpay_signature.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: razorpay_signature." },
        { status: 400 }
      );
    }

    const cleanOrderId = razorpay_order_id.trim();
    const cleanPaymentId = razorpay_payment_id.trim();
    const cleanSignature = razorpay_signature.trim();

    // Verify signature format (must be 64-character hex string)
    const isHex64 = cleanSignature.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanSignature);
    if (!isHex64) {
      return NextResponse.json(
        { success: false, error: "Invalid payment signature format." },
        { status: 400 }
      );
    }

    // 3. Fail closed if gateway secret is missing
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!secret || !key_id) {
      console.error("[Subscription Verification] Missing RAZORPAY_KEY_SECRET on server.");
      return NextResponse.json(
        { success: false, error: "Payment verification system is unconfigured on the server." },
        { status: 503 }
      );
    }

    // 4. Constant-Time Cryptographic HMAC-SHA256 Signature Verification
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${cleanOrderId}|${cleanPaymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(cleanSignature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      console.error("[Subscription Verification] Signature mismatch for order:", cleanOrderId);
      return NextResponse.json(
        { success: false, error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }

    // 5. Look up recorded PaymentOrder in database
    const paymentOrder = await db.paymentOrder.findUnique({
      where: { orderId: cleanOrderId },
    });

    if (!paymentOrder) {
      return NextResponse.json(
        { success: false, error: "Order record not found in system." },
        { status: 404 }
      );
    }

    // Assert order belongs to authenticated user
    const userRole = (user as { role?: string }).role;
    if (paymentOrder.userId !== user.id && userRole !== "Admin") {
      return NextResponse.json(
        { success: false, error: "Payment order belongs to another user account." },
        { status: 403 }
      );
    }

    // 6. Direct Provider API Verification (fetch from Razorpay)
    const razorpay = new Razorpay({
      key_id,
      key_secret: secret,
    });

    let paymentRecord: RazorpayPaymentEntity;
    try {
      paymentRecord = (await razorpay.payments.fetch(cleanPaymentId)) as unknown as RazorpayPaymentEntity;
    } catch (fetchErr: unknown) {
      console.error("[Subscription Verification] Razorpay API fetch failed:", fetchErr);
      return NextResponse.json(
        { success: false, error: "Unable to verify transaction with payment provider." },
        { status: 502 }
      );
    }

    if (paymentRecord.status !== "captured") {
      return NextResponse.json(
        { success: false, error: `Payment is not captured. Current status: ${paymentRecord.status}` },
        { status: 400 }
      );
    }

    if (paymentRecord.currency !== "INR") {
      return NextResponse.json(
        { success: false, error: `Currency mismatch. Expected INR, received ${paymentRecord.currency}.` },
        { status: 400 }
      );
    }

    if (paymentRecord.amount !== paymentOrder.amountPaise) {
      console.error("[Subscription Verification] Amount mismatch:", {
        expected: paymentOrder.amountPaise,
        received: paymentRecord.amount,
      });
      return NextResponse.json(
        { success: false, error: `Amount mismatch. Expected ${paymentOrder.amountPaise} paise, received ${paymentRecord.amount}.` },
        { status: 400 }
      );
    }

    // 7. Atomically activate subscription and update order status
    const subscription = await activateSubscriptionRecord({
      userId: paymentOrder.userId,
      plan: paymentOrder.plan as PlanTier,
      durationMonths: paymentOrder.durationMonths as PlanDurationMonths,
      orderId: cleanOrderId,
      paymentId: cleanPaymentId,
      baseAmount: paymentOrder.baseAmount,
      gstAmount: paymentOrder.gstAmount,
      feeAmount: paymentOrder.feeAmount,
      totalAmount: paymentOrder.totalAmount,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentId: subscription.paymentId,
        totalAmount: subscription.totalAmount,
      },
      orderId: cleanOrderId,
    });
  } catch (error: unknown) {
    console.error("Subscription Payment Verification Error:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error during payment verification." },
      { status: 500 }
    );
  }
}
