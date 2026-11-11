/**
 * Codexa Subscription Plans & Pricing Configuration
 *
 * Single Source of Truth for:
 * - Official Plan Tiers (BASIC, PRO)
 * - Durations (1, 2, 6 months)
 * - Base Pricing & Line-Item Breakdown
 * - Server-side Tax (GST) & Gateway Fee Calculation
 *
 * Client-submitted prices or durations are NEVER trusted.
 */

export type PlanTier = "BASIC" | "PRO";
export type PlanDurationMonths = 1 | 4;

export const AVAILABLE_SUBJECTS = [
  { id: "python", label: "Python", title: "Python Programming & System Design", tag: "AI & Systems" },
  { id: "java", label: "Java", title: "Java Enterprise & Backend Architecture", tag: "Enterprise" },
  { id: "c", label: "C", title: "C Language Mastery & Low-Level Programming", tag: "Core Systems" },
  { id: "cpp", label: "C++", title: "Modern C++ & High-Performance Computing", tag: "Performance" },
] as const;

export type SubjectId = (typeof AVAILABLE_SUBJECTS)[number]["id"];

export interface PlanDurationPricing {
  months: PlanDurationMonths;
  basePrice: number; // in INR (e.g. 50, 150, 70, 200)
  monthlyRate: number; // in INR
  label: string;
  accessDescription: string;
  highlight?: string;
  savingsLabel?: string;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  monthlyRate: number; // in INR
  features: string[];
  durations: Record<PlanDurationMonths, PlanDurationPricing>;
}

export const OFFICIAL_PLANS: Record<PlanTier, PlanDefinition> = {
  BASIC: {
    id: "BASIC",
    name: "Codexa Basic",
    tagline: "Essential coding ecosystem with interactive courses and AI guidance.",
    monthlyRate: 50,
    features: [
      "Full Interactive Course Curriculum",
      "Cloud Code Editor & Sandbox",
      "Interactive Learning Notes",
      "Live AI Teaching & Audio Dictation",
      "Progress Monitoring & Heatmaps",
      "Personalized Learning Guidance",
    ],
    durations: {
      1: {
        months: 1,
        basePrice: 50,
        monthlyRate: 50,
        label: "1 Month",
        accessDescription: "1 Selected Subject (Choose from Java, Python, C, C++)",
      },
      4: {
        months: 4,
        basePrice: 150,
        monthlyRate: 37.5,
        label: "4 Months",
        accessDescription: "All 4 Subjects Bundle (Java, Python, C, and C++)",
        highlight: "Best Value · All 4 Subjects Included",
        savingsLabel: "Save ₹50 vs monthly",
      },
    },
  },
  PRO: {
    id: "PRO",
    name: "Codexa Pro",
    tagline: "Career acceleration with interview simulations and professional resume studio.",
    monthlyRate: 70,
    features: [
      "Every Basic Feature Included",
      "All 4 Subjects Curriculum (Java, Python, C, C++)",
      "Cloud Code Editor & Sandbox",
      "Interactive Learning Notes",
      "Live AI Teaching & Audio Dictation",
      "AI Interview Preparation & Mock Sessions",
      "Professional Resume Builder & ATS Scanner",
    ],
    durations: {
      1: {
        months: 1,
        basePrice: 70,
        monthlyRate: 70,
        label: "1 Month",
        accessDescription: "Full Codexa Pro access (All 4 Subjects + Career Features)",
      },
      4: {
        months: 4,
        basePrice: 200,
        monthlyRate: 50,
        label: "4 Months",
        accessDescription: "Full Codexa Pro access for 4 months (Best Value · All Features)",
        highlight: "Best Value · Career Acceleration",
        savingsLabel: "Save ₹80 vs monthly",
      },
    },
  },
};

/**
 * Validates whether a string is a valid PlanTier
 */
export function isValidPlanTier(val: unknown): val is PlanTier {
  return typeof val === "string" && (val.toUpperCase() === "BASIC" || val.toUpperCase() === "PRO");
}

/**
 * Validates whether a value is a valid PlanDurationMonths (1 or 4)
 */
export function isValidDuration(val: unknown): val is PlanDurationMonths {
  const num = Number(val);
  return num === 1 || num === 4;
}

/**
 * Resolves a readable subject title from subject id or default
 */
export function resolveSubjectLabel(subjectId: unknown): string {
  if (typeof subjectId !== "string") return "Python";
  const match = AVAILABLE_SUBJECTS.find(
    (s) => s.id.toLowerCase() === subjectId.trim().toLowerCase()
  );
  return match ? match.label : "Python";
}

/**
 * Get configurable Tax and Payment fee settings
 */
export function getTaxConfiguration() {
  const envGst = process.env.SUBSCRIPTION_GST_PERCENTAGE;
  const envFee = process.env.SUBSCRIPTION_PAYMENT_FEE_PERCENTAGE;

  const gstPercentage = envGst !== undefined ? Number(envGst) : 18; // default 18% GST standard
  const paymentFeePercentage = envFee !== undefined ? Number(envFee) : 0; // default 0%

  return {
    gstPercentage: isNaN(gstPercentage) || gstPercentage < 0 ? 18 : gstPercentage,
    paymentFeePercentage: isNaN(paymentFeePercentage) || paymentFeePercentage < 0 ? 0 : paymentFeePercentage,
  };
}

export interface OrderSummary {
  planTier: PlanTier;
  planName: string;
  durationMonths: PlanDurationMonths;
  basePrice: number;
  monthlyRate: number;
  gstPercentage: number;
  gstAmount: number;
  feePercentage: number;
  feeAmount: number;
  totalAmount: number;
  amountPaise: number;
  currency: "INR";
  features: string[];
  accessDescription: string;
  selectedSubject?: string | null;
}

/**
 * Strictly derive order calculation on the server.
 * Never trust client prices, tax rates, or totals.
 */
export function calculateOrderSummary(
  rawPlan: unknown,
  rawDuration: unknown,
  rawSubject?: unknown
): OrderSummary {
  if (!isValidPlanTier(rawPlan)) {
    throw new Error(`Invalid plan tier: '${rawPlan}'. Must be BASIC or PRO.`);
  }

  const planTier = rawPlan.toUpperCase() as PlanTier;
  const plan = OFFICIAL_PLANS[planTier];

  if (!isValidDuration(rawDuration)) {
    throw new Error(`Invalid subscription duration: '${rawDuration}'. Must be 1 or 4 months.`);
  }

  const durationMonths = Number(rawDuration) as PlanDurationMonths;
  const durationPricing = plan.durations[durationMonths];

  const basePrice = durationPricing.basePrice;
  const { gstPercentage, paymentFeePercentage } = getTaxConfiguration();

  // Calculate GST & Fees accurately
  const gstAmount = Number(((basePrice * gstPercentage) / 100).toFixed(2));
  const feeAmount = Number(((basePrice * paymentFeePercentage) / 100).toFixed(2));
  const totalAmount = Number((basePrice + gstAmount + feeAmount).toFixed(2));
  const amountPaise = Math.round(totalAmount * 100);

  // Derive access description based on plan tier, duration, and subject
  let accessDescription = durationPricing.accessDescription;
  let selectedSubject: string | null = null;

  if (planTier === "BASIC") {
    if (durationMonths === 1) {
      selectedSubject = resolveSubjectLabel(rawSubject);
      accessDescription = `1 Selected Subject: ${selectedSubject} Programming`;
    } else {
      selectedSubject = "All 4 Subjects Bundle";
      accessDescription = "All 4 Subjects Bundle (Java, Python, C, and C++)";
    }
  } else {
    selectedSubject = "All 4 Subjects + Career Suite";
    accessDescription =
      durationMonths === 4
        ? "Full Codexa Pro 4-Month Bundle (All 4 Subjects + AI Interview Prep + Resume Studio)"
        : "Full Codexa Pro (All 4 Subjects + AI Interview Prep + Resume Studio)";
  }

  return {
    planTier,
    planName: plan.name,
    durationMonths,
    basePrice,
    monthlyRate: durationPricing.monthlyRate,
    gstPercentage,
    gstAmount,
    feePercentage: paymentFeePercentage,
    feeAmount,
    totalAmount,
    amountPaise,
    currency: "INR",
    features: plan.features,
    accessDescription,
    selectedSubject,
  };
}

/**
 * Accurately adds calendar months to a given date, preserving exact hours/minutes/seconds/ms
 * and clamping month-overflow to the final day of the target month.
 * e.g., Jan 31 + 1 month -> Feb 28 (or 29 in leap years), not March 2/3.
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDay) {
    // Overflow occurred (e.g. 31st of Jan -> March)
    result.setDate(0); // Sets to last day of target month, preserving timestamp
  }
  return result;
}

export interface UpgradeSummary {
  isUpgrade: true;
  previousSubscriptionId: string;
  currentPlan: PlanTier;
  targetPlan: "PRO";
  targetDurationMonths: PlanDurationMonths;
  targetPlanName: string;
  targetProBasePrice: number;
  originalBasicBasePrice: number;
  originalBasicTotal: number;
  totalDurationMs: number;
  remainingDurationMs: number;
  unusedFraction: number;
  unusedFractionPercent: number;
  unusedBaseCredit: number;
  netUpgradeBase: number;
  gstPercentage: number;
  upgradeGst: number;
  feePercentage: number;
  feeAmount: number;
  totalUpgradeAmount: number;
  amountPaise: number;
  currency: "INR";
  explanation: string;
  features: string[];
}

export interface CalculateUpgradeParams {
  activeSub: {
    id: string;
    plan: string;
    durationMonths: number;
    startDate: Date;
    endDate: Date;
    baseAmount?: number;
    totalAmount: number;
  };
  targetDurationMonths?: unknown;
}

/**
 * Calculates prorated upgrade from BASIC to PRO.
 *
 * Requirements:
 * 1. For a same-duration, same-subject one-month example:
 *    Basic ₹50 + 18% GST = ₹59; Pro ₹70 + 18% GST = ₹82.60; upgrade difference = ₹23.60.
 * 2. For upgrades partway through a subscription:
 *    Calculates unused entitlement credit proportional to the remaining duration.
 *    Applies 18% GST consistently.
 */
export function calculateUpgradeSummary(params: CalculateUpgradeParams): UpgradeSummary {
  const { activeSub } = params;
  if (!activeSub || activeSub.plan.toUpperCase() !== "BASIC") {
    throw new Error("Upgrade credit is only applicable for an active BASIC subscription.");
  }

  const targetDuration: PlanDurationMonths = isValidDuration(params.targetDurationMonths)
    ? (Number(params.targetDurationMonths) as PlanDurationMonths)
    : 1;

  const proPlan = OFFICIAL_PLANS["PRO"];
  const proPricing = proPlan.durations[targetDuration];
  const targetProBasePrice = proPricing.basePrice; // e.g. 70 for 1 month, 200 for 4 months

  const now = Date.now();
  const startMs = new Date(activeSub.startDate).getTime();
  const endMs = new Date(activeSub.endDate).getTime();
  const totalDurationMs = Math.max(1, endMs - startMs);
  const remainingDurationMs = Math.max(0, endMs - now);

  const unusedFraction = Math.min(1, Math.max(0, remainingDurationMs / totalDurationMs));
  const unusedFractionPercent = Math.round(unusedFraction * 100);

  // Derive unused base credit from student's active Basic base amount
  const basicBase = activeSub.baseAmount || 50;
  const unusedBaseCredit = Number((basicBase * unusedFraction).toFixed(2));

  // Net upgrade base price after crediting unused Basic entitlement
  const netUpgradeBase = Number(Math.max(0, targetProBasePrice - unusedBaseCredit).toFixed(2));

  const { gstPercentage, paymentFeePercentage } = getTaxConfiguration();
  const upgradeGst = Number(((netUpgradeBase * gstPercentage) / 100).toFixed(2));
  const feeAmount = Number(((netUpgradeBase * paymentFeePercentage) / 100).toFixed(2));
  const totalUpgradeAmount = Number((netUpgradeBase + upgradeGst + feeAmount).toFixed(2));
  const amountPaise = Math.round(totalUpgradeAmount * 100);

  const explanation =
    unusedFraction >= 0.99
      ? `Full Basic entitlement credited (₹${unusedBaseCredit.toFixed(2)}). Upgrade difference: ₹${totalUpgradeAmount.toFixed(2)}.`
      : `${unusedFractionPercent}% unused Basic entitlement credited (₹${unusedBaseCredit.toFixed(2)}). Net upgrade payable: ₹${totalUpgradeAmount.toFixed(2)}.`;

  return {
    isUpgrade: true,
    previousSubscriptionId: activeSub.id,
    currentPlan: "BASIC",
    targetPlan: "PRO",
    targetDurationMonths: targetDuration,
    targetPlanName: proPlan.name,
    targetProBasePrice,
    originalBasicBasePrice: basicBase,
    originalBasicTotal: activeSub.totalAmount,
    totalDurationMs,
    remainingDurationMs,
    unusedFraction,
    unusedFractionPercent,
    unusedBaseCredit,
    netUpgradeBase,
    gstPercentage,
    upgradeGst,
    feePercentage: paymentFeePercentage,
    feeAmount,
    totalUpgradeAmount,
    amountPaise,
    currency: "INR",
    explanation,
    features: proPlan.features,
  };
}

