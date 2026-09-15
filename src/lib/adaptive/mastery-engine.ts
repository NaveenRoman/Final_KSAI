/**
 * KnowledgeStream AI — Centralized Mastery Calculation Engine
 *
 * Implements:
 * - Multi-signal weighted calculation:
 *   Understanding (35%) + Assessment (25%) + Coding (20%) + Recent Performance (15%) + Consistency (5%)
 * - Dynamic weight rebalancing when signals are not yet attempted
 * - Anti-spike damping: prevents 1 answer from drastically jumping or dropping the level
 * - Minimum evidence threshold: returns NOT_ENOUGH_DATA when interactions < 2
 * - Non-derogatory level classification:
 *   0–49   → NEEDS_SUPPORT
 *   50–74  → DEVELOPING
 *   75–89  → STRONG
 *   90–100 → ADVANCED
 */

import {
  EvidenceBreakdown,
  RecommendedDifficulty,
  StudentMasteryLevel,
} from "./types";

export interface CalculateMasteryInput {
  understandingScores: number[];
  assessmentScores: number[];
  codingScores: number[];
  recentScores: number[];
  teachAgainCount: number;
  repeatedMistakesCount: number;
  previousMastery?: number | null;
  previousLevel?: StudentMasteryLevel | null;
}

export interface MasteryCalculationResult {
  masteryScore: number; // 0 - 100
  level: StudentMasteryLevel;
  recommendedDifficulty: RecommendedDifficulty;
  confidence: number; // 0.0 - 1.0
  evidenceBreakdown: EvidenceBreakdown;
  recentTrend: "Improving" | "Stable" | "Needs Attention";
}

export function calculateTopicMastery(input: CalculateMasteryInput): MasteryCalculationResult {
  const {
    understandingScores = [],
    assessmentScores = [],
    codingScores = [],
    recentScores = [],
    teachAgainCount = 0,
    repeatedMistakesCount = 0,
    previousMastery,
  } = input;

  const totalEvidenceCount =
    understandingScores.length +
    assessmentScores.length +
    codingScores.length;

  // 1. Edge Case: Not Enough Data
  if (totalEvidenceCount < 2) {
    const provisionalScore =
      understandingScores.length > 0
        ? understandingScores[0]
        : assessmentScores.length > 0
        ? assessmentScores[0]
        : codingScores.length > 0
        ? codingScores[0]
        : 50;

    return {
      masteryScore: Math.round(provisionalScore),
      level: "NOT_ENOUGH_DATA",
      recommendedDifficulty: totalEvidenceCount === 0 ? "BEGINNER" : provisionalScore >= 75 ? "INTERMEDIATE" : "BEGINNER",
      confidence: totalEvidenceCount === 1 ? 0.35 : 0.0,
      evidenceBreakdown: {
        understandingScore: average(understandingScores),
        assessmentScore: average(assessmentScores),
        codingScore: average(codingScores),
        recentPerformance: average(recentScores),
        consistencyScore: 50,
        evidenceCount: totalEvidenceCount,
        teachAgainCount,
        repeatedMistakesCount,
      },
      recentTrend: "Stable",
    };
  }

  // 2. Compute Component Averages
  const uAvg = understandingScores.length > 0 ? average(understandingScores) : null;
  const aAvg = assessmentScores.length > 0 ? average(assessmentScores) : null;
  const cAvg = codingScores.length > 0 ? average(codingScores) : null;

  // 3. Dynamic Weight Rebalancing
  // Base weights: Understanding 0.35, Assessment 0.25, Coding 0.20, Recent 0.15, Consistency 0.05
  let wU = 0.35;
  let wA = 0.25;
  let wC = 0.20;
  const wR = 0.15;
  const wK = 0.05;

  let activeWeightSum = wR + wK;
  if (uAvg !== null) activeWeightSum += wU;
  if (aAvg !== null) activeWeightSum += wA;
  if (cAvg !== null) activeWeightSum += wC;

  // Normalize weights to sum to 1.0 across active signals
  wU = uAvg !== null ? wU / activeWeightSum : 0;
  wA = aAvg !== null ? wA / activeWeightSum : 0;
  wC = cAvg !== null ? wC / activeWeightSum : 0;
  const normWR = wR / activeWeightSum;
  const normWK = wK / activeWeightSum;

  // 4. Compute Recent Performance (Weighted towards latest signals)
  let recentAvg: number;
  if (recentScores.length > 0) {
    const weights = recentScores.map((_, i) => i + 1); // 1, 2, 3, 4, 5
    const totalW = weights.reduce((a, b) => a + b, 0);
    recentAvg = recentScores.reduce((acc, score, idx) => acc + score * weights[idx], 0) / totalW;
  } else {
    recentAvg = (uAvg ?? 60 + (aAvg ?? 60)) / 2;
  }

  // 5. Compute Consistency Score
  // Low variance across attempts yields higher consistency (50-100)
  // High variance or repeated mistakes reduces consistency (0-50)
  const allScores = [...understandingScores, ...assessmentScores, ...codingScores];
  const meanAll = average(allScores);
  const variance =
    allScores.reduce((acc, s) => acc + Math.pow(s - meanAll, 2), 0) / allScores.length;
  const stdDev = Math.sqrt(variance);

  let consistencyScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 1.5)));

  // Deduct for repeated mistakes on the same concept
  if (repeatedMistakesCount > 1) {
    consistencyScore = Math.max(20, consistencyScore - repeatedMistakesCount * 10);
  }

  // Bonus for successful recovery after Teach Again
  if (teachAgainCount > 0 && recentScores.length >= 2) {
    const latest = recentScores[recentScores.length - 1];
    const previous = recentScores[recentScores.length - 2];
    if (latest > previous + 15) {
      consistencyScore = Math.min(100, consistencyScore + 10);
    }
  }

  // 6. Calculate Raw Composite Mastery
  const rawCalculatedScore =
    (uAvg !== null ? uAvg * wU : 0) +
    (aAvg !== null ? aAvg * wA : 0) +
    (cAvg !== null ? cAvg * wC : 0) +
    recentAvg * normWR +
    consistencyScore * normWK;

  // 7. Anti-Spike Damping (Historical Inertia)
  // Prevents one single anomalous result from violently shifting an established profile
  let finalMasteryScore: number;
  if (typeof previousMastery === "number" && previousMastery > 0) {
    // Balanced historical inertia (50% historical anchor, 50% new accumulated evidence)
    finalMasteryScore = Math.round(previousMastery * 0.5 + rawCalculatedScore * 0.5);
  } else {
    finalMasteryScore = Math.round(rawCalculatedScore);
  }

  finalMasteryScore = Math.max(0, Math.min(100, finalMasteryScore));

  // 8. Level Classification
  let level: StudentMasteryLevel;
  if (finalMasteryScore >= 90) {
    level = "ADVANCED";
  } else if (finalMasteryScore >= 75) {
    level = "STRONG";
  } else if (finalMasteryScore >= 50) {
    level = "DEVELOPING";
  } else {
    level = "NEEDS_SUPPORT";
  }

  // 9. Recommended Difficulty for Teaching & Dictator
  let recommendedDifficulty: RecommendedDifficulty;
  if (level === "ADVANCED" || level === "STRONG") {
    recommendedDifficulty = "ADVANCED";
  } else if (level === "DEVELOPING") {
    recommendedDifficulty = "INTERMEDIATE";
  } else {
    recommendedDifficulty = "BEGINNER";
  }

  // 10. Confidence Metric (0.0 to 1.0)
  // Higher evidence count + lower variance = higher confidence
  const evidenceConfidence = Math.min(0.5, (totalEvidenceCount / 10) * 0.5);
  const consistencyConfidence = (consistencyScore / 100) * 0.5;
  const confidence = Math.round((evidenceConfidence + consistencyConfidence) * 100) / 100;

  // 11. Recent Trend
  let recentTrend: "Improving" | "Stable" | "Needs Attention" = "Stable";
  if (recentScores.length >= 2) {
    const lastScore = recentScores[recentScores.length - 1];
    const prevScore = recentScores[recentScores.length - 2];
    if (lastScore >= prevScore + 10) recentTrend = "Improving";
    else if (lastScore <= prevScore - 15) recentTrend = "Needs Attention";
  }

  return {
    masteryScore: finalMasteryScore,
    level,
    recommendedDifficulty,
    confidence,
    evidenceBreakdown: {
      understandingScore: Math.round(uAvg ?? meanAll),
      assessmentScore: Math.round(aAvg ?? meanAll),
      codingScore: Math.round(cAvg ?? meanAll),
      recentPerformance: Math.round(recentAvg),
      consistencyScore: Math.round(consistencyScore),
      evidenceCount: totalEvidenceCount,
      teachAgainCount,
      repeatedMistakesCount,
    },
    recentTrend,
  };
}

function average(nums: number[]): number {
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
