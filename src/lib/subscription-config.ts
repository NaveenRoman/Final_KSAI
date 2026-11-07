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
