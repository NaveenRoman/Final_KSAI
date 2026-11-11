import { db } from "@/lib/db";
import { getStudentCourseProgress } from "@/lib/subscription-service";
import { resolveSubjectLabel } from "@/lib/subscription-config";
import {
  SubscriptionItem,
  SummaryStats,
} from "@/components/admin/SubscriptionManagementClient";

export interface GetSubscriptionsAdminOptions {
  search?: string;
  plan?: string;
  status?: string;
  timeframe?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminSubscriptionsDataResult {
  subscriptions: SubscriptionItem[];
  summaryStats: SummaryStats;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAdminSubscriptionsData(
  options: GetSubscriptionsAdminOptions = {}
): Promise<AdminSubscriptionsDataResult> {
  const {
    search = "",
    plan = "ALL",
    status = "ALL",
    timeframe = "all",
    page = 1,
    pageSize = 20,
  } = options;

  const now = new Date();

  // 1. Compute timeframe boundary
  let dateFilter: Date | undefined;
  if (timeframe === "today") {
    dateFilter = new Date();
    dateFilter.setHours(0, 0, 0, 0);
  } else if (timeframe === "7d") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "3m") {
    dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "1y") {
    dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  }

  // 2. Fetch all subscriptions with relations
  const allSubs = await db.subscription.findMany({
    where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Collect linked payment orders for metadata
  const orderIds = allSubs.map((s) => s.orderId).filter(Boolean) as string[];
  const paymentIds = allSubs.map((s) => s.paymentId).filter(Boolean) as string[];

  const paymentOrders = await db.paymentOrder.findMany({
    where: {
      OR: [
        ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
        ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : []),
      ],
    },
  });

  const orderMap = new Map<string, typeof paymentOrders[0]>();
  paymentOrders.forEach((po) => {
    if (po.orderId) orderMap.set(po.orderId, po);
    if (po.paymentId) orderMap.set(po.paymentId, po);
  });

  // 4. Group subscriptions by userId for renewal history
  const userSubsMap = new Map<string, typeof allSubs>();
  allSubs.forEach((s) => {
    const list = userSubsMap.get(s.userId) || [];
    list.push(s);
    userSubsMap.set(s.userId, list);
  });

  // 5. Pre-fetch courses for subject label mapping
  const allCourses = await db.course.findMany({
    select: { id: true, title: true, language: true },
  });
  const courseIdMap = new Map(allCourses.map((c) => [c.id, c]));

  // 6. Enrich each subscription record
  const enrichedList: SubscriptionItem[] = await Promise.all(
    allSubs.map(async (sub) => {
      const po =
        (sub.orderId ? orderMap.get(sub.orderId) : null) ||
        (sub.paymentId ? orderMap.get(sub.paymentId) : null);

      let metadata: any = {};
      if (po?.metadata) {
        try {
          metadata = JSON.parse(po.metadata);
        } catch {}
      }

      // Determine effective live status
      const isPastEnd = new Date(sub.endDate) < now;
      let computedStatus: "ACTIVE" | "EXPIRED" | "UPGRADED" | "CANCELLED" = "ACTIVE";
      if (sub.status === "CANCELLED") {
        computedStatus = "CANCELLED";
      } else if (sub.status === "UPGRADED") {
        computedStatus = "UPGRADED";
      } else if (isPastEnd || sub.status === "EXPIRED") {
        computedStatus = "EXPIRED";
      }

      const msRemaining = new Date(sub.endDate).getTime() - now.getTime();
      const daysRemaining =
        computedStatus === "ACTIVE"
          ? Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
          : 0;

      // Resolve purchased subjects/courses
      let subjects: string[] = [];
      let courseTitles: string[] = [];

      if (Array.isArray(metadata.courseIds) && metadata.courseIds.length > 0) {
        metadata.courseIds.forEach((cid: string) => {
          const match = courseIdMap.get(cid);
          if (match) {
            courseTitles.push(match.title);
            subjects.push(resolveSubjectLabel(match.language));
          }
        });
      } else if (metadata.subject) {
        subjects.push(resolveSubjectLabel(metadata.subject));
      } else if (sub.plan === "PRO" || sub.durationMonths === 4) {
        subjects = ["Python", "Java", "C", "C++"];
      } else {
        subjects = ["Python"];
      }

      subjects = Array.from(new Set(subjects));

      // Course completion progress
      const courseProgress = await getStudentCourseProgress(sub.userId, metadata.courseIds).catch(() => ({
        overallPercentage: 0,
        completedChaptersCount: 0,
        totalChaptersCount: 0,
        courses: [],
      }));

      // Renewal history: other subscriptions belonging to the same student
      const siblingSubs = (userSubsMap.get(sub.userId) || []).filter((s) => s.id !== sub.id);
      const renewalHistory = siblingSubs.map((sib) => {
        const sibPo =
          (sib.orderId ? orderMap.get(sib.orderId) : null) ||
          (sib.paymentId ? orderMap.get(sib.paymentId) : null);
        return {
          subscriptionId: sib.id,
          plan: sib.plan,
          status: sib.status,
          durationMonths: sib.durationMonths,
          startDate: sib.startDate,
          endDate: sib.endDate,
          totalAmount: sib.totalAmount,
          paymentId: sib.paymentId,
          orderId: sib.orderId,
          receipt: sibPo?.receipt || null,
        };
      });

      // Upgrade history
      const upgradeHistory = metadata.isUpgrade
        ? {
            isUpgrade: true,
            previousSubscriptionId: metadata.previousSubscriptionId,
            unusedCreditApplied: metadata.unusedCredit || 0,
            originalBasicTotal: metadata.originalBasicTotal,
            explanation: metadata.upgradeExplanation,
          }
        : null;

      return {
        id: sub.id,
        userId: sub.userId,
        studentName: sub.user?.name || "Student",
        studentEmail: sub.user?.email || "No email",
        studentRole: sub.user?.role || "STUDENT",
        studentJoinedAt: sub.user?.createdAt || sub.createdAt,
        plan: sub.plan as "BASIC" | "PRO",
        durationMonths: sub.durationMonths,
        billingInterval: sub.billingInterval,
        status: computedStatus,
        originalDbStatus: sub.status,
        baseAmount: sub.baseAmount,
        gstAmount: sub.gstAmount,
        feeAmount: sub.feeAmount,
        totalAmount: sub.totalAmount,
        currency: sub.currency,
        paymentId: sub.paymentId,
        orderId: sub.orderId,
        receipt: po?.receipt || null,
        paymentStatus: po?.status || (sub.paymentId ? "PAID" : "CREATED"),
        purchaseDate: sub.createdAt,
        startDate: sub.startDate,
        endDate: sub.endDate,
        daysRemaining,
        subjects,
        courseTitles,
        courseProgress,
        renewalHistory,
        upgradeHistory,
        isLivePayment: Boolean(sub.paymentId && sub.paymentId.startsWith("pay_")),
      };
    })
  );

  // 7. Summary metrics before filtering
  const totalCount = enrichedList.length;
  const activeCount = enrichedList.filter((s) => s.status === "ACTIVE").length;
  const expiredCount = enrichedList.filter((s) => s.status === "EXPIRED").length;
  const proCount = enrichedList.filter((s) => s.plan === "PRO").length;
  const basicCount = enrichedList.filter((s) => s.plan === "BASIC").length;
  const totalRevenue = enrichedList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  // 8. Apply client filters
  let filtered = enrichedList;

  if (plan !== "ALL") {
    filtered = filtered.filter((s) => s.plan === plan.toUpperCase());
  }

  if (status !== "ALL") {
    filtered = filtered.filter((s) => s.status === status.toUpperCase());
  }

  const cleanSearch = search.trim().toLowerCase();
  if (cleanSearch) {
    filtered = filtered.filter((s) => {
      const nameMatch = s.studentName.toLowerCase().includes(cleanSearch);
      const emailMatch = s.studentEmail.toLowerCase().includes(cleanSearch);
      const idMatch = s.userId.toLowerCase().includes(cleanSearch);
      const orderMatch = (s.orderId || "").toLowerCase().includes(cleanSearch);
      const payMatch = (s.paymentId || "").toLowerCase().includes(cleanSearch);
      const subjectMatch = s.subjects.some((sub) => sub.toLowerCase().includes(cleanSearch));
      return nameMatch || emailMatch || idMatch || orderMatch || payMatch || subjectMatch;
    });
  }

  // 9. Paginate
  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    subscriptions: paginated,
    summaryStats: {
      totalSubscriptions: totalCount,
      activeSubscriptions: activeCount,
      expiredSubscriptions: expiredCount,
      proCount,
      basicCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      formattedTotalRevenue: `₹${totalRevenue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
    totalCount: totalFiltered,
    page,
    pageSize,
    totalPages,
  };
}
