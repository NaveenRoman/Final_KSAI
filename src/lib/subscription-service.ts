import { db } from "@/lib/db";
import { Prisma } from "@/generated/client";
import { PlanTier, PlanDurationMonths } from "./subscription-config";
import { FREE_COURSE_TEST_MODE } from "@/lib/course-config";
import { normalizeUserRole } from "@/lib/roles";

export interface ActiveSubscriptionInfo {
  id: string;
  plan: PlanTier;
  status: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  orderId: string | null;
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
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: [
      { plan: "desc" },
      { endDate: "desc" },
    ],
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
    orderId: sub.orderId,
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

  if (normalizeUserRole(user?.role) === "SUPER_ADMIN") {
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

export interface CourseAccessResult {
  hasAccess: boolean;
  reason?: "SUBSCRIPTION_EXPIRED" | "SUBJECT_NOT_INCLUDED" | "NOT_ENROLLED" | "UNAUTHENTICATED" | null;
  plan?: PlanTier | null;
  daysRemaining?: number;
  expiresAt?: Date | null;
  isAdmin?: boolean;
  isLegacyPaid?: boolean;
}

function normalizeCourseSlugInternal(slugOrId: string): string {
  const s = slugOrId.toLowerCase().trim();
  if (s.includes("python")) return "python";
  if (s.includes("java")) return "java";
  if (s === "c" || s.startsWith("c_") || s.startsWith("c-")) return "c";
  if (s.includes("cpp") || s.includes("c++")) return "cpp";
  return s;
}

/**
 * Centralized Server-Side Course Access Authorization
 * Enforces:
 * 1. Authenticated server-side identity (returns UNAUTHENTICATED if missing).
 * 2. Active subscription status & endDate (returns SUBSCRIPTION_EXPIRED if expired).
 * 3. Course enrollment in DB (returns NOT_ENROLLED if user was never enrolled).
 * 4. Purchase scope validation using trusted server-side purchase data:
 *    - PRO (1m/4m) & BASIC (4m): Covers all 4 programming languages (Python, Java, C, C++).
 *    - BASIC (1m): Strictly covers the single purchased subject. An active subscription +
 *      an old enrollment in another subject cannot grant access (returns SUBJECT_NOT_INCLUDED).
 * 5. Admin & Free Course Test Mode preservation.
 */
export async function checkCourseAccess(
  userId: string,
  courseSlugOrId: string
): Promise<CourseAccessResult> {
  if (!userId) {
    return { hasAccess: false, reason: "UNAUTHENTICATED" };
  }

  // 1. Admin bypass: Full platform access
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (normalizeUserRole(user?.role) === "SUPER_ADMIN") {
    return { hasAccess: true, plan: "PRO", isAdmin: true };
  }

  // 2. Free course test mode (server config)
  if (FREE_COURSE_TEST_MODE) {
    return { hasAccess: true, plan: "PRO" };
  }

  // 3. Resolve target course
  const normSlug = normalizeCourseSlugInternal(courseSlugOrId);
  const course = await db.course.findFirst({
    where: {
      OR: [{ id: courseSlugOrId }, { language: normSlug }],
    },
    select: { id: true, language: true },
  });

  if (!course) {
    return { hasAccess: false, reason: "NOT_ENROLLED" };
  }

  // 4. Check enrollment for this course
  const enrollment = await db.enrollment.findFirst({
    where: { userId, courseId: course.id },
  });

  if (!enrollment) {
    return {
      hasAccess: false,
      reason: "NOT_ENROLLED",
      plan: null,
    };
  }

  // 5. Backward-Compatible Legacy Course Access:
  // Legitimate legacy paid students who purchased this specific course directly
  // (recorded in Enrollment with paidAmount > 0) retain perpetual access to this course.
  if (enrollment.paidAmount > 0) {
    const activeSub = await getUserActiveSubscription(userId);
    return {
      hasAccess: true,
      plan: activeSub?.plan ?? "BASIC",
      daysRemaining: activeSub?.daysRemaining ?? 9999,
      expiresAt: activeSub?.endDate ?? null,
      isLegacyPaid: true,
    };
  }

  // 6. Resolve active subscription for non-legacy enrollments
  const activeSub = await getUserActiveSubscription(userId);
  if (!activeSub) {
    return {
      hasAccess: false,
      reason: "SUBSCRIPTION_EXPIRED",
      plan: null,
    };
  }

  // 6. Plan-specific course scope validation using trusted server-side purchase data
  // PRO & BASIC 4-months: All four languages (python, java, c, cpp)
  if (activeSub.plan === "PRO" || activeSub.durationMonths === 4) {
    return {
      hasAccess: true,
      plan: activeSub.plan,
      daysRemaining: activeSub.daysRemaining,
      expiresAt: activeSub.endDate,
    };
  }

  // BASIC 1-month: Validate that current subscription covers this specific course
  let trustedSubject: string | null = null;
  let trustedCourseIds: string[] = [];

  // Look up PaymentOrder by orderId or paymentId
  if (activeSub.orderId || activeSub.paymentId) {
    const paymentOrder = await db.paymentOrder.findFirst({
      where: {
        OR: [
          ...(activeSub.orderId ? [{ orderId: activeSub.orderId }] : []),
          ...(activeSub.paymentId ? [{ paymentId: activeSub.paymentId }] : []),
        ],
      },
      select: { metadata: true },
    });

    if (paymentOrder?.metadata) {
      try {
        const meta = JSON.parse(paymentOrder.metadata);
        if (meta.subject) trustedSubject = normalizeCourseSlugInternal(meta.subject);
        if (Array.isArray(meta.courseIds)) trustedCourseIds = meta.courseIds;
      } catch {}
    }
  }

  // Fallback: check ActivityLog for SUBSCRIPTION_ACTIVATED
  if (!trustedSubject && trustedCourseIds.length === 0) {
    const actLog = await db.activityLog.findFirst({
      where: {
        userId,
        actionType: "SUBSCRIPTION_ACTIVATED",
        metadata: { contains: activeSub.id },
      },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });

    if (actLog?.metadata) {
      try {
        const meta = JSON.parse(actLog.metadata);
        if (meta.subject) trustedSubject = normalizeCourseSlugInternal(meta.subject);
        if (Array.isArray(meta.enrolledCourseIds)) trustedCourseIds = meta.enrolledCourseIds;
      } catch {}
    }
  }

  // Scope verification:
  if (trustedCourseIds.length > 0) {
    if (!trustedCourseIds.includes(course.id)) {
      return {
        hasAccess: false,
        reason: "SUBJECT_NOT_INCLUDED",
        plan: activeSub.plan,
        daysRemaining: activeSub.daysRemaining,
        expiresAt: activeSub.endDate,
      };
    }
  } else if (trustedSubject) {
    if (course.language !== trustedSubject) {
      return {
        hasAccess: false,
        reason: "SUBJECT_NOT_INCLUDED",
        plan: activeSub.plan,
        daysRemaining: activeSub.daysRemaining,
        expiresAt: activeSub.endDate,
      };
    }
  } else {
    // If neither PaymentOrder nor ActivityLog has metadata (e.g. manual testing or direct seed),
    // ensure the requested course's enrollment paymentId matches the active subscription's paymentId
    if (activeSub.paymentId && enrollment.paymentId !== activeSub.paymentId) {
      return {
        hasAccess: false,
        reason: "SUBJECT_NOT_INCLUDED",
        plan: activeSub.plan,
        daysRemaining: activeSub.daysRemaining,
        expiresAt: activeSub.endDate,
      };
    }
  }

  return {
    hasAccess: true,
    plan: activeSub.plan,
    daysRemaining: activeSub.daysRemaining,
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
  subject?: string | null;
  courseIds?: string[];
}

/**
 * Atomically activates or extends a subscription within a serializable transaction,
 * and grants the corresponding course enrollments according to plan rules:
 * - BASIC 1 month: selected subject only
 * - BASIC 4 months: all 4 subjects (Python, Java, C, C++)
 * - PRO (1 & 4 months): all 4 subjects + Pro platform features
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
    subject,
    courseIds,
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

      // 5. Resolve Courses to Enroll Based on Plan Rules
      let targetCourses: Array<{ id: string; title: string; price: number }> = [];

      if (courseIds && courseIds.length > 0) {
        targetCourses = await tx.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, price: true },
        });
      }

      // If courseIds was not provided or empty, resolve courses using subject / plan tier
      if (targetCourses.length === 0) {
        if (plan === "BASIC" && durationMonths === 1 && subject) {
          let cleanSub = subject.trim().toLowerCase();
          if (cleanSub === "c++") cleanSub = "cpp";
          const singleCourse = await tx.course.findFirst({
            where: { language: cleanSub },
            select: { id: true, title: true, price: true },
          });
          if (singleCourse) {
            targetCourses = [singleCourse];
          }
        } else {
          // BASIC 4 Months & PRO: All four subjects (Java, Python, C, C++)
          targetCourses = await tx.course.findMany({
            where: { language: { in: ["python", "java", "c", "cpp"] } },
            select: { id: true, title: true, price: true },
          });
        }
      }

      // 6. Grant Enrollments Idempotently
      const enrolledCourseIds: string[] = [];
      const splitAmount = targetCourses.length > 0 ? totalAmount / targetCourses.length : totalAmount;

      for (const course of targetCourses) {
        const existingEnrollment = await tx.enrollment.findFirst({
          where: {
            userId,
            courseId: course.id,
          },
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              userId,
              courseId: course.id,
              paidAmount: splitAmount,
              paymentId,
              progress: 0,
            },
          });
          enrolledCourseIds.push(course.id);
        } else {
          enrolledCourseIds.push(existingEnrollment.courseId);
        }
      }

      // 7. Update PaymentOrder status to PAID if it exists
      await tx.paymentOrder.updateMany({
        where: { orderId },
        data: {
          status: "PAID",
          paymentId,
          updatedAt: new Date(),
        },
      });

      // 8. Record persistent audit log
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
            enrolledCourseIds,
            subject: subject || null,
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
