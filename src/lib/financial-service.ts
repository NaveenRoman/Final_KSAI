import { db } from "@/lib/db";

export type TransactionProvenance = "LIVE" | "TEST" | "UNKNOWN";

export interface FinancialOverview {
  // Baseline legacy properties (preserved for backward compatibility)
  grossCollections: number;
  formattedGrossCollections: string;
  netRevenue: number; // Gross - GST - Recorded Gateway Fees - Processed Refunds
  formattedNetRevenue: string;
  netReceipts: number; // Gross - Recorded Gateway Fees - Processed Refunds (Total Cash Flow)
  formattedNetReceipts: string;
  gstLiability: number;
  formattedGstLiability: string;
  recordedGatewayFees: number;
  formattedGatewayFees: string;
  totalRefunds: number;
  formattedTotalRefunds: string;
  refundsCount: number;
  paidTransactionsCount: number;
  failedOrdersCount: number;
  pendingOrdersCount: number;
  legacyPurchasesCount: number;
  subscriptionPurchasesCount: number;
  timeframe: string;
  reconciliationSummary: string;

  // STRICT PROVENANCE-SEGREGATED FINANCIAL METRICS
  liveGrossCollections: number;
  formattedLiveGrossCollections: string;
  testGrossCollections: number;
  formattedTestGrossCollections: string;
  unknownGrossCollections: number;
  formattedUnknownGrossCollections: string;

  netLiveReceipts: number;
  formattedNetLiveReceipts: string;
  testReceipts: number;
  formattedTestReceipts: string;
  unknownReceipts: number;
  formattedUnknownReceipts: string;

  livePaidCount: number;
  testPaidCount: number;
  unknownPaidCount: number;

  hasTestTransactions: boolean;
  hasLiveTransactions: boolean;
  hasUnknownTransactions: boolean;

  lifetimeLiveCollections: number;
  formattedLifetimeLive: string;
  lifetimeTestCollections: number;
  formattedLifetimeTest: string;

  thirtyDayLiveCollections: number;
  formattedThirtyDayLive: string;
  thirtyDayTestCollections: number;
  formattedThirtyDayTest: string;

  provenanceSummary: string;
}

export type TransactionStatus = "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED" | "CREATED";
export type TransactionType = "SUBSCRIPTION" | "LEGACY_ENROLLMENT";

export interface UnifiedTransaction {
  id: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  type: TransactionType;
  itemTitle: string;
  paymentId: string | null;
  orderId: string | null;
  grossAmount: number;
  baseAmount: number;
  gstAmount: number;
  feeAmount: number;
  refundedAmount: number;
  netAmount: number;
  status: TransactionStatus;
  provenance: TransactionProvenance;
}

export interface TransactionFilterOptions {
  timeframe?: "today" | "7d" | "30d" | "3m" | "1y" | "all";
  status?: "ALL" | "PAID" | "REFUNDED" | "FAILED" | "CREATED";
  provenance?: "ALL" | "LIVE" | "TEST" | "UNKNOWN";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTransactionsResult {
  transactions: UnifiedTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function formatInr(amount: number): string {
  if (isNaN(amount)) return "₹0";
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatInrExact(amount: number): string {
  if (isNaN(amount)) return "₹0.00";
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Classifies a transaction's provenance strictly using trusted server-side payment
 * environment indicators, gateway keys, and gateway verification evidence.
 *
 * Rules:
 * - Explicit test indicators (pay_mock, free_test, pay_test, auto_preview, auto_enroll, test metadata) -> "TEST"
 * - If created/captured under Razorpay test mode key (rzp_test_...) -> "TEST"
 * - For "LIVE": requires verified live gateway evidence (rzp_live_ environment AND valid non-mock live payment ID)
 * - Never classify a payment as LIVE solely from its payment ID format.
 * - Records without sufficient evidence -> "UNKNOWN".
 */
export function classifyTransactionProvenance(tx: {
  paymentId: string | null;
  orderId?: string | null;
  metadata?: string | null;
  testMode?: boolean;
  isTest?: boolean;
}): TransactionProvenance {
  if (tx.testMode === true || tx.isTest === true) {
    return "TEST";
  }

  const pid = tx.paymentId?.trim().toLowerCase() || "";

  // 1. Explicit mock / test / preview payment patterns
  if (
    !pid ||
    pid.startsWith("pay_mock_") ||
    pid.startsWith("free_test_") ||
    pid === "pay_test" ||
    pid.startsWith("auto_") ||
    pid.includes("mock") ||
    pid.includes("test")
  ) {
    return "TEST";
  }

  // 2. Metadata inspection for explicit test mode markers
  if (tx.metadata) {
    try {
      const meta = JSON.parse(tx.metadata);
      if (meta.testMode === true || meta.mode === "test" || meta.isTest === true) {
        return "TEST";
      }
    } catch {}
  }

  // 3. Server gateway key verification
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const isKeyLive = keyId.startsWith("rzp_live_");
  const isKeyTest = keyId.startsWith("rzp_test_");

  // Valid live payment ID format from Razorpay: starts with 'pay_' followed by alphanumeric characters, typically 14 chars
  const isStandardRzpFormat = /^pay_[a-z0-9]{10,}$/i.test(pid);

  // If environment is strictly test, any real-looking payment captured in this environment is TEST
  if (isKeyTest) {
    return "TEST";
  }

  // Strict check for LIVE: Must be in a confirmed live gateway environment with standard provider format
  if (isKeyLive && isStandardRzpFormat) {
    return "LIVE";
  }

  // If ambiguous or insufficient evidence, return UNKNOWN
  return "UNKNOWN";
}

/**
 * Computes a unified financial overview across all payment channels.
 * Strictly guarantees:
 * - Each captured payment is counted exactly once.
 * - Active subscriptions are treated as entitlements, not separate payments.
 * - Reconciles PaymentOrder and Subscription by paymentId and orderId.
 * - Segregates LIVE vs. TEST vs. UNKNOWN financial streams.
 * - Never infers historical GST on legacy purchases (₹0.00).
 * - Never estimates gateway fees (only actual recorded fees are included).
 * - Processed refunds are subtracted from net receipts and revenue.
 */
export async function getFinancialOverview(
  timeframe: "today" | "7d" | "30d" | "3m" | "1y" | "all" = "all"
): Promise<FinancialOverview> {
  const now = new Date();
  let startDate: Date | null = null;

  if (timeframe === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === "7d") {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "3m") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else if (timeframe === "1y") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Fetch all raw financial records concurrently
  const [paymentOrders, subscriptions, enrollments, refunds] = await Promise.all([
    db.paymentOrder.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.enrollment.findMany({
      where: { paidAmount: { gt: 0 } },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, language: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.paymentRefund.findMany({
      where: { status: "PROCESSED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 2. Build refund map by paymentId and classify refunds by provenance
  const refundsByPaymentId: Record<string, number> = {};
  let totalProcessedRefunds = 0;
  let totalRefundsCount = 0;
  let liveRefunds = 0;
  let testRefunds = 0;
  let unknownRefunds = 0;

  for (const ref of refunds) {
    if (startDate && new Date(ref.createdAt) < startDate) continue;
    const pid = ref.paymentId?.trim();
    if (pid) {
      refundsByPaymentId[pid] = (refundsByPaymentId[pid] || 0) + ref.amount;
    }
    totalProcessedRefunds += ref.amount;
    totalRefundsCount += 1;

    const refProv = classifyTransactionProvenance({ paymentId: pid || null, orderId: ref.orderId });
    if (refProv === "LIVE") liveRefunds += ref.amount;
    else if (refProv === "TEST") testRefunds += ref.amount;
    else unknownRefunds += ref.amount;
  }

  // 3. Reconcile Modern PaymentOrder & Subscription Payments
  const accountedPaymentIds = new Set<string>();
  const accountedOrderIds = new Set<string>();

  let grossCollections = 0;
  let totalGstLiability = 0;
  let totalGatewayFees = 0;
  let paidTransactionsCount = 0;
  let failedOrdersCount = 0;
  let pendingOrdersCount = 0;
  let legacyPurchasesCount = 0;
  let subscriptionPurchasesCount = 0;

  // Provenance-segregated accumulators for active timeframe
  let liveGrossCollections = 0;
  let testGrossCollections = 0;
  let unknownGrossCollections = 0;

  let livePaidCount = 0;
  let testPaidCount = 0;
  let unknownPaidCount = 0;

  let liveGatewayFees = 0;
  let testGatewayFees = 0;
  let unknownGatewayFees = 0;

  // Lifetime and 30-day metrics across entire database
  let lifetimeLiveCollections = 0;
  let lifetimeTestCollections = 0;
  let thirtyDayLiveCollections = 0;
  let thirtyDayTestCollections = 0;

  for (const order of paymentOrders) {
    const isWithinTimeframe = !startDate || new Date(order.createdAt) >= startDate;
    const orderCreatedAt = new Date(order.createdAt);
    const pid = order.paymentId?.trim() || null;
    const oid = order.orderId?.trim() || null;
    const prov = classifyTransactionProvenance({ paymentId: pid, orderId: oid, metadata: order.metadata });

    if (order.status === "PAID" || order.status === "PARTIALLY_REFUNDED" || order.status === "REFUNDED") {
      // Lifetime / 30-day tracking
      if (prov === "LIVE") {
        lifetimeLiveCollections += order.totalAmount;
        if (orderCreatedAt >= thirtyDaysAgo) thirtyDayLiveCollections += order.totalAmount;
      } else if (prov === "TEST") {
        lifetimeTestCollections += order.totalAmount;
        if (orderCreatedAt >= thirtyDaysAgo) thirtyDayTestCollections += order.totalAmount;
      }

      if (isWithinTimeframe) {
        grossCollections += order.totalAmount;
        totalGstLiability += order.gstAmount;
        totalGatewayFees += order.feeAmount || 0;
        paidTransactionsCount += 1;
        subscriptionPurchasesCount += 1;

        if (prov === "LIVE") {
          liveGrossCollections += order.totalAmount;
          livePaidCount += 1;
          liveGatewayFees += order.feeAmount || 0;
        } else if (prov === "TEST") {
          testGrossCollections += order.totalAmount;
          testPaidCount += 1;
          testGatewayFees += order.feeAmount || 0;
        } else {
          unknownGrossCollections += order.totalAmount;
          unknownPaidCount += 1;
          unknownGatewayFees += order.feeAmount || 0;
        }
      }
      if (order.paymentId) accountedPaymentIds.add(order.paymentId.trim());
      if (order.orderId) accountedOrderIds.add(order.orderId.trim());
    } else if (order.status === "FAILED") {
      if (isWithinTimeframe) failedOrdersCount += 1;
      if (order.orderId) accountedOrderIds.add(order.orderId.trim());
    } else if (order.status === "CREATED") {
      if (isWithinTimeframe) pendingOrdersCount += 1;
      if (order.orderId) accountedOrderIds.add(order.orderId.trim());
    }
  }

  // 4. Reconcile Subscriptions created directly without matching PaymentOrder
  for (const sub of subscriptions) {
    const pid = sub.paymentId?.trim() || null;
    const oid = sub.orderId?.trim() || null;

    const alreadyAccounted =
      (pid && accountedPaymentIds.has(pid)) ||
      (oid && accountedOrderIds.has(oid));

    if (!alreadyAccounted && sub.status === "ACTIVE" && sub.totalAmount > 0) {
      const isWithinTimeframe = !startDate || new Date(sub.createdAt) >= startDate;
      const subCreatedAt = new Date(sub.createdAt);
      const prov = classifyTransactionProvenance({ paymentId: pid, orderId: oid });

      if (prov === "LIVE") {
        lifetimeLiveCollections += sub.totalAmount;
        if (subCreatedAt >= thirtyDaysAgo) thirtyDayLiveCollections += sub.totalAmount;
      } else if (prov === "TEST") {
        lifetimeTestCollections += sub.totalAmount;
        if (subCreatedAt >= thirtyDaysAgo) thirtyDayTestCollections += sub.totalAmount;
      }

      if (isWithinTimeframe) {
        grossCollections += sub.totalAmount;
        totalGstLiability += sub.gstAmount || 0;
        totalGatewayFees += sub.feeAmount || 0;
        paidTransactionsCount += 1;
        subscriptionPurchasesCount += 1;

        if (prov === "LIVE") {
          liveGrossCollections += sub.totalAmount;
          livePaidCount += 1;
          liveGatewayFees += sub.feeAmount || 0;
        } else if (prov === "TEST") {
          testGrossCollections += sub.totalAmount;
          testPaidCount += 1;
          testGatewayFees += sub.feeAmount || 0;
        } else {
          unknownGrossCollections += sub.totalAmount;
          unknownPaidCount += 1;
          unknownGatewayFees += sub.feeAmount || 0;
        }
      }
      if (pid) accountedPaymentIds.add(pid);
      if (oid) accountedOrderIds.add(oid);
    }
  }

  // 5. Reconcile Legacy Direct Course Purchases from Enrollment table
  const seenLegacyPaymentIds = new Set<string>();

  for (const enr of enrollments) {
    const pid = enr.paymentId?.trim();
    if (!pid) continue;

    // If paymentId was already counted under a Subscription, skip (it's an access grant, not a separate purchase)
    if (accountedPaymentIds.has(pid)) continue;

    // De-duplicate multiple enrollments sharing the same paymentId
    if (seenLegacyPaymentIds.has(pid)) continue;
    seenLegacyPaymentIds.add(pid);

    const isWithinTimeframe = !startDate || new Date(enr.createdAt) >= startDate;
    const enrCreatedAt = new Date(enr.createdAt);
    const prov = classifyTransactionProvenance({ paymentId: pid });

    if (prov === "LIVE") {
      lifetimeLiveCollections += enr.paidAmount;
      if (enrCreatedAt >= thirtyDaysAgo) thirtyDayLiveCollections += enr.paidAmount;
    } else if (prov === "TEST") {
      lifetimeTestCollections += enr.paidAmount;
      if (enrCreatedAt >= thirtyDaysAgo) thirtyDayTestCollections += enr.paidAmount;
    }

    if (isWithinTimeframe) {
      grossCollections += enr.paidAmount;
      paidTransactionsCount += 1;
      legacyPurchasesCount += 1;

      if (prov === "LIVE") {
        liveGrossCollections += enr.paidAmount;
        livePaidCount += 1;
      } else if (prov === "TEST") {
        testGrossCollections += enr.paidAmount;
        testPaidCount += 1;
      } else {
        unknownGrossCollections += enr.paidAmount;
        unknownPaidCount += 1;
      }
    }
  }

  // 6. Net Computations (Segregated Live vs. Test vs. Unknown)
  const netLiveReceipts = Math.max(0, liveGrossCollections - liveRefunds - liveGatewayFees);
  const testReceipts = Math.max(0, testGrossCollections - testRefunds - testGatewayFees);
  const unknownReceipts = Math.max(0, unknownGrossCollections - unknownRefunds - unknownGatewayFees);

  const netReceipts = Math.max(0, grossCollections - totalProcessedRefunds - totalGatewayFees);
  const netRevenue = Math.max(0, grossCollections - totalGstLiability - totalProcessedRefunds - totalGatewayFees);

  const hasTestTransactions = testGrossCollections > 0 || testPaidCount > 0;
  const hasLiveTransactions = liveGrossCollections > 0 || livePaidCount > 0;
  const hasUnknownTransactions = unknownGrossCollections > 0 || unknownPaidCount > 0;

  const provenanceSummary = `${livePaidCount} Live (${formatInrExact(liveGrossCollections)}) · ${testPaidCount} Test/Sandbox (${formatInrExact(testGrossCollections)}) · ${unknownPaidCount} Unknown`;
  const summary = `${paidTransactionsCount} captured payments (${subscriptionPurchasesCount} subscriptions + ${legacyPurchasesCount} legacy direct purchases) · ${totalRefundsCount} refunds · ${failedOrdersCount} failed attempts · ${provenanceSummary}`;

  return {
    grossCollections,
    formattedGrossCollections: formatInr(grossCollections),
    netRevenue,
    formattedNetRevenue: formatInr(netRevenue),
    netReceipts,
    formattedNetReceipts: formatInr(netReceipts),
    gstLiability: totalGstLiability,
    formattedGstLiability: formatInrExact(totalGstLiability),
    recordedGatewayFees: totalGatewayFees,
    formattedGatewayFees: formatInrExact(totalGatewayFees),
    totalRefunds: totalProcessedRefunds,
    formattedTotalRefunds: formatInr(totalProcessedRefunds),
    refundsCount: totalRefundsCount,
    paidTransactionsCount,
    failedOrdersCount,
    pendingOrdersCount,
    legacyPurchasesCount,
    subscriptionPurchasesCount,
    timeframe,
    reconciliationSummary: summary,

    // STRICT PROVENANCE-SEGREGATED PROPERTIES
    liveGrossCollections,
    formattedLiveGrossCollections: formatInr(liveGrossCollections),
    testGrossCollections,
    formattedTestGrossCollections: formatInr(testGrossCollections),
    unknownGrossCollections,
    formattedUnknownGrossCollections: formatInr(unknownGrossCollections),

    netLiveReceipts,
    formattedNetLiveReceipts: formatInr(netLiveReceipts),
    testReceipts,
    formattedTestReceipts: formatInr(testReceipts),
    unknownReceipts,
    formattedUnknownReceipts: formatInr(unknownReceipts),

    livePaidCount,
    testPaidCount,
    unknownPaidCount,

    hasTestTransactions,
    hasLiveTransactions,
    hasUnknownTransactions,

    lifetimeLiveCollections,
    formattedLifetimeLive: formatInr(lifetimeLiveCollections),
    lifetimeTestCollections,
    formattedLifetimeTest: formatInr(lifetimeTestCollections),

    thirtyDayLiveCollections,
    formattedThirtyDayLive: formatInr(thirtyDayLiveCollections),
    thirtyDayTestCollections,
    formattedThirtyDayTest: formatInr(thirtyDayTestCollections),

    provenanceSummary,
  };
}

/**
 * Returns a unified, reconciled transaction ledger with search, filtering, and pagination.
 */
export async function getReconciledTransactions(
  options: TransactionFilterOptions = {}
): Promise<PaginatedTransactionsResult> {
  const {
    timeframe = "all",
    status = "ALL",
    provenance = "ALL",
    search = "",
    page = 1,
    pageSize = 20,
  } = options;

  const now = new Date();
  let startDate: Date | null = null;

  if (timeframe === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === "7d") {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "3m") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else if (timeframe === "1y") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const [paymentOrders, subscriptions, enrollments, refunds] = await Promise.all([
    db.paymentOrder.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.enrollment.findMany({
      where: { paidAmount: { gt: 0 } },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, language: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.paymentRefund.findMany({
      where: { status: "PROCESSED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const refundsByPaymentId: Record<string, number> = {};
  for (const ref of refunds) {
    const pid = ref.paymentId?.trim();
    if (pid) {
      refundsByPaymentId[pid] = (refundsByPaymentId[pid] || 0) + ref.amount;
    }
  }

  const transactions: UnifiedTransaction[] = [];
  const accountedPaymentIds = new Set<string>();
  const accountedOrderIds = new Set<string>();

  // 1. Process PaymentOrders
  for (const order of paymentOrders) {
    const pid = order.paymentId?.trim() || null;
    const oid = order.orderId?.trim();
    if (pid) accountedPaymentIds.add(pid);
    if (oid) accountedOrderIds.add(oid);

    const recordedRefund = pid ? refundsByPaymentId[pid] || 0 : 0;
    const refundedAmount = Math.max(recordedRefund, order.amountRefunded || 0);

    let computedStatus: TransactionStatus = "CREATED";
    if (order.status === "PAID" || order.status === "PARTIALLY_REFUNDED" || order.status === "REFUNDED") {
      if ((refundedAmount >= order.totalAmount && order.totalAmount > 0) || order.status === "REFUNDED") {
        computedStatus = "REFUNDED";
      } else if (refundedAmount > 0 || order.status === "PARTIALLY_REFUNDED") {
        computedStatus = "PARTIALLY_REFUNDED";
      } else {
        computedStatus = "PAID";
      }
    } else if (order.status === "FAILED") {
      computedStatus = "FAILED";
    }

    const gross = computedStatus === "PAID" || computedStatus === "REFUNDED" || computedStatus === "PARTIALLY_REFUNDED"
      ? order.totalAmount
      : 0;
    const fee = order.feeAmount || 0;
    const net = Math.round(Math.max(0, gross - fee - refundedAmount) * 100) / 100;
    const prov = classifyTransactionProvenance({ paymentId: pid, orderId: oid, metadata: order.metadata });

    transactions.push({
      id: order.id,
      date: order.createdAt,
      customerName: order.user?.name || "Customer",
      customerEmail: order.user?.email || "Unknown",
      type: "SUBSCRIPTION",
      itemTitle: `${order.plan} Plan (${order.durationMonths} ${order.durationMonths === 1 ? "Month" : "Months"})`,
      paymentId: pid,
      orderId: oid,
      grossAmount: gross,
      baseAmount: order.baseAmount,
      gstAmount: order.gstAmount,
      feeAmount: fee,
      refundedAmount,
      netAmount: net,
      status: computedStatus,
      provenance: prov,
    });
  }

  // 2. Process Standalone Subscriptions (if any)
  for (const sub of subscriptions) {
    const pid = sub.paymentId?.trim() || null;
    const oid = sub.orderId?.trim() || null;

    if ((pid && accountedPaymentIds.has(pid)) || (oid && accountedOrderIds.has(oid))) {
      continue; // Skip already represented payment
    }
    if (pid) accountedPaymentIds.add(pid);
    if (oid) accountedOrderIds.add(oid);

    const refundedAmount = pid ? refundsByPaymentId[pid] || 0 : 0;
    let computedStatus: TransactionStatus = "PAID";
    if (refundedAmount >= sub.totalAmount && sub.totalAmount > 0) {
      computedStatus = "REFUNDED";
    } else if (refundedAmount > 0) {
      computedStatus = "PARTIALLY_REFUNDED";
    }

    const gross = sub.totalAmount;
    const fee = sub.feeAmount || 0;
    const net = Math.round(Math.max(0, gross - fee - refundedAmount) * 100) / 100;
    const prov = classifyTransactionProvenance({ paymentId: pid, orderId: oid });

    transactions.push({
      id: sub.id,
      date: sub.createdAt,
      customerName: sub.user?.name || "Customer",
      customerEmail: sub.user?.email || "Unknown",
      type: "SUBSCRIPTION",
      itemTitle: `${sub.plan} Subscription (${sub.durationMonths} ${sub.durationMonths === 1 ? "Month" : "Months"})`,
      paymentId: pid,
      orderId: oid,
      grossAmount: gross,
      baseAmount: sub.baseAmount,
      gstAmount: sub.gstAmount || 0,
      feeAmount: fee,
      refundedAmount,
      netAmount: net,
      status: computedStatus,
      provenance: prov,
    });
  }

  // 3. Process Legacy Direct Course Purchases
  const seenLegacyPids = new Set<string>();
  for (const enr of enrollments) {
    const pid = enr.paymentId?.trim();
    if (!pid || accountedPaymentIds.has(pid) || seenLegacyPids.has(pid)) {
      continue;
    }
    seenLegacyPids.add(pid);

    const refundedAmount = refundsByPaymentId[pid] || 0;
    let computedStatus: TransactionStatus = "PAID";
    if (refundedAmount >= enr.paidAmount && enr.paidAmount > 0) {
      computedStatus = "REFUNDED";
    } else if (refundedAmount > 0) {
      computedStatus = "PARTIALLY_REFUNDED";
    }

    const gross = enr.paidAmount;
    const net = Math.round(Math.max(0, gross - refundedAmount) * 100) / 100;
    const prov = classifyTransactionProvenance({ paymentId: pid });

    transactions.push({
      id: enr.id,
      date: enr.createdAt,
      customerName: enr.user?.name || "Student",
      customerEmail: enr.user?.email || "Unknown",
      type: "LEGACY_ENROLLMENT",
      itemTitle: enr.course?.title || "Legacy Course Purchase",
      paymentId: pid,
      orderId: null,
      grossAmount: gross,
      baseAmount: gross,
      gstAmount: 0,
      feeAmount: 0,
      refundedAmount,
      netAmount: net,
      status: computedStatus,
      provenance: prov,
    });
  }

  // 4. Sort by Date Descending
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 5. Apply Filters
  const filtered = transactions.filter((tx) => {
    // Timeframe filter
    if (startDate && tx.date < startDate) return false;

    // Status filter
    if (status !== "ALL") {
      if (status === "REFUNDED") {
        if (tx.status !== "REFUNDED" && tx.status !== "PARTIALLY_REFUNDED") return false;
      } else if (tx.status !== status) {
        return false;
      }
    }

    // Provenance filter
    if (provenance && provenance !== "ALL") {
      if (tx.provenance !== provenance) return false;
    }

    // Search query filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = tx.customerName.toLowerCase().includes(q);
      const matchEmail = tx.customerEmail.toLowerCase().includes(q);
      const matchPaymentId = tx.paymentId?.toLowerCase().includes(q) || false;
      const matchOrderId = tx.orderId?.toLowerCase().includes(q) || false;
      const matchItem = tx.itemTitle.toLowerCase().includes(q);
      const matchProvenance = tx.provenance.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPaymentId && !matchOrderId && !matchItem && !matchProvenance) {
        return false;
      }
    }

    return true;
  });

  // 6. Pagination
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    transactions: paginated,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Sanitizes and escapes CSV values to prevent CSV Formula Injection (CWE-1236)
 * while preserving legitimate numeric fields.
 */
export function sanitizeCsvField(val: string | number | null | undefined, isNumeric = false): string {
  if (val === null || val === undefined) return '""';

  if (typeof val === "number") {
    return isNaN(val) ? '"0.00"' : `"${val.toFixed(2)}"`;
  }

  let str = String(val);

  if (isNumeric) {
    const num = Number(str);
    if (!isNaN(num)) {
      return `"${str}"`;
    }
  }

  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  const trimmed = str.trimStart();
  if (trimmed.length > 0 && formulaTriggers.some((char) => trimmed.startsWith(char))) {
    const asNum = Number(trimmed);
    if (isNaN(asNum)) {
      str = `'${str}`;
    }
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an auditable, tax-compliant CSV export from reconciled transactions.
 */
export async function exportTransactionsCsv(
  options: Omit<TransactionFilterOptions, "page" | "pageSize"> = {}
): Promise<string> {
  const result = await getReconciledTransactions({
    ...options,
    page: 1,
    pageSize: 10000, // Export all matching
  });

  const headers = [
    "Date",
    "Customer Name",
    "Customer Email",
    "Transaction Type",
    "Product / Plan",
    "Payment ID",
    "Order ID",
    "Provenance",
    "Gross Amount (INR)",
    "Base Amount (INR)",
    "GST Amount (INR)",
    "Gateway Fee (INR)",
    "Refunded (INR)",
    "Net Amount (INR)",
    "Status",
  ];

  const rows = result.transactions.map((tx) => [
    sanitizeCsvField(tx.date.toISOString(), false),
    sanitizeCsvField(tx.customerName, false),
    sanitizeCsvField(tx.customerEmail, false),
    sanitizeCsvField(tx.type, false),
    sanitizeCsvField(tx.itemTitle, false),
    sanitizeCsvField(tx.paymentId || "N/A", false),
    sanitizeCsvField(tx.orderId || "N/A", false),
    sanitizeCsvField(tx.provenance, false),
    sanitizeCsvField(tx.grossAmount, true),
    sanitizeCsvField(tx.baseAmount, true),
    sanitizeCsvField(tx.gstAmount, true),
    sanitizeCsvField(tx.feeAmount, true),
    sanitizeCsvField(tx.refundedAmount, true),
    sanitizeCsvField(tx.netAmount, true),
    sanitizeCsvField(tx.status, false),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}
