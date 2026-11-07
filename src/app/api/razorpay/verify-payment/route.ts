import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/client";
import Razorpay from "razorpay";
import crypto from "crypto";

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
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      service,
      userEmail: bodyEmail,
    } = body;

    // 1. Authenticate user strictly using Better Auth standard getSession
    const sessionData = await auth.api.getSession({
      headers: await headers().catch(() => req.headers),
    });
    let user = sessionData?.user ?? null;

    if (!user && bodyEmail) {
      user = await db.user.findUnique({
        where: { email: String(bodyEmail).toLowerCase().trim() },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify payment." },
        { status: 401 }
      );
    }

    // 2. Strict requirement: all three payment verification fields must be present and non-empty
    if (!razorpay_order_id || typeof razorpay_order_id !== "string" || razorpay_order_id.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: razorpay_order_id." },
        { status: 400 }
      );
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== "string" || razorpay_payment_id.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: razorpay_payment_id." },
        { status: 400 }
      );
    }

    if (!razorpay_signature || typeof razorpay_signature !== "string" || razorpay_signature.trim() === "") {
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

    // 3. Fail closed if gateway credentials are missing — never bypass signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!secret || !key_id) {
      console.error("[Payment Security] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET on server.");
      return NextResponse.json(
        { success: false, error: "Payment verification system is unconfigured on the server." },
        { status: 503 }
      );
    }

    // 4. Cryptographic HMAC-SHA256 signature verification with timingSafeEqual
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
      console.error("[Payment Security] Signature mismatch for order:", cleanOrderId);
      return NextResponse.json(
        { success: false, error: "Invalid payment signature. Verification failed." },
        { status: 400 }
      );
    }

    // 5. Server-Side Provider API Verification (Fetch from Razorpay)
    const razorpay = new Razorpay({
      key_id,
      key_secret: secret,
    });

    let paymentRecord: RazorpayPaymentEntity;
    try {
      paymentRecord = (await razorpay.payments.fetch(cleanPaymentId)) as unknown as RazorpayPaymentEntity;
    } catch (fetchErr: unknown) {
      console.error("[Payment Security] Razorpay provider API fetch error:", fetchErr);
      return NextResponse.json(
        { success: false, error: "Unable to verify transaction with payment provider." },
        { status: 502 }
      );
    }

    // 5.1 Assert captured status
    if (paymentRecord.status !== "captured") {
      console.error("[Payment Security] Transaction not captured:", {
        paymentId: cleanPaymentId,
        status: paymentRecord.status,
      });
      return NextResponse.json(
        { success: false, error: `Payment is not in captured status. Current status: ${paymentRecord.status}` },
        { status: 400 }
      );
    }

    // 5.2 Assert order ID matches
    if (!paymentRecord.order_id || paymentRecord.order_id !== cleanOrderId) {
      console.error("[Payment Security] Order ID mismatch:", {
        expected: cleanOrderId,
        actual: paymentRecord.order_id,
      });
      return NextResponse.json(
        { success: false, error: "Payment is not associated with the provided order ID." },
        { status: 400 }
      );
    }

    // 5.3 Assert currency is INR
    if (paymentRecord.currency !== "INR") {
      console.error("[Payment Security] Currency mismatch:", paymentRecord.currency);
      return NextResponse.json(
        { success: false, error: `Currency mismatch. Expected INR, received ${paymentRecord.currency}.` },
        { status: 400 }
      );
    }

    // 5.4 Assert payment notes belong to this authenticated user
    const userRole = (user as { role?: string }).role;
    if (
      paymentRecord.notes?.userId &&
      paymentRecord.notes.userId !== user.id &&
      userRole !== "Admin"
    ) {
      console.error("[Payment Security] Payment notes userId mismatch:", {
        paymentId: cleanPaymentId,
        expectedUserId: user.id,
        actualUserId: paymentRecord.notes.userId,
      });
      return NextResponse.json(
        { success: false, error: "Payment verification failed: Transaction belongs to another user account." },
        { status: 403 }
      );
    }

    // 5.5 Strictly validate courseId against paymentRecord.notes.courseId
    const notesCourseId = paymentRecord.notes?.courseId;
    if (courseId && notesCourseId && notesCourseId !== courseId) {
      console.error("[Payment Security] Payment notes courseId mismatch:", {
        paymentId: cleanPaymentId,
        requestedCourseId: courseId,
        notesCourseId,
      });
      return NextResponse.json(
        { success: false, error: "Payment verification failed: Transaction was not created for the requested course." },
        { status: 400 }
      );
    }

    // 5.6 Assert amount in paise matches server-side pricing
    let targetCourse: { id: string; title: string; price: number } | null = null;
    let expectedPaise = 0;

    const effectiveCourseId = courseId || notesCourseId;
    if (effectiveCourseId && effectiveCourseId !== "codenthra-resume-builder") {
      targetCourse = await db.course.findUnique({
        where: { id: effectiveCourseId },
        select: { id: true, title: true, price: true },
      });

      if (!targetCourse) {
        return NextResponse.json(
          { success: false, error: "Associated course was not found." },
          { status: 404 }
        );
      }
      expectedPaise = Math.round(targetCourse.price * 100);
    } else if (service === "resume-builder" || effectiveCourseId === "codenthra-resume-builder") {
      expectedPaise = 100; // ₹1 = 100 paise
    }

    // Validate minimum ₹1 (100 paise)
    if (paymentRecord.amount < 100) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be at least ₹1 (100 paise)." },
        { status: 400 }
      );
    }

    if (expectedPaise > 0 && paymentRecord.amount !== expectedPaise) {
      console.error("[Payment Security] Amount mismatch:", {
        expectedPaise,
        actualPaise: paymentRecord.amount,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Amount mismatch. Expected ${expectedPaise} paise, received ${paymentRecord.amount} paise.`,
        },
        { status: 400 }
      );
    }

    // 6. Atomic Access Grant & Anti-Replay Protection (Serializable Transaction)
    let enrollment: unknown = null;
    try {
      enrollment = await db.$transaction(
        async (tx) => {
          // Serialize concurrent user operations
          await tx.user.update({
            where: { id: user.id },
            data: { updatedAt: new Date() },
          });

          // Check if payment ID has already been utilized (anti-replay)
          const existingPayment = await tx.enrollment.findFirst({
            where: { paymentId: cleanPaymentId },
          });

          const existingActivity = await tx.activityLog.findFirst({
            where: {
              actionType: "RESUME_BUILDER_UNLOCKED",
              metadata: { contains: cleanPaymentId },
            },
          });

          if (existingPayment || existingActivity) {
            throw new Error("PAYMENT_REPLAY");
          }

          if (targetCourse) {
            const existingEnrollment = await tx.enrollment.findFirst({
              where: {
                userId: user.id,
                courseId: targetCourse.id,
              },
            });

            if (existingEnrollment) {
              return existingEnrollment;
            }

            const newEnrollment = await tx.enrollment.create({
              data: {
                userId: user.id,
                courseId: targetCourse.id,
                paidAmount: targetCourse.price,
                paymentId: cleanPaymentId,
                progress: 0,
              },
              include: {
                course: true,
              },
            });

            return newEnrollment;
          }

          if (service === "resume-builder" || effectiveCourseId === "codenthra-resume-builder") {
            const existingResumeLog = await tx.activityLog.findFirst({
              where: {
                userId: user.id,
                actionType: "RESUME_BUILDER_UNLOCKED",
              },
            });

            if (!existingResumeLog) {
              await tx.activityLog.create({
                data: {
                  userId: user.id,
                  actionType: "RESUME_BUILDER_UNLOCKED",
                  metadata: JSON.stringify({
                    paymentId: cleanPaymentId,
                    orderId: cleanOrderId,
                    amount: paymentRecord.amount,
                  }),
                },
              });
            }

            return { unlocked: true, service: "resume-builder" };
          }

          return null;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (txErr: unknown) {
      if (txErr instanceof Error && txErr.message === "PAYMENT_REPLAY") {
        return NextResponse.json(
          {
            success: false,
            error: "Payment replay detected: This transaction has already been processed.",
            duplicate: true,
          },
          { status: 400 }
        );
      }

      const err = txErr as { code?: string; message?: string };
      const isConcurrencyConflict =
        err?.code === "P2034" ||
        err?.message?.includes("SQLITE_BUSY") ||
        err?.message?.includes("could not serialize access");

      if (isConcurrencyConflict && targetCourse) {
        const enrolled = await db.enrollment.findFirst({
          where: { userId: user.id, courseId: targetCourse.id },
        });
        if (enrolled) {
          return NextResponse.json({
            success: true,
            verified: true,
            alreadyEnrolled: true,
            enrollment: enrolled,
            paymentId: cleanPaymentId,
            orderId: cleanOrderId,
          });
        }
      }
      throw txErr;
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId: cleanPaymentId,
      orderId: cleanOrderId,
      userId: user.id,
      enrollment: enrollment || undefined,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    console.error("Payment Verification API Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to verify payment.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
