/**
 * Versioned AI Model Pricing Configuration
 *
 * Official Google Gemini Developer API published rates per 1,000,000 tokens (USD).
 * Reference: https://ai.google.dev/gemini-api/docs/pricing
 *
 * All calculations must strictly derive from recorded input/output token counts.
 * Invocations without token metadata must be reported as NOT TRACKED.
 */

export type BillingMode = "standard" | "batch" | "flex" | "priority";
export type PricingTier = "paid" | "free";

export interface RatePair {
  inputPerMillion: number;
  outputPerMillion: number;
  inputAboveThresholdPerMillion?: number;
  outputAboveThresholdPerMillion?: number;
}

export interface ModelPricingTier {
  provider: "google" | "deepseek" | "ollama" | "local" | "unknown";
  displayName: string;
  contextThresholdTokens?: number; // e.g. 200,000 for Pro, 128,000 for legacy
  effectiveDate: string;
  hasFreeTier?: boolean;
  modes: Partial<Record<BillingMode, RatePair>>;
  transitionDate?: string;
  transitionModes?: Partial<Record<BillingMode, RatePair>>;

  // Backwards-compatibility fields for legacy callers
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  inputCostAbove128kPerMillion?: number;
  outputCostAbove128kPerMillion?: number;
}

export const AI_MODEL_PRICING: Record<string, ModelPricingTier> = {
  // ==========================================================================
  // GEMINI 2.5 PRO
  // Standard: $1.25 / 1M in (<=200k), $2.50 (>200k); $10.00 / 1M out (<=200k), $15.00 (>200k)
  // Batch/Flex: $0.625 in (<=200k), $1.25 (>200k); $5.00 out (<=200k), $7.50 (>200k)
  // Priority: $2.25 in (<=200k), $4.50 (>200k); $18.00 out (<=200k), $27.00 (>200k)
  // ==========================================================================
  "gemini-2.5-pro": {
    provider: "google",
    displayName: "Gemini 2.5 Pro",
    contextThresholdTokens: 200_000,
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.25,
        outputPerMillion: 10.00,
        inputAboveThresholdPerMillion: 2.50,
        outputAboveThresholdPerMillion: 15.00,
      },
      batch: {
        inputPerMillion: 0.625,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 7.50,
      },
      flex: {
        inputPerMillion: 0.625,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 7.50,
      },
      priority: {
        inputPerMillion: 2.25,
        outputPerMillion: 18.00,
        inputAboveThresholdPerMillion: 4.50,
        outputAboveThresholdPerMillion: 27.00,
      },
    },
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 10.00,
    inputCostAbove128kPerMillion: 2.50,
    outputCostAbove128kPerMillion: 15.00,
  },
  "models/gemini-2.5-pro": {
    provider: "google",
    displayName: "Gemini 2.5 Pro",
    contextThresholdTokens: 200_000,
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.25,
        outputPerMillion: 10.00,
        inputAboveThresholdPerMillion: 2.50,
        outputAboveThresholdPerMillion: 15.00,
      },
      batch: {
        inputPerMillion: 0.625,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 7.50,
      },
      flex: {
        inputPerMillion: 0.625,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 7.50,
      },
      priority: {
        inputPerMillion: 2.25,
        outputPerMillion: 18.00,
        inputAboveThresholdPerMillion: 4.50,
        outputAboveThresholdPerMillion: 27.00,
      },
    },
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 10.00,
    inputCostAbove128kPerMillion: 2.50,
    outputCostAbove128kPerMillion: 15.00,
  },

  // ==========================================================================
  // GEMINI 2.5 FLASH
  // Standard: $0.30 / 1M prompt (text/media), $2.50 / 1M completion
  // Batch/Flex: $0.15 / 1M prompt, $1.25 / 1M completion
  // Priority: $0.54 / 1M prompt, $4.50 / 1M completion
  // ==========================================================================
  "gemini-2.5-flash": {
    provider: "google",
    displayName: "Gemini 2.5 Flash",
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.30,
        outputPerMillion: 2.50,
      },
      batch: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      flex: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      priority: {
        inputPerMillion: 0.54,
        outputPerMillion: 4.50,
      },
    },
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
  },
  "models/gemini-2.5-flash": {
    provider: "google",
    displayName: "Gemini 2.5 Flash",
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.30,
        outputPerMillion: 2.50,
      },
      batch: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      flex: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      priority: {
        inputPerMillion: 0.54,
        outputPerMillion: 4.50,
      },
    },
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
  },

  // ==========================================================================
  // GEMINI 2.5 FLASH-LITE
  // Standard: $0.10 / 1M prompt, $0.40 / 1M completion
  // Batch/Flex: $0.05 / 1M prompt, $0.20 / 1M completion
  // Priority: $0.18 / 1M prompt, $0.72 / 1M completion
  // ==========================================================================
  "gemini-2.5-flash-lite": {
    provider: "google",
    displayName: "Gemini 2.5 Flash-Lite",
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.10,
        outputPerMillion: 0.40,
      },
      batch: {
        inputPerMillion: 0.05,
        outputPerMillion: 0.20,
      },
      flex: {
        inputPerMillion: 0.05,
        outputPerMillion: 0.20,
      },
      priority: {
        inputPerMillion: 0.18,
        outputPerMillion: 0.72,
      },
    },
    inputCostPerMillion: 0.10,
    outputCostPerMillion: 0.40,
  },
  "models/gemini-2.5-flash-lite": {
    provider: "google",
    displayName: "Gemini 2.5 Flash-Lite",
    effectiveDate: "2025-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.10,
        outputPerMillion: 0.40,
      },
      batch: {
        inputPerMillion: 0.05,
        outputPerMillion: 0.20,
      },
      flex: {
        inputPerMillion: 0.05,
        outputPerMillion: 0.20,
      },
      priority: {
        inputPerMillion: 0.18,
        outputPerMillion: 0.72,
      },
    },
    inputCostPerMillion: 0.10,
    outputCostPerMillion: 0.40,
  },

  // ==========================================================================
  // GEMINI 3.1 FLASH-LITE
  // Standard: $0.25 / 1M prompt, $1.50 / 1M completion
  // Batch/Flex: $0.125 / 1M prompt, $0.75 / 1M completion
  // Priority: $0.45 / 1M prompt, $2.70 / 1M completion
  // ==========================================================================
  "gemini-3.1-flash-lite": {
    provider: "google",
    displayName: "Gemini 3.1 Flash-Lite",
    effectiveDate: "2026-03-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.25,
        outputPerMillion: 1.50,
      },
      batch: {
        inputPerMillion: 0.125,
        outputPerMillion: 0.75,
      },
      flex: {
        inputPerMillion: 0.125,
        outputPerMillion: 0.75,
      },
      priority: {
        inputPerMillion: 0.45,
        outputPerMillion: 2.70,
      },
    },
    inputCostPerMillion: 0.25,
    outputCostPerMillion: 1.50,
  },
  "models/gemini-3.1-flash-lite": {
    provider: "google",
    displayName: "Gemini 3.1 Flash-Lite",
    effectiveDate: "2026-03-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.25,
        outputPerMillion: 1.50,
      },
      batch: {
        inputPerMillion: 0.125,
        outputPerMillion: 0.75,
      },
      flex: {
        inputPerMillion: 0.125,
        outputPerMillion: 0.75,
      },
      priority: {
        inputPerMillion: 0.45,
        outputPerMillion: 2.70,
      },
    },
    inputCostPerMillion: 0.25,
    outputCostPerMillion: 1.50,
  },

  // ==========================================================================
  // GEMINI 3.5 FLASH-LITE
  // Standard: $0.30 / 1M prompt, $2.50 / 1M completion
  // Batch/Flex: $0.15 / 1M prompt, $1.25 / 1M completion
  // Priority: $0.54 / 1M prompt, $4.50 / 1M completion
  // ==========================================================================
  "gemini-3.5-flash-lite": {
    provider: "google",
    displayName: "Gemini 3.5 Flash-Lite",
    effectiveDate: "2026-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.30,
        outputPerMillion: 2.50,
      },
      batch: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      flex: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      priority: {
        inputPerMillion: 0.54,
        outputPerMillion: 4.50,
      },
    },
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
  },
  "models/gemini-3.5-flash-lite": {
    provider: "google",
    displayName: "Gemini 3.5 Flash-Lite",
    effectiveDate: "2026-06-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.30,
        outputPerMillion: 2.50,
      },
      batch: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      flex: {
        inputPerMillion: 0.15,
        outputPerMillion: 1.25,
      },
      priority: {
        inputPerMillion: 0.54,
        outputPerMillion: 4.50,
      },
    },
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
  },

  // ==========================================================================
  // GEMINI 3.5 FLASH
  // Standard: $1.50 in / $9.00 out per 1M tokens
  // Batch/Flex: $0.75 in / $4.50 out per 1M tokens
  // Priority: $2.70 in / $16.20 out per 1M tokens
  // ==========================================================================
  "gemini-3.5-flash": {
    provider: "google",
    displayName: "Gemini 3.5 Flash",
    effectiveDate: "2026-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 9.00,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 4.50,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 4.50,
      },
      priority: {
        inputPerMillion: 2.70,
        outputPerMillion: 16.20,
      },
    },
    inputCostPerMillion: 1.50,
    outputCostPerMillion: 9.00,
  },
  "models/gemini-3.5-flash": {
    provider: "google",
    displayName: "Gemini 3.5 Flash",
    effectiveDate: "2026-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 9.00,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 4.50,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 4.50,
      },
      priority: {
        inputPerMillion: 2.70,
        outputPerMillion: 16.20,
      },
    },
    inputCostPerMillion: 1.50,
    outputCostPerMillion: 9.00,
  },

  // ==========================================================================
  // GEMINI 3.8 FLASH
  // Standard: $0.75 in / $3.75 out through Dec 31, 2026; $1.50 in / $7.50 out Jan 1, 2027+
  // Batch/Flex: $0.375 in / $1.875 out through Dec 31, 2026; $0.75 in / $3.75 out Jan 1, 2027+
  // Priority: $1.35 in / $6.75 out
  // ==========================================================================
  "gemini-3.8-flash": {
    provider: "google",
    displayName: "Gemini 3.8 Flash",
    effectiveDate: "2026-09-01",
    transitionDate: "2027-01-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      batch: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      flex: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 7.50,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    inputCostPerMillion: 0.75,
    outputCostPerMillion: 3.75,
  },
  "models/gemini-3.8-flash": {
    provider: "google",
    displayName: "Gemini 3.8 Flash",
    effectiveDate: "2026-09-01",
    transitionDate: "2027-01-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      batch: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      flex: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 7.50,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    inputCostPerMillion: 0.75,
    outputCostPerMillion: 3.75,
  },

  // ==========================================================================
  // GEMINI 3.6 FLASH
  // Standard: $0.75 in / $3.75 out through Dec 31, 2026; $1.50 in / $7.50 out Jan 1, 2027+
  // ==========================================================================
  "gemini-3.6-flash": {
    provider: "google",
    displayName: "Gemini 3.6 Flash",
    effectiveDate: "2026-07-01",
    transitionDate: "2027-01-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      batch: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      flex: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 7.50,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    inputCostPerMillion: 0.75,
    outputCostPerMillion: 3.75,
  },
  "models/gemini-3.6-flash": {
    provider: "google",
    displayName: "Gemini 3.6 Flash",
    effectiveDate: "2026-07-01",
    transitionDate: "2027-01-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      batch: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      flex: {
        inputPerMillion: 0.375,
        outputPerMillion: 1.875,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 1.50,
        outputPerMillion: 7.50,
      },
      batch: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      flex: {
        inputPerMillion: 0.75,
        outputPerMillion: 3.75,
      },
      priority: {
        inputPerMillion: 1.35,
        outputPerMillion: 6.75,
      },
    },
    inputCostPerMillion: 0.75,
    outputCostPerMillion: 3.75,
  },

  // ==========================================================================
  // GEMINI 4 ARGON (Flagship Reasoning)
  // Standard: $2.00 in / $10.00 out through Nov 30, 2026; $4.00 in / $20.00 out Dec 1, 2026+
  // Note: No Free Tier
  // ==========================================================================
  "gemini-4-argon": {
    provider: "google",
    displayName: "Gemini 4 Argon",
    effectiveDate: "2026-10-01",
    transitionDate: "2026-12-01",
    hasFreeTier: false,
    modes: {
      standard: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      batch: {
        inputPerMillion: 1.00,
        outputPerMillion: 5.00,
      },
      flex: {
        inputPerMillion: 1.00,
        outputPerMillion: 5.00,
      },
      priority: {
        inputPerMillion: 3.60,
        outputPerMillion: 18.00,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 4.00,
        outputPerMillion: 20.00,
      },
      batch: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      flex: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      priority: {
        inputPerMillion: 7.20,
        outputPerMillion: 36.00,
      },
    },
    inputCostPerMillion: 2.00,
    outputCostPerMillion: 10.00,
  },
  "models/gemini-4-argon": {
    provider: "google",
    displayName: "Gemini 4 Argon",
    effectiveDate: "2026-10-01",
    transitionDate: "2026-12-01",
    hasFreeTier: false,
    modes: {
      standard: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      batch: {
        inputPerMillion: 1.00,
        outputPerMillion: 5.00,
      },
      flex: {
        inputPerMillion: 1.00,
        outputPerMillion: 5.00,
      },
      priority: {
        inputPerMillion: 3.60,
        outputPerMillion: 18.00,
      },
    },
    transitionModes: {
      standard: {
        inputPerMillion: 4.00,
        outputPerMillion: 20.00,
      },
      batch: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      flex: {
        inputPerMillion: 2.00,
        outputPerMillion: 10.00,
      },
      priority: {
        inputPerMillion: 7.20,
        outputPerMillion: 36.00,
      },
    },
    inputCostPerMillion: 2.00,
    outputCostPerMillion: 10.00,
  },

  // ==========================================================================
  // GEMINI 3.1 PRO PREVIEW
  // Standard: $2.00 in (<=200k), $4.00 in (>200k); $12.00 out (<=200k), $18.00 out (>200k)
  // ==========================================================================
  "gemini-3.1-pro-preview": {
    provider: "google",
    displayName: "Gemini 3.1 Pro Preview",
    contextThresholdTokens: 200_000,
    effectiveDate: "2026-03-01",
    hasFreeTier: false,
    modes: {
      standard: {
        inputPerMillion: 2.00,
        outputPerMillion: 12.00,
        inputAboveThresholdPerMillion: 4.00,
        outputAboveThresholdPerMillion: 18.00,
      },
      batch: {
        inputPerMillion: 1.00,
        outputPerMillion: 6.00,
        inputAboveThresholdPerMillion: 2.00,
        outputAboveThresholdPerMillion: 9.00,
      },
      flex: {
        inputPerMillion: 1.00,
        outputPerMillion: 6.00,
        inputAboveThresholdPerMillion: 2.00,
        outputAboveThresholdPerMillion: 9.00,
      },
      priority: {
        inputPerMillion: 3.60,
        outputPerMillion: 21.60,
        inputAboveThresholdPerMillion: 7.20,
        outputAboveThresholdPerMillion: 32.40,
      },
    },
    inputCostPerMillion: 2.00,
    outputCostPerMillion: 12.00,
    inputCostAbove128kPerMillion: 4.00,
    outputCostAbove128kPerMillion: 18.00,
  },

  // ==========================================================================
  // HISTORICAL MODELS PRESERVED
  // Gemini 1.5 Flash (Historical)
  // Standard: $0.075 in (<=128k), $0.15 in (>128k); $0.30 out (<=128k), $0.60 out (>128k)
  // ==========================================================================
  "gemini-1.5-flash": {
    provider: "google",
    displayName: "Gemini 1.5 Flash (Legacy)",
    contextThresholdTokens: 128_000,
    effectiveDate: "2024-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.075,
        outputPerMillion: 0.30,
        inputAboveThresholdPerMillion: 0.15,
        outputAboveThresholdPerMillion: 0.60,
      },
      batch: {
        inputPerMillion: 0.0375,
        outputPerMillion: 0.15,
        inputAboveThresholdPerMillion: 0.075,
        outputAboveThresholdPerMillion: 0.30,
      },
    },
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    inputCostAbove128kPerMillion: 0.15,
    outputCostAbove128kPerMillion: 0.60,
  },
  "models/gemini-1.5-flash": {
    provider: "google",
    displayName: "Gemini 1.5 Flash (Legacy)",
    contextThresholdTokens: 128_000,
    effectiveDate: "2024-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.075,
        outputPerMillion: 0.30,
        inputAboveThresholdPerMillion: 0.15,
        outputAboveThresholdPerMillion: 0.60,
      },
      batch: {
        inputPerMillion: 0.0375,
        outputPerMillion: 0.15,
        inputAboveThresholdPerMillion: 0.075,
        outputAboveThresholdPerMillion: 0.30,
      },
    },
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
    inputCostAbove128kPerMillion: 0.15,
    outputCostAbove128kPerMillion: 0.60,
  },

  // Gemini 1.5 Pro (Historical)
  // Standard: $1.25 in (<=128k), $2.50 in (>128k); $5.00 out (<=128k), $10.00 out (>128k)
  "gemini-1.5-pro": {
    provider: "google",
    displayName: "Gemini 1.5 Pro (Legacy)",
    contextThresholdTokens: 128_000,
    effectiveDate: "2024-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.25,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 2.50,
        outputAboveThresholdPerMillion: 10.00,
      },
      batch: {
        inputPerMillion: 0.625,
        outputPerMillion: 2.50,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 5.00,
      },
    },
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.00,
    inputCostAbove128kPerMillion: 2.50,
    outputCostAbove128kPerMillion: 10.00,
  },
  "models/gemini-1.5-pro": {
    provider: "google",
    displayName: "Gemini 1.5 Pro (Legacy)",
    contextThresholdTokens: 128_000,
    effectiveDate: "2024-05-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 1.25,
        outputPerMillion: 5.00,
        inputAboveThresholdPerMillion: 2.50,
        outputAboveThresholdPerMillion: 10.00,
      },
      batch: {
        inputPerMillion: 0.625,
        outputPerMillion: 2.50,
        inputAboveThresholdPerMillion: 1.25,
        outputAboveThresholdPerMillion: 5.00,
      },
    },
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.00,
    inputCostAbove128kPerMillion: 2.50,
    outputCostAbove128kPerMillion: 10.00,
  },

  // Gemini 1.5 Flash 8B (Historical)
  "gemini-1.5-flash-8b": {
    provider: "google",
    displayName: "Gemini 1.5 Flash 8B (Legacy)",
    contextThresholdTokens: 128_000,
    effectiveDate: "2024-10-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.0375,
        outputPerMillion: 0.15,
        inputAboveThresholdPerMillion: 0.075,
        outputAboveThresholdPerMillion: 0.30,
      },
    },
    inputCostPerMillion: 0.0375,
    outputCostPerMillion: 0.15,
    inputCostAbove128kPerMillion: 0.075,
    outputCostAbove128kPerMillion: 0.30,
  },

  // Gemini 2.0 Flash Lite (Historical Preview)
  "gemini-2.0-flash-lite": {
    provider: "google",
    displayName: "Gemini 2.0 Flash Lite",
    effectiveDate: "2025-02-01",
    hasFreeTier: true,
    modes: {
      standard: {
        inputPerMillion: 0.075,
        outputPerMillion: 0.30,
      },
    },
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.30,
  },

  // ==========================================================================
  // LOCAL & SANDBOXED EXECUTION (ZERO COST)
  // ==========================================================================
  "deepseek-coder": {
    provider: "deepseek",
    displayName: "DeepSeek Coder 6.7B (Local)",
    effectiveDate: "2024-01-01",
    hasFreeTier: true,
    modes: {
      standard: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      batch: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      flex: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      priority: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
    },
    inputCostPerMillion: 0.0,
    outputCostPerMillion: 0.0,
  },
  "deepseek-coder:6.7b": {
    provider: "deepseek",
    displayName: "DeepSeek Coder 6.7B (Local)",
    effectiveDate: "2024-01-01",
    hasFreeTier: true,
    modes: {
      standard: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      batch: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      flex: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      priority: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
    },
    inputCostPerMillion: 0.0,
    outputCostPerMillion: 0.0,
  },
  "ollama": {
    provider: "ollama",
    displayName: "Ollama Local Engine",
    effectiveDate: "2024-01-01",
    hasFreeTier: true,
    modes: {
      standard: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      batch: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      flex: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      priority: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
    },
    inputCostPerMillion: 0.0,
    outputCostPerMillion: 0.0,
  },
  "local": {
    provider: "local",
    displayName: "Local Sandboxed AI",
    effectiveDate: "2024-01-01",
    hasFreeTier: true,
    modes: {
      standard: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      batch: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      flex: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
      priority: { inputPerMillion: 0.0, outputPerMillion: 0.0 },
    },
    inputCostPerMillion: 0.0,
    outputCostPerMillion: 0.0,
  },
};

/**
 * Calculates exact cost in USD based on official published model pricing.
 * Supports:
 * - Free-tier vs Paid-tier distinction
 * - Billing modes: standard, batch, flex, priority
 * - Context length thresholds (200K for Pro, 128K for legacy models)
 * - Date transitions for versioned pricing schedules
 *
 * Strictly returns null if:
 * - Token counts are absent, null, undefined, or negative
 * - Model is unknown or unverified
 * - Billing mode is unrecognized
 * - Model does not support free tier and free tier is requested
 */
export function calculateAiCostUsd(
  modelName: string,
  inputTokens?: number | null,
  outputTokens?: number | null,
  tier?: PricingTier | "unknown",
  mode: BillingMode = "standard",
  requestDate?: string | Date
): number | null {
  if (
    inputTokens === undefined ||
    inputTokens === null ||
    outputTokens === undefined ||
    outputTokens === null ||
    typeof inputTokens !== "number" ||
    typeof outputTokens !== "number" ||
    isNaN(inputTokens) ||
    isNaN(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    return null;
  }

  // Strictly validate billing mode
  const validModes: BillingMode[] = ["standard", "batch", "flex", "priority"];
  if (!validModes.includes(mode)) {
    return null;
  }

  const normalized = (modelName || "").toLowerCase().trim();
  const pricing = AI_MODEL_PRICING[normalized];

  // If model is unknown or not explicitly registered, never guess pricing -> return null (NOT TRACKED)
  if (!pricing) {
    return null;
  }

  // Determine effective billing tier: passed parameter > environment variable > "unknown"
  const envTier = process.env.GEMINI_BILLING_TIER as PricingTier | undefined;
  const resolvedTier: PricingTier | "unknown" =
    tier !== undefined
      ? tier
      : envTier === "paid" || envTier === "free"
      ? envTier
      : "unknown";

  // Local/sandboxed zero-cost models are always $0.00 regardless of tier
  const isZeroCost =
    pricing.provider === "deepseek" ||
    pricing.provider === "ollama" ||
    pricing.provider === "local" ||
    (pricing.inputCostPerMillion === 0 && pricing.outputCostPerMillion === 0);

  if (isZeroCost) {
    return 0.0;
  }

  // Free tier has zero API dollar cost (if supported)
  if (resolvedTier === "free") {
    if (pricing.hasFreeTier === false) {
      // Model not available on free tier (e.g. Gemini 4 Argon)
      return null;
    }
    return 0.0;
  }

  // If billing tier is unknown or not explicitly paid, do NOT assume -> return null (NOT TRACKED)
  if (resolvedTier !== "paid") {
    return null;
  }

  // Check date transition if configured
  const dateObj = requestDate ? new Date(requestDate) : new Date();
  const isPostTransition =
    pricing.transitionDate && !isNaN(dateObj.getTime())
      ? dateObj >= new Date(pricing.transitionDate)
      : false;

  const modeRates =
    isPostTransition && pricing.transitionModes?.[mode]
      ? pricing.transitionModes[mode]
      : pricing.modes[mode];

  if (!modeRates) {
    // Mode not supported for this model -> NOT TRACKED
    return null;
  }

  // Determine if prompt exceeds context threshold
  const threshold = pricing.contextThresholdTokens || 0;
  const isAboveThreshold = threshold > 0 && inputTokens > threshold;

  const inputRate =
    isAboveThreshold && modeRates.inputAboveThresholdPerMillion !== undefined
      ? modeRates.inputAboveThresholdPerMillion
      : modeRates.inputPerMillion;

  const outputRate =
    isAboveThreshold && modeRates.outputAboveThresholdPerMillion !== undefined
      ? modeRates.outputAboveThresholdPerMillion
      : modeRates.outputPerMillion;

  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;
  return Number((inputCost + outputCost).toFixed(8));
}

/**
 * Formats USD cost for display, or returns "NOT TRACKED" if null.
 */
export function formatAiCost(costUsd: number | null): string {
  if (costUsd === null || costUsd === undefined) {
    return "NOT TRACKED";
  }
  if (costUsd === 0) {
    return "$0.00 (Free/Local)";
  }
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(6)}`;
  }
  return `$${costUsd.toFixed(4)}`;
}

export interface CanonicalPricingBannerItem {
  model: string;
  displayName: string;
  promptRate: string;
  candidateRate: string;
  isLocal: boolean;
}

/**
 * Returns dynamic canonical rates derived directly from AI_MODEL_PRICING
 * for display in the AI governance dashboard banner.
 */
export function getCanonicalPricingBannerData(): CanonicalPricingBannerItem[] {
  const modelsToShow = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-pro",
    "deepseek-coder",
  ];

  return modelsToShow.map((modelKey) => {
    const p = AI_MODEL_PRICING[modelKey];
    if (!p) {
      return {
        model: modelKey,
        displayName: modelKey,
        promptRate: "N/A",
        candidateRate: "N/A",
        isLocal: false,
      };
    }
    const isLocal =
      p.provider === "deepseek" ||
      p.provider === "ollama" ||
      p.provider === "local" ||
      (p.inputCostPerMillion === 0 && p.outputCostPerMillion === 0);

    const stdRates = p.modes.standard;
    const promptRate = isLocal
      ? "$0.00"
      : stdRates
      ? `$${stdRates.inputPerMillion.toFixed(stdRates.inputPerMillion < 0.1 ? 3 : 2)}`
      : "N/A";
    const candidateRate = isLocal
      ? "$0.00"
      : stdRates
      ? `$${stdRates.outputPerMillion.toFixed(2)}`
      : "N/A";

    return {
      model: modelKey,
      displayName: p.displayName,
      promptRate,
      candidateRate,
      isLocal,
    };
  });
}
