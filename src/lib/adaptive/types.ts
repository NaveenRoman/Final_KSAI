/**
 * KnowledgeStream AI — Genuine Adaptive Student Evaluation & Learning Profile Types
 *
 * Enforces:
 * - Professional non-derogatory terminology (NEEDS_SUPPORT, DEVELOPING, STRONG, ADVANCED)
 * - Multi-signal evaluation data structures
 * - Dynamic language- and topic-level mastery profiles
 */

export type StudentMasteryLevel =
  | "NOT_ENOUGH_DATA"
  | "NEEDS_SUPPORT"
  | "DEVELOPING"
  | "STRONG"
  | "ADVANCED";

export type RecommendedDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type EvidenceSourceType =
  | "CHECKPOINT"
  | "QUIZ"
  | "CODING"
  | "TEACH_AGAIN"
  | "RECAP";

export type ConceptualUnderstandingGrade =
  | "Solid"
  | "Partial"
  | "Confused"
  | "Unrelated"
  | "NoAnswer";

export interface StructuredEvaluationResult {
  score: number; // 0 - 100
  correct: boolean;
  understandingLevel: StudentMasteryLevel;
  conceptualUnderstanding: ConceptualUnderstandingGrade;
  isTopicRelevant: boolean;
  missingConcepts: string[];
  misconceptions: string[];
  reason: string;
  whatWasCorrect: string;
  whatIsMissing: string;
  appreciation: string;
  explanation: string;
  example?: string;
  needsFollowUp: boolean;
  followUpQuestion?: string;
  confidence: number; // 0.0 - 1.0
  recommendedDifficulty: RecommendedDifficulty;
}

export interface EvidenceSignalInput {
  userId: string;
  userEmail?: string;
  course: string;
  chapterId?: string;
  topic: string;
  source: EvidenceSourceType;
  score: number; // 0 - 100
  correct?: boolean;
  misconceptions?: string[];
  missingConcepts?: string[];
  strengths?: string[];
  summary?: string;
  question?: string;
  answer?: string;
  testCasesPassed?: number;
  totalTestCases?: number;
  infrastructureError?: boolean;
  reteachCount?: number;
}

export interface EvidenceBreakdown {
  understandingScore: number;
  assessmentScore: number;
  codingScore: number;
  recentPerformance: number;
  consistencyScore: number;
  evidenceCount: number;
  teachAgainCount: number;
  repeatedMistakesCount: number;
}

export interface TopicLearningProfile {
  userId: string;
  courseId: string;
  language: string;
  chapterId: string;
  topic: string;
  masteryScore: number; // 0 - 100
  level: StudentMasteryLevel;
  recommendedDifficulty: RecommendedDifficulty;
  confidence: number; // 0.0 - 1.0
  evidenceBreakdown: EvidenceBreakdown;
  strengths: string[];
  weaknesses: string[];
  misconceptions: string[];
  recentTrend: "Improving" | "Stable" | "Needs Attention";
  lastEvaluated: string; // ISO date string
}

export interface LanguageLearningProfile {
  language: string;
  overallLevel: StudentMasteryLevel;
  averageMastery: number;
  topicsCount: number;
  topics: Record<string, TopicLearningProfile>;
  strongTopics: string[];
  developingTopics: string[];
  needsSupportTopics: string[];
  recentMistakes: string[];
  recommendedNextStep: string;
}

export interface StudentLearningProfile {
  userId: string;
  userEmail?: string;
  studentName?: string;
  overallLevel: StudentMasteryLevel;
  languages: Record<string, LanguageLearningProfile>;
  summaryEvidence: {
    totalTopicsEvaluated: number;
    totalEvidenceCount: number;
    dominantLevel: StudentMasteryLevel;
  };
  lastUpdated: string; // ISO date string
}

export interface AdaptiveTeachingStrategy {
  level: StudentMasteryLevel;
  recommendedDifficulty: RecommendedDifficulty;
  teachingInstruction: string;
  pedagogicalTone: string;
  exampleComplexity: "TINY_ANALOGY" | "MODERATE_STANDARD" | "DEEP_EDGE_CASES";
  questionComplexity: "INTUITIVE" | "APPLIED" | "ARCHITECTURAL";
  encouragePhrase: string;
}

export interface TopicChapterAnalysis {
  topic: string;
  masteryScore: number;
  level: StudentMasteryLevel;
  recommendedDifficulty: RecommendedDifficulty;
  evidenceBreakdown: EvidenceBreakdown;
  misconceptions: string[];
  strengths: string[];
  weaknesses: string[];
  reason?: string;
}

export interface ChapterLearningAnalysis {
  courseId: string;
  chapterId: string;
  chapterTitle?: string;
  overallMasteryScore: number;
  overallLevel: StudentMasteryLevel;
  totalTopics: number;
  strongTopics: TopicChapterAnalysis[];
  developingTopics: TopicChapterAnalysis[];
  needsSupportTopics: TopicChapterAnalysis[];
  notEnoughDataTopics: TopicChapterAnalysis[];
  isComplete: boolean;
}

