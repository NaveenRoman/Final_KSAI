/**
 * KnowledgeStream AI — Student Learning Profile & Persistence Service
 *
 * Implements:
 * - Evidence ingestion across Understanding, Quizzes, and Coding
 * - Automatic misconception tracking into LearningMemory
 * - TopicProgress database persistence with multi-signal analytics
 * - Compiler/infrastructure safety: never penalizes students for environment/tool errors
 * - Topic-, Language-, and Overall Student Learning Profiles
 */

import { prisma } from "@/lib/prisma";
import {
  EvidenceSignalInput,
  LanguageLearningProfile,
  StudentLearningProfile,
  StudentMasteryLevel,
  TopicLearningProfile,
} from "./types";
import { calculateTopicMastery } from "./mastery-engine";

function normalizeLanguage(course: string): string {
  const norm = (course || "").toLowerCase().trim();
  if (norm.includes("python")) return "python";
  if (norm === "c") return "c";
  if (norm.includes("cpp") || norm.includes("c++")) return "cpp";
  if (norm.includes("java")) return "java";
  return norm || "general";
}

async function resolveUserId(userId?: string, userEmail?: string): Promise<string | null> {
  if (userId) return userId;
  if (!userEmail) return null;
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });
  return user ? user.id : null;
}

/**
 * Record student learning evidence from Checkpoints, Quizzes, or Practice
 */
export async function recordStudentEvidence(
  input: EvidenceSignalInput
): Promise<{ success: boolean; profile?: TopicLearningProfile }> {
  try {
    const userId = await resolveUserId(input.userId, input.userEmail);
    if (!userId) {
      console.warn("Cannot record student evidence: unable to resolve userId", input);
      return { success: false };
    }

    const courseId = normalizeLanguage(input.course);
    const chapterId = (!input.chapterId || input.chapterId === "general") ? `${courseId}_general` : input.chapterId;
    const topic = input.topic.trim();

    // 1. Record immutable LearningEvent
    await prisma.learningEvent.create({
      data: {
        userId,
        courseId,
        chapterId,
        topic,
        eventType: `EVIDENCE_${input.source}`,
        content: input.summary || `Learning evidence: ${input.source} scored ${input.score}%`,
        metadata: JSON.stringify({
          source: input.source,
          score: input.score,
          correct: input.correct ?? input.score >= 70,
          question: input.question,
          answer: input.answer,
          misconceptions: input.misconceptions || [],
          missingConcepts: input.missingConcepts || [],
          strengths: input.strengths || [],
          testCasesPassed: input.testCasesPassed,
          totalTestCases: input.totalTestCases,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // 2. Persist Misconceptions into LearningMemory
    if (input.misconceptions && input.misconceptions.length > 0) {
      for (const misconception of input.misconceptions) {
        const cleanKey = misconception
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 50);

        await prisma.learningMemory.upsert({
          where: {
            userId_topic_memoryType_key: {
              userId,
              topic,
              memoryType: "MISTAKE",
              key: `misc_${cleanKey}`,
            },
          },
          update: {
            content: misconception,
            occurrences: { increment: 1 },
            lastObserved: new Date(),
          },
          create: {
            userId,
            courseId,
            chapterId,
            topic,
            memoryType: "MISTAKE",
            key: `misc_${cleanKey}`,
            content: misconception,
            confidence: 85,
            priority: 2,
            occurrences: 1,
            lastObserved: new Date(),
          },
        }).catch((e) => console.warn("Misconception memory upsert notice:", e));
      }
    }

    // 3. Persist Strengths into LearningMemory
    if (input.strengths && input.strengths.length > 0) {
      for (const strength of input.strengths) {
        const cleanKey = strength
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 50);

        await prisma.learningMemory.upsert({
          where: {
            userId_topic_memoryType_key: {
              userId,
              topic,
              memoryType: "STRENGTH",
              key: `str_${cleanKey}`,
            },
          },
          update: {
            content: strength,
            occurrences: { increment: 1 },
            lastObserved: new Date(),
          },
          create: {
            userId,
            courseId,
            chapterId,
            topic,
            memoryType: "STRENGTH",
            key: `str_${cleanKey}`,
            content: strength,
            confidence: 90,
            priority: 1,
            occurrences: 1,
            lastObserved: new Date(),
          },
        }).catch((e) => console.warn("Strength memory upsert notice:", e));
      }
    }

    // 4. Fetch All Learning Events for this Topic to Recompute Mastery
    const events = await prisma.learningEvent.findMany({
      where: {
        userId,
        courseId,
        topic,
      },
      orderBy: { createdAt: "asc" },
    });

    const understandingScores: number[] = [];
    const assessmentScores: number[] = [];
    const codingScores: number[] = [];
    const recentScores: number[] = [];

    for (const ev of events) {
      try {
        const meta = ev.metadata ? JSON.parse(ev.metadata) : {};
        const score = typeof meta.score === "number" ? meta.score : null;
        if (score === null) continue;

        recentScores.push(score);

        if (ev.eventType.includes("CHECKPOINT") || ev.eventType.includes("TEACH_AGAIN")) {
          understandingScores.push(score);
        } else if (ev.eventType.includes("QUIZ") || ev.eventType.includes("ASSESSMENT")) {
          assessmentScores.push(score);
        } else if (ev.eventType.includes("CODING")) {
          codingScores.push(score);
        }
      } catch {}
    }

    // Fetch previous TopicProgress record if exists
    const previousRecord = await prisma.topicProgress.findUnique({
      where: {
        userId_chapterId_topic: {
          userId,
          chapterId,
          topic,
        },
      },
    });

    const activeMemories = await prisma.learningMemory.findMany({
      where: {
        userId,
        topic,
        isActive: true,
      },
    });

    const activeMisconceptions = activeMemories
      .filter((m) => m.memoryType === "MISTAKE" || m.memoryType === "STRUGGLE")
      .map((m) => m.content);

    const activeStrengths = activeMemories
      .filter((m) => m.memoryType === "STRENGTH" || m.memoryType === "MASTERY")
      .map((m) => m.content);

    // Run Centralized Mastery Calculation
    const masteryResult = calculateTopicMastery({
      understandingScores,
      assessmentScores,
      codingScores,
      recentScores: recentScores.slice(-5),
      teachAgainCount: (previousRecord?.reteachCount ?? 0) + (input.reteachCount ? 1 : 0),
      repeatedMistakesCount: activeMisconceptions.length,
      previousMastery: previousRecord?.masteryScore,
      previousLevel: previousRecord?.masteryLevel as StudentMasteryLevel,
    });

    // 5. Update TopicProgress Record in Database
    const progressStatus =
      masteryResult.level === "ADVANCED"
        ? "MASTERED"
        : masteryResult.level === "STRONG"
        ? "PRACTICED"
        : masteryResult.level === "DEVELOPING"
        ? "LEARNING"
        : "NEEDS_REVIEW";

    await prisma.topicProgress.upsert({
      where: {
        userId_chapterId_topic: {
          userId,
          chapterId,
          topic,
        },
      },
      update: {
        status: progressStatus,
        masteryScore: masteryResult.masteryScore,
        masteryLevel: masteryResult.level,
        recommendedDifficulty: masteryResult.recommendedDifficulty,
        understandingScore: masteryResult.evidenceBreakdown.understandingScore,
        assessmentScore: masteryResult.evidenceBreakdown.assessmentScore,
        codingScore: masteryResult.evidenceBreakdown.codingScore,
        recentPerformance: masteryResult.evidenceBreakdown.recentPerformance,
        consistencyScore: masteryResult.evidenceBreakdown.consistencyScore,
        evidenceCount: masteryResult.evidenceBreakdown.evidenceCount,
        reteachCount: masteryResult.evidenceBreakdown.teachAgainCount,
        strengths: JSON.stringify(activeStrengths.slice(0, 10)),
        weaknesses: JSON.stringify(input.missingConcepts || []),
        misconceptions: JSON.stringify(activeMisconceptions.slice(0, 10)),
        lastEvaluated: new Date(),
        lastActivity: new Date(),
        attempts: { increment: 1 },
        correctAnswers: (input.correct ?? input.score >= 70) ? { increment: 1 } : undefined,
        totalQuestions: { increment: 1 },
      },
      create: {
        userId,
        courseId,
        chapterId,
        topic,
        status: progressStatus,
        masteryScore: masteryResult.masteryScore,
        masteryLevel: masteryResult.level,
        recommendedDifficulty: masteryResult.recommendedDifficulty,
        understandingScore: masteryResult.evidenceBreakdown.understandingScore,
        assessmentScore: masteryResult.evidenceBreakdown.assessmentScore,
        codingScore: masteryResult.evidenceBreakdown.codingScore,
        recentPerformance: masteryResult.evidenceBreakdown.recentPerformance,
        consistencyScore: masteryResult.evidenceBreakdown.consistencyScore,
        evidenceCount: masteryResult.evidenceBreakdown.evidenceCount,
        reteachCount: input.reteachCount ? 1 : 0,
        strengths: JSON.stringify(activeStrengths.slice(0, 10)),
        weaknesses: JSON.stringify(input.missingConcepts || []),
        misconceptions: JSON.stringify(activeMisconceptions.slice(0, 10)),
        lastEvaluated: new Date(),
        lastActivity: new Date(),
        attempts: 1,
        correctAnswers: (input.correct ?? input.score >= 70) ? 1 : 0,
        totalQuestions: 1,
      },
    });

    const topicProfile: TopicLearningProfile = {
      userId,
      courseId,
      language: courseId,
      chapterId,
      topic,
      masteryScore: masteryResult.masteryScore,
      level: masteryResult.level,
      recommendedDifficulty: masteryResult.recommendedDifficulty,
      confidence: masteryResult.confidence,
      evidenceBreakdown: masteryResult.evidenceBreakdown,
      strengths: activeStrengths,
      weaknesses: input.missingConcepts || [],
      misconceptions: activeMisconceptions,
      recentTrend: masteryResult.recentTrend,
      lastEvaluated: new Date().toISOString(),
    };

    return { success: true, profile: topicProfile };
  } catch (error) {
    console.error("Failed to record student evidence:", error);
    return { success: false };
  }
}

/**
 * Record coding performance safely.
 * Environment / compiler missing errors are strictly ignored to protect student mastery.
 */
export async function recordCodingEvidence(params: {
  userId?: string;
  userEmail?: string;
  course: string;
  chapterId?: string;
  topic: string;
  testCasesPassed: number;
  totalTestCases: number;
  success: boolean;
  compileError?: string | null;
  infrastructureError?: boolean;
}): Promise<{ recorded: boolean; reason?: string }> {
  // 1. Infrastructure Protection Rule
  if (params.infrastructureError) {
    return {
      recorded: false,
      reason: "Infrastructure error detected; student coding mastery preserved without penalty.",
    };
  }

  const compileErr = (params.compileError || "").toLowerCase();
  if (
    compileErr.includes("is not recognized as an internal or external command") ||
    compileErr.includes("command not found") ||
    compileErr.includes("g++") ||
    compileErr.includes("gcc") ||
    compileErr.includes("javac") ||
    compileErr.includes("python: not found")
  ) {
    return {
      recorded: false,
      reason: "Compiler/runtime unavailable in environment; student coding mastery preserved.",
    };
  }

  // 2. Compute Score from Test Cases
  let score = 50;
  if (params.totalTestCases > 0) {
    score = Math.round((params.testCasesPassed / params.totalTestCases) * 100);
  } else if (params.success) {
    score = 100;
  } else if (params.compileError) {
    score = 30;
  }

  const result = await recordStudentEvidence({
    userId: params.userId || "",
    userEmail: params.userEmail,
    course: params.course,
    chapterId: params.chapterId,
    topic: params.topic,
    source: "CODING",
    score,
    testCasesPassed: params.testCasesPassed,
    totalTestCases: params.totalTestCases,
    summary: `Coding exercise on ${params.topic}: ${params.testCasesPassed}/${params.totalTestCases} test cases passed.`,
  });

  return { recorded: result.success };
}

/**
 * Get Topic-Level Learning Profile
 */
export async function getTopicLearningProfile(
  userIdOrEmail: string,
  course: string,
  topic: string
): Promise<TopicLearningProfile | null> {
  try {
    const isEmail = userIdOrEmail.includes("@");
    const userId = isEmail
      ? (await prisma.user.findUnique({ where: { email: userIdOrEmail }, select: { id: true } }))?.id
      : userIdOrEmail;

    if (!userId) return null;

    const courseId = normalizeLanguage(course);
    const progress = await prisma.topicProgress.findFirst({
      where: {
        userId,
        courseId,
        topic: {
          contains: topic.replace(/^[\d\.\-\s:]+/, "").trim(),
        },
      },
    });

    if (!progress) return null;

    const memories = await prisma.learningMemory.findMany({
      where: { userId, topic: progress.topic, isActive: true },
    });

    const misconceptions = memories
      .filter((m) => m.memoryType === "MISTAKE" || m.memoryType === "STRUGGLE")
      .map((m) => m.content);

    const strengths = memories
      .filter((m) => m.memoryType === "STRENGTH" || m.memoryType === "MASTERY")
      .map((m) => m.content);

    let weaknesses: string[] = [];
    try {
      if (progress.weaknesses) weaknesses = JSON.parse(progress.weaknesses);
    } catch {}

    return {
      userId,
      courseId,
      language: courseId,
      chapterId: progress.chapterId,
      topic: progress.topic,
      masteryScore: progress.masteryScore,
      level: (progress.masteryLevel as StudentMasteryLevel) || "NOT_ENOUGH_DATA",
      recommendedDifficulty: (progress.recommendedDifficulty as any) || "INTERMEDIATE",
      confidence: progress.evidenceCount >= 4 ? 0.85 : progress.evidenceCount >= 2 ? 0.65 : 0.3,
      evidenceBreakdown: {
        understandingScore: Math.round(progress.understandingScore ?? progress.masteryScore),
        assessmentScore: Math.round(progress.assessmentScore ?? progress.masteryScore),
        codingScore: Math.round(progress.codingScore ?? progress.masteryScore),
        recentPerformance: Math.round(progress.recentPerformance ?? progress.masteryScore),
        consistencyScore: Math.round(progress.consistencyScore ?? 75),
        evidenceCount: progress.evidenceCount,
        teachAgainCount: progress.reteachCount,
        repeatedMistakesCount: misconceptions.length,
      },
      strengths,
      weaknesses,
      misconceptions,
      recentTrend: progress.masteryScore >= 75 ? "Improving" : "Stable",
      lastEvaluated: progress.lastEvaluated?.toISOString() || progress.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Failed to get topic profile:", error);
    return null;
  }
}

/**
 * Get Language-Level Learning Profile (e.g. Java, Python, C, C++)
 */
export async function getLanguageLearningProfile(
  userIdOrEmail: string,
  language: string
): Promise<LanguageLearningProfile | null> {
  try {
    const isEmail = userIdOrEmail.includes("@");
    const userId = isEmail
      ? (await prisma.user.findUnique({ where: { email: userIdOrEmail }, select: { id: true } }))?.id
      : userIdOrEmail;

    if (!userId) return null;

    const normLang = normalizeLanguage(language);
    const records = await prisma.topicProgress.findMany({
      where: { userId, courseId: normLang },
    });

    const topics: Record<string, TopicLearningProfile> = {};
    const strongTopics: string[] = [];
    const developingTopics: string[] = [];
    const needsSupportTopics: string[] = [];

    let totalScore = 0;
    for (const r of records) {
      totalScore += r.masteryScore;
      const lvl = (r.masteryLevel as StudentMasteryLevel) || "NOT_ENOUGH_DATA";

      if (lvl === "ADVANCED" || lvl === "STRONG") {
        strongTopics.push(r.topic);
      } else if (lvl === "DEVELOPING") {
        developingTopics.push(r.topic);
      } else if (lvl === "NEEDS_SUPPORT") {
        needsSupportTopics.push(r.topic);
      }

      topics[r.topic] = {
        userId,
        courseId: normLang,
        language: normLang,
        chapterId: r.chapterId,
        topic: r.topic,
        masteryScore: r.masteryScore,
        level: lvl,
        recommendedDifficulty: (r.recommendedDifficulty as any) || "INTERMEDIATE",
        confidence: r.evidenceCount >= 4 ? 0.85 : 0.5,
        evidenceBreakdown: {
          understandingScore: Math.round(r.understandingScore ?? r.masteryScore),
          assessmentScore: Math.round(r.assessmentScore ?? r.masteryScore),
          codingScore: Math.round(r.codingScore ?? r.masteryScore),
          recentPerformance: Math.round(r.recentPerformance ?? r.masteryScore),
          consistencyScore: Math.round(r.consistencyScore ?? 75),
          evidenceCount: r.evidenceCount,
          teachAgainCount: r.reteachCount,
          repeatedMistakesCount: 0,
        },
        strengths: [],
        weaknesses: [],
        misconceptions: [],
        recentTrend: "Stable",
        lastEvaluated: r.lastEvaluated?.toISOString() || r.updatedAt.toISOString(),
      };
    }

    const avgMastery = records.length > 0 ? Math.round(totalScore / records.length) : 0;
    let overallLevel: StudentMasteryLevel = "NOT_ENOUGH_DATA";
    if (records.length >= 2) {
      if (avgMastery >= 90) overallLevel = "ADVANCED";
      else if (avgMastery >= 75) overallLevel = "STRONG";
      else if (avgMastery >= 50) overallLevel = "DEVELOPING";
      else overallLevel = "NEEDS_SUPPORT";
    }

    const mistakes = await prisma.learningMemory.findMany({
      where: { userId, courseId: normLang, memoryType: "MISTAKE", isActive: true },
      take: 5,
      select: { content: true },
    });

    let recommendedNextStep = "Continue sequential curriculum learning.";
    if (needsSupportTopics.length > 0) {
      recommendedNextStep = `Practice core foundations of ${needsSupportTopics.slice(0, 2).join(", ")} before advancing.`;
    } else if (strongTopics.length > 0) {
      recommendedNextStep = `Excellent progress! Ready for advanced challenges and complex practice.`;
    }

    return {
      language: normLang,
      overallLevel,
      averageMastery: avgMastery,
      topicsCount: records.length,
      topics,
      strongTopics,
      developingTopics,
      needsSupportTopics,
      recentMistakes: mistakes.map((m) => m.content),
      recommendedNextStep,
    };
  } catch (error) {
    console.error("Failed to get language profile:", error);
    return null;
  }
}

/**
 * Get Comprehensive Multi-Language Student Profile
 */
export async function getStudentFullProfile(
  userIdOrEmail: string
): Promise<StudentLearningProfile | null> {
  try {
    const isEmail = userIdOrEmail.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: userIdOrEmail } : { id: userIdOrEmail },
      select: { id: true, email: true, name: true },
    });

    if (!user) return null;

    const languagesList = ["java", "python", "c", "cpp"];
    const languageProfiles: Record<string, LanguageLearningProfile> = {};

    let totalTopics = 0;
    let totalEvidence = 0;
    let totalScoreSum = 0;

    for (const lang of languagesList) {
      const p = await getLanguageLearningProfile(user.id, lang);
      if (p && p.topicsCount > 0) {
        languageProfiles[lang] = p;
        totalTopics += p.topicsCount;
        totalScoreSum += p.averageMastery * p.topicsCount;
        for (const t of Object.values(p.topics)) {
          totalEvidence += t.evidenceBreakdown.evidenceCount;
        }
      }
    }

    const overallAvg = totalTopics > 0 ? Math.round(totalScoreSum / totalTopics) : 0;
    let overallLevel: StudentMasteryLevel = "NOT_ENOUGH_DATA";
    if (totalEvidence >= 3) {
      if (overallAvg >= 90) overallLevel = "ADVANCED";
      else if (overallAvg >= 75) overallLevel = "STRONG";
      else if (overallAvg >= 50) overallLevel = "DEVELOPING";
      else overallLevel = "NEEDS_SUPPORT";
    }

    return {
      userId: user.id,
      userEmail: user.email,
      studentName: user.name,
      overallLevel,
      languages: languageProfiles,
      summaryEvidence: {
        totalTopicsEvaluated: totalTopics,
        totalEvidenceCount: totalEvidence,
        dominantLevel: overallLevel,
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to get student full profile:", error);
    return null;
  }
}
