import { db } from "@/lib/db";
import { Prisma } from "@/generated/client";
import { PlanTier, PlanDurationMonths } from "./subscription-config";

export interface ActiveSubscriptionInfo {
  id: string;
  plan: PlanTier;
  status: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  paymentId: string | null;
  totalAmount: number;
}

/**
 * Resolves the currently active subscription for a user.
 * Returns null if no active subscription exists or if expired.
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<ActiveSubscriptionInfo | null> {
  if (!userId) return null;

  const now = new Date();

  const sub = await db.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      endDate: { gte: now },
    },
    orderBy: { endDate: "desc" },
  });

  if (!sub) return null;

  const msRemaining = sub.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    id: sub.id,
    plan: sub.plan as PlanTier,
    status: sub.status,
    durationMonths: sub.durationMonths,
    startDate: sub.startDate,
    endDate: sub.endDate,
    daysRemaining,
    paymentId: sub.paymentId,
    totalAmount: sub.totalAmount,
  };
}

export type FeatureType =
  | "BASIC_FEATURES"
  | "PRO_FEATURES"
  | "INTERVIEW_PREP"
  | "RESUME_BUILDER"
  | "COURSES"
  | "EDITOR"
  | "NOTES"
  | "LIVE_TEACHING";

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: "NO_ACTIVE_SUBSCRIPTION" | "PRO_PLAN_REQUIRED" | "UNAUTHENTICATED" | null;
  plan?: string | null;
  expiresAt?: Date | null;
  isAdmin?: boolean;
}

/**
 * Server-side gatekeeper enforcing Basic/Pro feature permissions.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureType
): Promise<FeatureAccessResult> {
  if (!userId) {
    return { hasAccess: false, reason: "UNAUTHENTICATED" };
  }

  // 1. Admin bypass: Full platform access
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (user?.role === "Admin") {
    return { hasAccess: true, plan: "PRO", isAdmin: true };
  }

  // 2. Resolve active subscription
  const activeSub = await getUserActiveSubscription(userId);

  if (!activeSub) {
    return {
      hasAccess: false,
      reason: "NO_ACTIVE_SUBSCRIPTION",
      plan: null,
    };
  }

  // 3. Pro-only feature gates
  const isProFeature =
    feature === "PRO_FEATURES" ||
    feature === "INTERVIEW_PREP" ||
    feature === "RESUME_BUILDER";

  if (isProFeature) {
    if (activeSub.plan !== "PRO") {
      return {
        hasAccess: false,
        reason: "PRO_PLAN_REQUIRED",
        plan: activeSub.plan,
        expiresAt: activeSub.endDate,
      };
    }
  }

  return {
    hasAccess: true,
    plan: activeSub.plan,
    expiresAt: activeSub.endDate,
  };
}

export interface ActivateSubscriptionParams {
  userId: string;
  plan: PlanTier;
  durationMonths: PlanDurationMonths;
  orderId: string;
  paymentId: string;
  baseAmount: number;
  gstAmount: number;
  feeAmount: number;
  totalAmount: number;
}

/**
 * Atomically activates or extends a subscription within a serializable transaction.
 * Strictly prevents duplicate activation via anti-replay checks.
 */
export async function activateSubscriptionRecord(params: ActivateSubscriptionParams) {
  const {
    userId,
    plan,
    durationMonths,
    orderId,
    paymentId,
    baseAmount,
    gstAmount,
    feeAmount,
    totalAmount,
  } = params;

  return await db.$transaction(
    async (tx) => {
      // 1. Anti-Replay: Check if this paymentId was already used
      const existingSubByPayment = await tx.subscription.findUnique({
        where: { paymentId },
      });

      if (existingSubByPayment) {
        console.warn(`[Subscription] Payment ${paymentId} already activated subscription ${existingSubByPayment.id}`);
        return existingSubByPayment;
      }

      // 2. Lock & serialize user row
      await tx.user.update({
        where: { id: userId },
        data: { updatedAt: new Date() },
      });

      // 3. Calculate start & end dates
      const now = new Date();
      let startDate = now;

      // Check if user currently has an active subscription for the same plan
      const currentActive = await tx.subscription.findFirst({
        where: {
          userId,
          plan,
          status: "ACTIVE",
          endDate: { gte: now },
        },
        orderBy: { endDate: "desc" },
      });

      if (currentActive && currentActive.endDate > now) {
        // Extend seamlessly from current expiration
        startDate = currentActive.endDate;
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      // 4. Create new Subscription record
      const newSubscription = await tx.subscription.create({
        data: {
          userId,
          plan,
          status: "ACTIVE",
          durationMonths,
          startDate,
          endDate,
          orderId,
          paymentId,
          baseAmount,
          gstAmount,
          feeAmount,
          totalAmount,
          currency: "INR",
        },
      });

      // 5. Update PaymentOrder status to PAID if it exists
      await tx.paymentOrder.updateMany({
        where: { orderId },
        data: {
          status: "PAID",
          paymentId,
          updatedAt: new Date(),
        },
      });

      // 6. Record persistent audit log
      await tx.activityLog.create({
        data: {
          userId,
          actionType: "SUBSCRIPTION_ACTIVATED",
          metadata: JSON.stringify({
            subscriptionId: newSubscription.id,
            plan,
            durationMonths,
            totalAmount,
            paymentId,
            orderId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        },
      });

      return newSubscription;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
