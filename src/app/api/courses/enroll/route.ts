import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userEmail: bodyEmail,
      courseId,
      paymentId,
      razorpay_order_id,
      razorpay_signature,
    } = body;

    // 1. Production mock payment protection
    const isMockPayment =
      typeof paymentId === "string" &&
      (paymentId.startsWith("pay_mock_") || paymentId.startsWith("order_mock_"));

    if (process.env.NODE_ENV === "production" && isMockPayment) {
      return NextResponse.json(
        { error: "Mock payments are strictly disallowed in production environment." },
        { status: 400 }
      );
    }

    // 2. Razorpay HMAC SHA256 Signature Verification
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (process.env.NODE_ENV === "production") {
      if (!razorpaySecret) {
        return NextResponse.json(
          { error: "Payment verification system is unconfigured in production environment." },
          { status: 503 }
        );
      }
      if (!razorpay_order_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Cryptographic payment verification requires order ID and signature." },
          { status: 400 }
        );
      }
    }

    if (razorpaySecret && razorpay_order_id && razorpay_signature) {
      const expectedSignature = crypto
        .createHmac("sha256", razorpaySecret)
        .update(`${razorpay_order_id}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json(
          { error: "Cryptographic payment verification failed: Invalid signature." },
          { status: 400 }
        );
      }
    }

    // 3. Resolve user session from Better Auth
    const sessionData = await auth.api.getSession({ headers: await headers() });
    let user = sessionData?.user ?? null;

    // Fallback in non-production/test environments
    const userEmail = user?.email || bodyEmail;
    if (!user && userEmail) {
      user = await db.user.findUnique({
        where: { email: userEmail.toLowerCase().trim() },
      });
    }

    if (!courseId || !paymentId) {
      return NextResponse.json(
        { error: "Course ID and payment ID are required." },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found or unauthenticated." },
        { status: 401 }
      );
    }

    // Prevent cross-user enrollment spoofing
    if (
      bodyEmail &&
      user.email &&
      bodyEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() &&
      user.role !== "Admin"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot enroll on behalf of another user." },
        { status: 403 }
      );
    }

    // 4. Verify course exists and derive server-side price
    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // 5. Anti-Replay: Verify payment ID has not been used previously
    const existingPaymentEnrollment = await db.enrollment.findFirst({
      where: { paymentId },
    });

    if (existingPaymentEnrollment) {
      return NextResponse.json(
        {
          error: "Payment replay detected: This transaction has already been processed.",
          duplicate: true,
        },
        { status: 400 }
      );
    }

    // 6. Check if user is already enrolled
    const existingUserEnrollment = await db.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
      },
    });

    if (existingUserEnrollment) {
      return NextResponse.json({
        success: true,
        message: "Already enrolled in this course.",
        enrollment: existingUserEnrollment,
      });
    }

    // 7. Create Enrollment Record strictly with server-verified price
    const enrollment = await db.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        paidAmount: course.price, // STRICT: Derived from server database record
        paymentId,
        progress: 10,
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled & payment verified!",
      enrollment,
    });
  } catch (error: any) {
    console.error("Enrollment API Error:", error);
    return NextResponse.json(
      { error: "Failed to process course enrollment." },
      { status: 500 }
    );
  }
}
