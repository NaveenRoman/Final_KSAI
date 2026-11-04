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
export type PlanDurationMonths = 1 | 2 | 6;

export interface PlanDurationPricing {
  months: PlanDurationMonths;
  basePrice: number; // in INR (e.g. 50, 100, 300)
  monthlyRate: number; // in INR
  label: string;
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
      "Full Course Curriculum",
      "Cloud Code Editor & Sandbox",
      "Interactive Learning Notes",
      "Live AI Teaching & Audio Dictation",
      "Progress Monitoring & Heatmaps",
      "Personalized Learning Guidance",
    ],
    durations: {
      1: { months: 1, basePrice: 50, monthlyRate: 50, label: "1 Month" },
      2: { months: 2, basePrice: 100, monthlyRate: 50, label: "2 Months" },
      6: { months: 6, basePrice: 300, monthlyRate: 50, label: "6 Months" },
    },
  },
  PRO: {
    id: "PRO",
    name: "Codexa Pro",
    tagline: "Career acceleration with interview simulations and professional resume studio.",
    monthlyRate: 70,
    features: [
      "Every Basic Feature Included",
      "Cloud Code Editor & Sandbox",
      "Interactive Learning Notes",
      "Live AI Teaching & Audio Dictation",
      "Progress Monitoring & Guidance",
      "AI Interview Preparation & Mock Sessions",
      "Professional Resume Builder & ATS Scanner",
    ],
    durations: {
      1: { months: 1, basePrice: 70, monthlyRate: 70, label: "1 Month" },
      2: { months: 2, basePrice: 140, monthlyRate: 70, label: "2 Months" },
      6: { months: 6, basePrice: 420, monthlyRate: 70, label: "6 Months" },
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
 * Validates whether a value is a valid PlanDurationMonths (1, 2, 6)
 */
export function isValidDuration(val: unknown): val is PlanDurationMonths {
  const num = Number(val);
  return num === 1 || num === 2 || num === 6;
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
}

/**
 * Strictly derive order calculation on the server.
 * Never trust client prices, tax rates, or totals.
 */
export function calculateOrderSummary(rawPlan: unknown, rawDuration: unknown): OrderSummary {
  if (!isValidPlanTier(rawPlan)) {
    throw new Error(`Invalid plan tier: '${rawPlan}'. Must be BASIC or PRO.`);
  }

  const planTier = rawPlan.toUpperCase() as PlanTier;
  const plan = OFFICIAL_PLANS[planTier];

  if (!isValidDuration(rawDuration)) {
    throw new Error(`Invalid subscription duration: '${rawDuration}'. Must be 1, 2, or 6 months.`);
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
  };
}
