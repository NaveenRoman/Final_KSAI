import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = body;

    // 1. Authenticate user
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user && body.userEmail) {
      user = await db.user.findUnique({
        where: { email: String(body.userEmail).toLowerCase().trim() },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify payment." },
        { status: 401 }
      );
    }

    if (!razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: "Missing razorpay_payment_id parameter." },
        { status: 400 }
      );
    }

    // 2. Reject mock payment IDs in production
    const isMock =
      typeof razorpay_payment_id === "string" &&
      (razorpay_payment_id.startsWith("pay_mock_") || razorpay_payment_id.startsWith("order_mock_"));

    if (process.env.NODE_ENV === "production" && isMock) {
      return NextResponse.json(
        { success: false, error: "Mock payments are disallowed in production mode." },
        { status: 400 }
      );
    }

    // 3. Cryptographic HMAC-SHA256 signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (process.env.NODE_ENV === "production") {
      if (!secret) {
        return NextResponse.json(
          { success: false, error: "Razorpay payment verification is unconfigured on the server." },
          { status: 503 }
        );
      }
      if (!razorpay_order_id || !razorpay_signature) {
        return NextResponse.json(
          { success: false, error: "Cryptographic signature and order ID are required." },
          { status: 400 }
        );
      }
    }

    if (secret && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: "Invalid payment signature. Verification failed." },
          { status: 400 }
        );
      }
    }

    // 4. Check if payment ID has already been utilized (anti-replay / duplicate prevention)
    const existingPayment = await db.enrollment.findFirst({
      where: { paymentId: razorpay_payment_id },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment replay detected: This payment transaction has already been processed.",
          duplicate: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id || null,
      userId: user.id,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("Payment Verification API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify payment." },
      { status: 500 }
    );
  }
}
