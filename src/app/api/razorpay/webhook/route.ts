import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { activateSubscriptionRecord } from "@/lib/subscription-service";
import { PlanTier, PlanDurationMonths, isValidPlanTier, isValidDuration } from "@/lib/subscription-config";

interface RazorpayWebhookPaymentEntity {
  id: string;
  entity: string;
  amount: number; // in paise
  currency: string;
  status: string;
  order_id: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  created_at?: number;
}

interface RazorpayWebhookPayload {
  entity: string;
  account_id?: string;
  event: string;
  contains?: string[];
  payload?: {
    payment?: {
      entity: RazorpayWebhookPaymentEntity;
    };
    order?: {
      entity: Record<string, unknown>;
    };
  };
  created_at?: number;
}

export async function POST(req: Request) {
  try {
    // 1. Read the EXACT raw request body as text (crucial for cryptographic verification)
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const eventId = req.headers.get("x-razorpay-event-id") || "";

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 2. Strict Fail-Closed Secret Guard: Never accept or process webhooks if secret is missing
    if (!webhookSecret) {
      console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on server.");
      return NextResponse.json(
        { error: "Webhook secret is not configured on the server." },
        { status: 503 }
      );
    }

    // 3. Validate presence of signature
    if (!signature) {
      console.warn("[Razorpay Webhook] Missing x-razorpay-signature header.");
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header." },
        { status: 400 }
      );
    }

    // 4. Verify HMAC-SHA256 against raw body using timingSafeEqual
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      console.warn("[Razorpay Webhook] Cryptographic signature mismatch.");
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    // 5. Parse JSON payload securely
    let body: RazorpayWebhookPayload;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    const eventType = body.event;
    const payment = body.payload?.payment?.entity;

    // 6. Handle payment.captured
    if (eventType === "payment.captured") {
      if (!payment) {
        return NextResponse.json(
          { error: "Missing payment entity in payload." },
          { status: 400 }
        );
      }

      const paymentId = payment.id?.trim();
      const orderId = payment.order_id?.trim();
      const amountPaise = Number(payment.amount);
      const currency = payment.currency;
      const status = payment.status;
      const notes = payment.notes || {};

      // Validate payment integrity
      if (!paymentId || !orderId) {
        return NextResponse.json(
          { error: "Missing payment ID or order ID." },
          { status: 400 }
        );
      }

      if (status !== "captured") {
        return NextResponse.json(
          { error: `Payment status is not captured: ${status}` },
          { status: 400 }
        );
      }

      if (currency !== "INR") {
        return NextResponse.json(
          { error: `Currency mismatch. Expected INR, received ${currency}.` },
          { status: 400 }
        );
      }

      if (isNaN(amountPaise) || amountPaise < 100) {
        return NextResponse.json(
          { error: "Payment amount must be at least ₹1 (100 paise)." },
          { status: 400 }
        );
      }

      // Resolve user account
      let targetUser = null;
      if (notes.userId) {
        targetUser = await db.user.findUnique({
          where: { id: notes.userId },
        });
      }
      if (!targetUser && payment.email) {
        targetUser = await db.user.findUnique({
          where: { email: payment.email.trim().toLowerCase() },
        });
      }

      if (!targetUser) {
        console.warn("[Razorpay Webhook] User account could not be resolved:", {
          userIdNote: notes.userId,
          paymentEmail: payment.email,
          paymentId,
        });
        // Acknowledge receipt to avoid infinite retries if user was deleted
        return NextResponse.json(
          { status: "user_not_found", paymentId },
          { status: 200 }
        );
      }

      // Handle Codexa Subscription Payment
      if (notes.type === "SUBSCRIPTION" || (notes.planTier && isValidPlanTier(notes.planTier))) {
        const paymentOrder = await db.paymentOrder.findUnique({
          where: { orderId },
        });

        const planTier = (notes.planTier && isValidPlanTier(notes.planTier)
          ? notes.planTier
          : paymentOrder?.plan || "BASIC") as PlanTier;
        const durationMonths = (notes.durationMonths && isValidDuration(notes.durationMonths)
          ? Number(notes.durationMonths)
          : paymentOrder?.durationMonths || 1) as PlanDurationMonths;

        const baseAmount = paymentOrder?.baseAmount ?? amountPaise / 100;
        const gstAmount = paymentOrder?.gstAmount ?? 0;
        const feeAmount = paymentOrder?.feeAmount ?? 0;
        const totalAmount = paymentOrder?.totalAmount ?? amountPaise / 100;

        let metaSubject: string | null = notes.subject || null;
        let metaCourseIds: string[] = [];

        if (notes.courseIds && typeof notes.courseIds === "string") {
          metaCourseIds = notes.courseIds.split(",").map((s) => s.trim()).filter(Boolean);
        }

        if (paymentOrder?.metadata) {
          try {
            const parsed = JSON.parse(paymentOrder.metadata);
            if (!metaSubject && typeof parsed.subject === "string") {
              metaSubject = parsed.subject;
            }
            if (metaCourseIds.length === 0 && Array.isArray(parsed.courseIds)) {
              metaCourseIds = parsed.courseIds.map(String);
            }
          } catch {}
        }

        const subscription = await activateSubscriptionRecord({
          userId: targetUser.id,
          plan: planTier,
          durationMonths,
          orderId,
          paymentId,
          baseAmount,
          gstAmount,
          feeAmount,
          totalAmount,
          subject: metaSubject,
          courseIds: metaCourseIds,
        });

        return NextResponse.json(
          { status: "ok", processed: true, paymentId, subscriptionId: subscription.id, plan: planTier },
          { status: 200 }
        );
      }

      const courseId = notes.courseId;
      const service = notes.service;

      // Validate Course purchase
      if (courseId && courseId !== "codenthra-resume-builder") {
        const course = await db.course.findUnique({
          where: { id: courseId },
          select: { id: true, title: true, price: true },
        });

        if (!course) {
          console.warn(`[Razorpay Webhook] Course ${courseId} not found.`);
          return NextResponse.json(
            { status: "course_not_found", courseId },
            { status: 200 }
          );
        }

        const expectedPaise = Math.round(course.price * 100);
        if (amountPaise !== expectedPaise) {
          console.error("[Razorpay Webhook] Amount mismatch:", {
            expectedPaise,
            receivedPaise: amountPaise,
            paymentId,
          });
          return NextResponse.json(
            { error: `Amount mismatch. Expected ${expectedPaise} paise, received ${amountPaise}.` },
            { status: 400 }
          );
        }

        // Atomic Access Grant & Multi-Layer Deduplication (Serializable Transaction)
        await db.$transaction(async (tx) => {
          // Serialize concurrent user operations
          await tx.user.update({
            where: { id: targetUser.id },
            data: { updatedAt: new Date() },
          });

          // Check if payment ID has already been utilized
          const existingPayment = await tx.enrollment.findFirst({
            where: { paymentId },
          });

          if (existingPayment) {
            return; // Idempotent exit
          }

          // Check if user is already enrolled
          const existingEnrollment = await tx.enrollment.findFirst({
            where: {
              userId: targetUser.id,
              courseId: course.id,
            },
          });

          if (!existingEnrollment) {
            await tx.enrollment.create({
              data: {
                userId: targetUser.id,
                courseId: course.id,
                paidAmount: course.price,
                paymentId,
                progress: 0,
              },
            });
          }

          // Record Webhook Audit Log
          const existingLog = await tx.activityLog.findFirst({
            where: {
              userId: targetUser.id,
              actionType: "WEBHOOK_PAYMENT_CAPTURED",
              metadata: { contains: paymentId },
            },
          });

          if (!existingLog) {
            await tx.activityLog.create({
              data: {
                userId: targetUser.id,
                actionType: "WEBHOOK_PAYMENT_CAPTURED",
                metadata: JSON.stringify({
                  eventId,
                  paymentId,
                  orderId,
                  courseId: course.id,
                  amountPaise,
                }),
              },
            });
          }
        });

        return NextResponse.json(
          { status: "ok", processed: true, paymentId, courseId: course.id },
          { status: 200 }
        );
      }

      // Validate Resume Studio purchase (₹1 fixed fee)
      if (service === "resume-builder" || courseId === "codenthra-resume-builder") {
        if (amountPaise !== 100) {
          console.error("[Razorpay Webhook] Resume Studio amount mismatch. Expected 100 paise, got:", amountPaise);
          return NextResponse.json(
            { error: `Resume Studio fee must be 100 paise (₹1), received ${amountPaise}.` },
            { status: 400 }
          );
        }

        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: targetUser.id },
            data: { updatedAt: new Date() },
          });

          const existingLog = await tx.activityLog.findFirst({
            where: {
              userId: targetUser.id,
              actionType: "RESUME_BUILDER_UNLOCKED",
            },
          });

          if (!existingLog) {
            await tx.activityLog.create({
              data: {
                userId: targetUser.id,
                actionType: "RESUME_BUILDER_UNLOCKED",
                metadata: JSON.stringify({
                  eventId,
                  paymentId,
                  orderId,
                  amountPaise,
                }),
              },
            });
          }
        });

        return NextResponse.json(
          { status: "ok", processed: true, paymentId, service: "resume-builder" },
          { status: 200 }
        );
      }

      // Payment for generic/custom service without course
      return NextResponse.json(
        { status: "ok", processed: false, reason: "No recognized product or service" },
        { status: 200 }
      );
    }

    // 7. Handle payment.failed
    if (eventType === "payment.failed") {
      if (!payment) {
        return NextResponse.json(
          { error: "Missing payment entity in payload." },
          { status: 400 }
        );
      }

      const paymentId = payment.id || "";
      const orderId = payment.order_id || "";
      const notes = payment.notes || {};

      let targetUser = null;
      if (notes.userId) {
        targetUser = await db.user.findUnique({
          where: { id: notes.userId },
        });
      }
      if (!targetUser && payment.email) {
        targetUser = await db.user.findUnique({
          where: { email: payment.email.trim().toLowerCase() },
        });
      }

      if (targetUser) {
        // Safe logging without exposing card numbers, credentials or secrets
        const sanitizedMetadata = {
          eventId,
          paymentId,
          orderId,
          errorCode: payment.error_code || "UNKNOWN",
          errorDescription: payment.error_description || "Payment failed",
          errorReason: payment.error_reason || "declined",
        };

        const existingFailLog = await db.activityLog.findFirst({
          where: {
            userId: targetUser.id,
            actionType: "WEBHOOK_PAYMENT_FAILED",
            metadata: { contains: paymentId },
          },
        });

        if (!existingFailLog) {
          await db.activityLog.create({
            data: {
              userId: targetUser.id,
              actionType: "WEBHOOK_PAYMENT_FAILED",
              metadata: JSON.stringify(sanitizedMetadata),
            },
          });
        }

        if (orderId) {
          await db.paymentOrder.updateMany({
            where: { orderId },
            data: { status: "FAILED", updatedAt: new Date() },
          });
        }
      }

      return NextResponse.json(
        { status: "ok", event: "payment.failed", recorded: !!targetUser },
        { status: 200 }
      );
    }

    // 8. Safely handle unexpected or other lifecycle event types
    // Returning 200 prevents Razorpay from retrying endlessly for events like order.paid, refund.processed, etc.
    return NextResponse.json(
      { status: "ignored", event: eventType },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error." },
      { status: 500 }
    );
  }
}
