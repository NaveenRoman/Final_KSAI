import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FREE_COURSE_TEST_MODE } from "@/lib/course-config";
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
  [key: string]: unknown;
}

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

    // 1. Authenticate user strictly using Better Auth standard getSession
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to enroll in courses." },
        { status: 401 }
      );
    }

    // Prevent cross-user enrollment spoofing
    const userRole = (user as { role?: string }).role;
    if (
      bodyEmail &&
      user.email &&
      bodyEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() &&
      userRole !== "Admin"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot enroll on behalf of another user." },
        { status: 403 }
      );
    }

    // 2. Validate course exists
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { error: "Course ID is required." },
        { status: 400 }
      );
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // 3. Check if user is already enrolled (prevent duplicate enrollment rows)
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
        alreadyEnrolled: true,
      });
    }

    // 4. BRANCH A: Free Course Test Mode (strictly server-side configured)
    if (FREE_COURSE_TEST_MODE) {
      let freeEnrollment: { enrollment: unknown; alreadyEnrolled: boolean };
      try {
        freeEnrollment = await db.$transaction(
          async (tx) => {
            // Serialize concurrent requests for this user via row lock
            await tx.user.update({
              where: { id: user.id },
              data: { updatedAt: new Date() },
            });

            const existing = await tx.enrollment.findFirst({
              where: {
                userId: user.id,
                courseId: course.id,
              },
            });

            if (existing) {
              return { enrollment: existing, alreadyEnrolled: true };
            }

            const created = await tx.enrollment.create({
              data: {
                userId: user.id,
                courseId: course.id,
                paidAmount: 0,
                paymentId: `free_test_${course.id}_${user.id}`,
                progress: 0,
              },
              include: {
                course: true,
              },
            });

            return { enrollment: created, alreadyEnrolled: false };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );
      } catch (freeErr: unknown) {
        const err = freeErr as { code?: string; message?: string };
        const isConcurrencyConflict =
          err?.code === "P2034" ||
          err?.message?.includes("SQLITE_BUSY") ||
          err?.message?.includes("could not serialize access");

        if (isConcurrencyConflict) {
          const enrolled = await db.enrollment.findFirst({
            where: { userId: user.id, courseId: course.id },
          });
          if (enrolled) {
            return NextResponse.json({
              success: true,
              message: "Already enrolled in this course.",
              enrollment: enrolled,
              alreadyEnrolled: true,
            });
          }
        }
        throw freeErr;
      }

      if (freeEnrollment.alreadyEnrolled) {
        return NextResponse.json({
          success: true,
          message: "Already enrolled in this course.",
          enrollment: freeEnrollment.enrollment,
          alreadyEnrolled: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Successfully enrolled in course (Free Test Mode)!",
        enrollment: freeEnrollment.enrollment,
      });
    }

    // 5. BRANCH B: Production Paid Razorpay Flow (isolated when FREE_COURSE_TEST_MODE is false)
    if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
      return NextResponse.json(
        { error: "Payment ID is required." },
        { status: 400 }
      );
    }

    // Production mock payment protection
    const isMockPayment =
      paymentId.startsWith("pay_mock_") || paymentId.startsWith("order_mock_");

    if (process.env.NODE_ENV === "production" && isMockPayment) {
      return NextResponse.json(
        { error: "Mock payments are strictly disallowed in production environment." },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!isMockPayment) {
      if (!key_id || !razorpaySecret) {
        if (process.env.NODE_ENV === "production") {
          console.error("[Payment Security] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in production.");
          return NextResponse.json(
            { error: "Payment verification system is unconfigured in production environment." },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: "Payment verification credentials are missing on server." },
          { status: 503 }
        );
      }

      if (!razorpay_order_id || typeof razorpay_order_id !== "string" || razorpay_order_id.trim() === "") {
        return NextResponse.json(
          { error: "Razorpay order ID is required for payment verification." },
          { status: 400 }
        );
      }

      if (!razorpay_signature || typeof razorpay_signature !== "string" || razorpay_signature.trim() === "") {
        return NextResponse.json(
          { error: "Cryptographic signature is required for payment verification." },
          { status: 400 }
        );
      }

      // 5.1 Cryptographic HMAC SHA256 Signature Verification
      const cleanSignature = razorpay_signature.trim();
      const cleanOrderId = razorpay_order_id.trim();
      const cleanPaymentId = paymentId.trim();

      const isHex64 =
        cleanSignature.length === 64 &&
        /^[0-9a-fA-F]{64}$/.test(cleanSignature);

      if (!isHex64) {
        return NextResponse.json(
          { error: "Cryptographic payment verification failed: Invalid signature format." },
          { status: 400 }
        );
      }

      const expectedSignature = crypto
        .createHmac("sha256", razorpaySecret)
        .update(`${cleanOrderId}|${cleanPaymentId}`)
        .digest("hex");

      const expectedBuffer = Buffer.from(expectedSignature, "hex");
      const receivedBuffer = Buffer.from(cleanSignature, "hex");

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        return NextResponse.json(
          { error: "Cryptographic payment verification failed: Invalid signature." },
          { status: 400 }
        );
      }

      // 5.2 Server-Side Provider API Verification (Fail Closed)
      let paymentRecord: RazorpayPaymentEntity;
      try {
        const razorpay = new Razorpay({
          key_id,
          key_secret: razorpaySecret,
        });
        paymentRecord = (await razorpay.payments.fetch(cleanPaymentId)) as unknown as RazorpayPaymentEntity;
      } catch (fetchErr: unknown) {
        console.error("[Payment Security] Razorpay provider API fetch error:", {
          paymentId: cleanPaymentId,
          error: fetchErr instanceof Error ? fetchErr.message : "Unknown error",
        });
        return NextResponse.json(
          { error: "Payment verification failed: Unable to verify transaction with payment provider." },
          { status: 502 }
        );
      }

      // Assert captured status
      if (paymentRecord.status !== "captured") {
        console.error("[Payment Security] Uncaptured transaction status:", {
          paymentId: cleanPaymentId,
          status: paymentRecord.status,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction is not in captured status." },
          { status: 400 }
        );
      }

      // Assert expected amount in paise (strictly derived from database course price)
      const expectedAmountPaise = Math.round(course.price * 100);
      if (paymentRecord.amount !== expectedAmountPaise) {
        console.error("[Payment Security] Payment amount mismatch:", {
          paymentId: cleanPaymentId,
          expectedPaise: expectedAmountPaise,
          actualPaise: paymentRecord.amount,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction amount mismatch." },
          { status: 400 }
        );
      }

      // Assert currency is INR
      if (paymentRecord.currency !== "INR") {
        console.error("[Payment Security] Payment currency mismatch:", {
          paymentId: cleanPaymentId,
          currency: paymentRecord.currency,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction currency mismatch." },
          { status: 400 }
        );
      }

      // Assert non-empty matching order ID
      if (!paymentRecord.order_id || paymentRecord.order_id !== cleanOrderId) {
        console.error("[Payment Security] Order ID mismatch:", {
          paymentId: cleanPaymentId,
          expectedOrder: cleanOrderId,
          actualOrder: paymentRecord.order_id,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction is not linked to the expected order." },
          { status: 400 }
        );
      }

      // Assert payment belongs to this course if courseId was recorded in notes
      const paymentNotes = paymentRecord.notes as Record<string, string> | undefined;
      if (paymentNotes?.courseId && paymentNotes.courseId !== course.id) {
        console.error("[Payment Security] Payment notes courseId mismatch:", {
          paymentId: cleanPaymentId,
          expectedCourseId: course.id,
          actualCourseId: paymentNotes.courseId,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction is not valid for this course." },
          { status: 400 }
        );
      }

      // Assert payment belongs to this user if userId was recorded in notes
      if (paymentNotes?.userId && paymentNotes.userId !== user.id && userRole !== "Admin") {
        console.error("[Payment Security] Payment notes userId mismatch:", {
          paymentId: cleanPaymentId,
          expectedUserId: user.id,
          actualUserId: paymentNotes.userId,
        });
        return NextResponse.json(
          { error: "Payment verification failed: Transaction belongs to another user account." },
          { status: 403 }
        );
      }
    }

    // 6. Atomic Enrollment Creation with Concurrency Lock & Anti-Replay
    const cleanPaymentId = paymentId.trim();
    let enrollmentResult: { enrollment: unknown; alreadyEnrolled: boolean };

    try {
      enrollmentResult = await db.$transaction(
        async (tx) => {
          // Serialize concurrent requests for this user via row lock
          await tx.user.update({
            where: { id: user.id },
            data: { updatedAt: new Date() },
          });

          // Re-check existing user enrollment under transaction
          const existingUser = await tx.enrollment.findFirst({
            where: {
              userId: user.id,
              courseId: course.id,
            },
          });

          if (existingUser) {
            return { enrollment: existingUser, alreadyEnrolled: true };
          }

          // Re-check payment ID replay under transaction
          const existingPayment = await tx.enrollment.findFirst({
            where: { paymentId: cleanPaymentId },
          });

          if (existingPayment) {
            throw new Error("PAYMENT_REPLAY");
          }

          const created = await tx.enrollment.create({
            data: {
              userId: user.id,
              courseId: course.id,
              paidAmount: course.price,
              paymentId: cleanPaymentId,
              progress: 10,
            },
            include: {
              course: true,
            },
          });

          return { enrollment: created, alreadyEnrolled: false };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (txErr: unknown) {
      if (txErr instanceof Error && txErr.message === "PAYMENT_REPLAY") {
        return NextResponse.json(
          {
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

      if (isConcurrencyConflict) {
        const enrolled = await db.enrollment.findFirst({
          where: { userId: user.id, courseId: course.id },
        });
        if (enrolled) {
          return NextResponse.json({
            success: true,
            message: "Already enrolled in this course.",
            enrollment: enrolled,
            alreadyEnrolled: true,
          });
        }
      }
      throw txErr;
    }

    if (enrollmentResult.alreadyEnrolled) {
      return NextResponse.json({
        success: true,
        message: "Already enrolled in this course.",
        enrollment: enrollmentResult.enrollment,
        alreadyEnrolled: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in course!",
      enrollment: enrollmentResult.enrollment,
    });
  } catch (error: unknown) {
    console.error("Enrollment API Error:", error);
    return NextResponse.json(
      { error: "Failed to process course enrollment." },
      { status: 500 }
    );
  }
}
