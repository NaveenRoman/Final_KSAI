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
    refund?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        payment_id: string;
        notes?: Record<string, string>;
        status: string;
        created_at?: number;
      };
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

    // 5.1 Anti-Replay Webhook Guard: Idempotency based on x-razorpay-event-id
    const canonicalEventId = eventId || (body as any).id || (body as any).event_id || "";
    if (canonicalEventId) {
      const existingEvent = await db.webhookEvent.findUnique({
        where: { eventId: canonicalEventId },
      });
      if (existingEvent) {
        return NextResponse.json(
          { status: "already_processed", eventId: canonicalEventId },
          { status: 200 }
        );
      }
    }

    const recordProcessedEvent = async (evId: string, evType: string) => {
      if (!evId) return;
      try {
        await db.webhookEvent.create({
          data: {
            eventId: evId,
            eventType: evType,
          },
        });
      } catch (err: any) {
        console.warn(`[Webhook] Event ${evId} already recorded:`, err.message);
      }
    };

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

        await recordProcessedEvent(canonicalEventId, eventType);

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

        await recordProcessedEvent(canonicalEventId, eventType);

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

        await recordProcessedEvent(canonicalEventId, eventType);

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

      await recordProcessedEvent(canonicalEventId, eventType);

      return NextResponse.json(
        { status: "ok", event: "payment.failed", recorded: !!targetUser },
        { status: 200 }
      );
    }

    // 8. Handle Refund Lifecycle: refund.created
    if (eventType === "refund.created") {
      const refund = body.payload?.refund?.entity;
      if (!refund) {
        return NextResponse.json({ error: "Missing refund entity in payload." }, { status: 400 });
      }

      const refundId = refund.id?.trim();
      const paymentId = refund.payment_id?.trim();
      const amountPaise = Number(refund.amount);
      const currency = refund.currency || "INR";
      const notes = refund.notes || {};

      if (!refundId || !paymentId || isNaN(amountPaise) || amountPaise <= 0) {
        return NextResponse.json({ error: "Invalid refund payload parameters." }, { status: 400 });
      }

      const refundAmount = amountPaise / 100;

      await db.$transaction(async (tx) => {
        const existingRefund = await tx.paymentRefund.findUnique({
          where: { refundId },
        });

        // If already exists, do not downgrade if already PROCESSED or FAILED
        if (existingRefund) {
          return;
        }

        let targetUserId: string | null = null;
        if (notes.userId) {
          const user = await tx.user.findUnique({ where: { id: notes.userId }, select: { id: true } });
          if (user) targetUserId = user.id;
        }

        const paymentOrder = await tx.paymentOrder.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && paymentOrder) targetUserId = paymentOrder.userId;

        const subscription = await tx.subscription.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && subscription) targetUserId = subscription.userId;

        // Record strictly as PENDING:
        // - Do NOT increase PaymentOrder.amountRefunded
        // - Do NOT mark PaymentOrder as REFUNDED or PARTIALLY_REFUNDED
        // - Do NOT cancel subscription or revoke student access
        await tx.paymentRefund.create({
          data: {
            refundId,
            paymentId,
            orderId: paymentOrder?.orderId || subscription?.orderId || null,
            userId: targetUserId,
            amountPaise,
            amount: refundAmount,
            currency,
            status: "PENDING",
            isPartial: false,
          },
        });

        if (targetUserId) {
          await tx.activityLog.create({
            data: {
              userId: targetUserId,
              actionType: "PAYMENT_REFUND_CREATED",
              metadata: JSON.stringify({
                eventId: canonicalEventId,
                refundId,
                paymentId,
                refundAmount,
                status: "PENDING",
              }),
            },
          });
        }
      });

      await recordProcessedEvent(canonicalEventId, eventType);

      return NextResponse.json(
        { status: "ok", recorded: true, refundStatus: "PENDING", refundId, paymentId },
        { status: 200 }
      );
    }

    // 8.1 Handle Refund Lifecycle: refund.processed
    if (eventType === "refund.processed") {
      const refund = body.payload?.refund?.entity;
      if (!refund) {
        return NextResponse.json({ error: "Missing refund entity in payload." }, { status: 400 });
      }

      const refundId = refund.id?.trim();
      const paymentId = refund.payment_id?.trim();
      const amountPaise = Number(refund.amount);
      const currency = refund.currency || "INR";
      const notes = refund.notes || {};

      if (!refundId || !paymentId || isNaN(amountPaise) || amountPaise <= 0) {
        return NextResponse.json({ error: "Invalid refund payload parameters." }, { status: 400 });
      }

      const refundAmount = amountPaise / 100;

      await db.$transaction(async (tx) => {
        const existingRefund = await tx.paymentRefund.findUnique({
          where: { refundId },
        });

        // If already marked PROCESSED, exit idempotently to prevent duplicate accounting
        if (existingRefund && existingRefund.status === "PROCESSED") {
          return;
        }

        let targetUserId: string | null = null;
        if (notes.userId) {
          const user = await tx.user.findUnique({ where: { id: notes.userId }, select: { id: true } });
          if (user) targetUserId = user.id;
        }

        const paymentOrder = await tx.paymentOrder.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && paymentOrder) targetUserId = paymentOrder.userId;

        const subscription = await tx.subscription.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && subscription) targetUserId = subscription.userId;

        // Calculate cumulative PROCESSED refunds excluding this refundId
        const otherProcessedRefunds = await tx.paymentRefund.findMany({
          where: {
            paymentId,
            status: "PROCESSED",
            refundId: { not: refundId },
          },
        });
        const priorRefundedTotal = otherProcessedRefunds.reduce((sum, r) => sum + r.amount, 0);
        const newTotalRefunded = priorRefundedTotal + refundAmount;

        const originalTotal = paymentOrder?.totalAmount || subscription?.totalAmount || refundAmount;
        const isFullRefund = newTotalRefunded >= originalTotal;

        if (existingRefund) {
          // Upgrade existing PENDING / FAILED to PROCESSED
          await tx.paymentRefund.update({
            where: { refundId },
            data: {
              status: "PROCESSED",
              isPartial: !isFullRefund,
              amount: refundAmount,
              amountPaise,
              updatedAt: new Date(),
            },
          });
        } else {
          // Out-of-order refund.processed delivered before refund.created
          await tx.paymentRefund.create({
            data: {
              refundId,
              paymentId,
              orderId: paymentOrder?.orderId || subscription?.orderId || null,
              userId: targetUserId,
              amountPaise,
              amount: refundAmount,
              currency,
              status: "PROCESSED",
              isPartial: !isFullRefund,
            },
          });
        }

        // Update PaymentOrder
        if (paymentOrder) {
          await tx.paymentOrder.update({
            where: { id: paymentOrder.id },
            data: {
              status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refundStatus: isFullRefund ? "FULL" : "PARTIAL",
              amountRefunded: newTotalRefunded,
              updatedAt: new Date(),
            },
          });
        }

        // Only cancel subscription if cumulative successfully processed refunds reach full payment amount
        if (subscription && isFullRefund) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "CANCELLED",
              updatedAt: new Date(),
            },
          });
        }

        if (targetUserId) {
          await tx.activityLog.create({
            data: {
              userId: targetUserId,
              actionType: "PAYMENT_REFUND_PROCESSED",
              metadata: JSON.stringify({
                eventId: canonicalEventId,
                refundId,
                paymentId,
                refundAmount,
                newTotalRefunded,
                isFullRefund,
                orderId: paymentOrder?.orderId || null,
              }),
            },
          });
        }
      });

      await recordProcessedEvent(canonicalEventId, eventType);

      return NextResponse.json(
        { status: "ok", processed: true, refundStatus: "PROCESSED", refundId, paymentId, refundAmount },
        { status: 200 }
      );
    }

    // 8.2 Handle Refund Lifecycle: refund.failed
    if (eventType === "refund.failed") {
      const refund = body.payload?.refund?.entity;
      if (!refund) {
        return NextResponse.json({ error: "Missing refund entity in payload." }, { status: 400 });
      }

      const refundId = refund.id?.trim();
      const paymentId = refund.payment_id?.trim();
      const amountPaise = Number(refund.amount);
      const currency = refund.currency || "INR";
      const notes = refund.notes || {};

      if (!refundId || !paymentId) {
        return NextResponse.json({ error: "Invalid refund payload parameters." }, { status: 400 });
      }

      const refundAmount = !isNaN(amountPaise) && amountPaise > 0 ? amountPaise / 100 : 0;

      await db.$transaction(async (tx) => {
        const existingRefund = await tx.paymentRefund.findUnique({
          where: { refundId },
        });

        // CRITICAL INVARIANT: A previously PROCESSED refund must NEVER be downgraded to FAILED by a late event
        if (existingRefund && existingRefund.status === "PROCESSED") {
          console.warn(`[Razorpay Webhook] Ignoring refund.failed for already PROCESSED refund: ${refundId}`);
          return;
        }

        let targetUserId: string | null = null;
        if (notes.userId) {
          const user = await tx.user.findUnique({ where: { id: notes.userId }, select: { id: true } });
          if (user) targetUserId = user.id;
        }

        const paymentOrder = await tx.paymentOrder.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && paymentOrder) targetUserId = paymentOrder.userId;

        const subscription = await tx.subscription.findFirst({
          where: { paymentId },
        });
        if (!targetUserId && subscription) targetUserId = subscription.userId;

        if (existingRefund) {
          // Update PENDING to FAILED
          await tx.paymentRefund.update({
            where: { refundId },
            data: {
              status: "FAILED",
              updatedAt: new Date(),
            },
          });
        } else {
          // Record directly as FAILED
          await tx.paymentRefund.create({
            data: {
              refundId,
              paymentId,
              orderId: paymentOrder?.orderId || subscription?.orderId || null,
              userId: targetUserId,
              amountPaise,
              amount: refundAmount,
              currency,
              status: "FAILED",
              isPartial: false,
            },
          });
        }

        // Do NOT deduct from financial totals (status is FAILED, so filtered out)
        // Do NOT cancel subscription

        if (targetUserId) {
          await tx.activityLog.create({
            data: {
              userId: targetUserId,
              actionType: "PAYMENT_REFUND_FAILED",
              metadata: JSON.stringify({
                eventId: canonicalEventId,
                refundId,
                paymentId,
                status: "FAILED",
              }),
            },
          });
        }
      });

      await recordProcessedEvent(canonicalEventId, eventType);

      return NextResponse.json(
        { status: "ok", recorded: true, refundStatus: "FAILED", refundId, paymentId },
        { status: 200 }
      );
    }

    // 9. Safely handle unexpected or other lifecycle event types
    // Returning 200 prevents Razorpay from retrying endlessly for unhandled event types
    return NextResponse.json(
      { status: "ignored", event: eventType },
      { status: 200 }
    );
  } catch (error: unknown) {
    // FIX 3: Safely handle Prisma unique constraint collision (P2002) for concurrent webhook requests
    if (
      error instanceof Error &&
      (error as any).code === "P2002"
    ) {
      const target = (error as any).meta?.target;
      const isTargetMatched =
        (Array.isArray(target) && (target.includes("eventId") || target.includes("refundId"))) ||
        (typeof target === "string" && (target.includes("eventId") || target.includes("refundId"))) ||
        error.message.includes("eventId") ||
        error.message.includes("refundId");

      if (isTargetMatched) {
        console.info(`[Razorpay Webhook] Duplicate concurrency collision safely resolved for event`);
        return NextResponse.json(
          { status: "already_processed", message: "Concurrent duplicate event safely acknowledged" },
          { status: 200 }
        );
      }
    }

    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error." },
      { status: 500 }
    );
  }
}
