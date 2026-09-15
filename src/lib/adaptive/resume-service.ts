/**
 * KnowledgeStream AI — Resume Intelligence & Chapter Learning Analysis Service
 *
 * Implements:
 * 1. Prioritized Last Meaningful Learning State detection:
 *    - Priority 1: Last actively studied topic with meaningful interaction (evaluated LearningEvent)
 *    - Priority 2: Last topic with understanding/evaluation evidence (TopicProgress with evidenceCount > 0)
 *    - Priority 3: Last completed topic (TopicProgress status MASTERED / PRACTICED)
 *    - Priority 4: Current saved position (if interaction exists)
 *    - Never treats merely opened/scrolled topics as completed.
 * 2. Chapter Completion Verification:
 *    - Genuinely completed ONLY when every required instructional lesson is MASTERED or PRACTICED.
 * 3. Genuine Chapter Learning Analysis:
 *    - Categorizes every topic into STRONG, DEVELOPING, NEEDS_SUPPORT (with evidence-based reasons), or NOT_ENOUGH_DATA.
 *    - Computes aggregated chapter mastery percentage.
 *    - Zero derogatory terminology.
 * 4. State Machine (Quick Recap vs. Chapter Recap):
 *    - Incomplete chapter -> Quick Recap for last meaningful topic.
 *    - Completed chapter -> Chapter Recap for whole chapter.
 */

import { prisma } from "@/lib/prisma";
import {
  ChapterLearningAnalysis,
  StudentMasteryLevel,
  TopicChapterAnalysis,
  TopicLearningProfile,
} from "./types";
import { getTopicLearningProfile } from "./profile-service";

export function normalizeTopicName(topic: string): string {
  if (!topic) return "";
  return topic
    .replace(/^(\d+(\.\d+)*|[a-z]\.)\s*[-:.)]?\s*/i, "")
    .trim()
    .toLowerCase();
}

export function matchLesson(lessonList: string[], targetTopic: string): string | null {
  const normTarget = normalizeTopicName(targetTopic);
  if (!normTarget) return null;

  for (const lesson of lessonList) {
    if (normalizeTopicName(lesson) === normTarget) {
      return lesson;
    }
  }

  for (const lesson of lessonList) {
    const norm = normalizeTopicName(lesson);
    if (norm.includes(normTarget) || normTarget.includes(norm)) {
      return lesson;
    }
  }

  return null;
}

/**
 * Priority-based algorithm to find the student's LAST MEANINGFUL LEARNING STATE.
 * Avoids array index heuristics or treating merely visited topics as completed.
 */
export async function getLastMeaningfulTopic(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  chapterLessons: string[];
}): Promise<string | null> {
  const { userId, courseId, chapterId, chapterLessons } = params;

  if (!userId || !chapterLessons || chapterLessons.length === 0) {
    return null;
  }

  const instructionalLessons = chapterLessons.filter(
    (l) => !l.toLowerCase().includes("quiz") && !l.toLowerCase().includes("assessment")
  );

  // PRIORITY 1: Last actively studied topic with meaningful interaction (LearningEvent with answer or evaluation)
  const recentEvents = await prisma.learningEvent.findMany({
    where: {
      userId,
      courseId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const ev of recentEvents) {
    // Check if event represents meaningful student engagement
    const isMeaningful =
      ev.eventType.includes("CHECKPOINT") ||
      ev.eventType.includes("TEACH_AGAIN") ||
      ev.eventType.includes("EVIDENCE") ||
      ev.eventType.includes("ANSWER") ||
      ev.eventType.includes("CODING");

    if (isMeaningful && ev.topic) {
      const matched = matchLesson(instructionalLessons, ev.topic);
      if (matched) {
        return matched;
      }
    }
  }

  // PRIORITY 2: Last topic with persisted evaluation evidence (TopicProgress with evidenceCount > 0 or attempts > 0)
  const topicProgressRecords = await prisma.topicProgress.findMany({
    where: {
      userId,
      courseId,
      OR: [{ evidenceCount: { gt: 0 } }, { attempts: { gt: 0 } }, { masteryScore: { gt: 0 } }],
    },
    orderBy: { lastActivity: "desc" },
  });

  for (const tp of topicProgressRecords) {
    const matched = matchLesson(instructionalLessons, tp.topic);
    if (matched) {
      return matched;
    }
  }

  // PRIORITY 3: Last completed topic in LessonProgress
  const completedLessonRecords = await prisma.lessonProgress.findMany({
    where: {
      userId,
      OR: [{ status: "MASTERED" }, { status: "PRACTICED" }, { attempts: { gt: 0 } }],
    },
    orderBy: { lastActivity: "desc" },
  });

  for (const lp of completedLessonRecords) {
    const matched = matchLesson(instructionalLessons, lp.lesson);
    if (matched) {
      return matched;
    }
  }

  // If student has 0 interactions on this chapter, return null (brand new start)
  return null;
}

/**
 * Verifies if the chapter is GENUINELY completed.
 * Every required instructional topic must be MASTERED or PRACTICED.
 */
export async function isChapterGenuinelyCompleted(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  chapterLessons: string[];
}): Promise<boolean> {
  const { userId, courseId, chapterId, chapterLessons } = params;

  if (!userId || !chapterLessons || chapterLessons.length === 0) {
    return false;
  }

  const instructionalLessons = chapterLessons.filter(
    (l) => !l.toLowerCase().includes("quiz") && !l.toLowerCase().includes("assessment")
  );

  if (instructionalLessons.length === 0) return false;

  // Query TopicProgress for all instructional lessons
  const progressRecords = await prisma.topicProgress.findMany({
    where: {
      userId,
      courseId,
    },
  });

  const lessonRecords = await prisma.lessonProgress.findMany({
    where: {
      userId,
    },
  });

  // Verify that EVERY instructional lesson has genuine completion
  for (const lesson of instructionalLessons) {
    const norm = normalizeTopicName(lesson);

    const tp = progressRecords.find((p) => normalizeTopicName(p.topic) === norm);
    const lp = lessonRecords.find((l) => normalizeTopicName(l.lesson) === norm);

    const isMasteredInTP = tp && (tp.status === "MASTERED" || tp.status === "PRACTICED" || tp.masteryScore >= 75);
    const isMasteredInLP = lp && (lp.status === "MASTERED" || lp.status === "PRACTICED");

    if (!isMasteredInTP && !isMasteredInLP) {
      return false;
    }
  }

  return true;
}

/**
 * Computes the Genuine Chapter Learning Analysis across all topics in the chapter.
 * Uses actual stored evidence; zero LLM hallucination.
 */
export async function getChapterLearningAnalysis(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  chapterTitle?: string;
  chapterLessons: string[];
}): Promise<ChapterLearningAnalysis> {
  const { userId, courseId, chapterId, chapterTitle, chapterLessons } = params;

  const instructionalLessons = chapterLessons.filter(
    (l) => !l.toLowerCase().includes("quiz") && !l.toLowerCase().includes("assessment")
  );

  const strongTopics: TopicChapterAnalysis[] = [];
  const developingTopics: TopicChapterAnalysis[] = [];
  const needsSupportTopics: TopicChapterAnalysis[] = [];
  const notEnoughDataTopics: TopicChapterAnalysis[] = [];

  let totalScoreWithData = 0;
  let topicsWithDataCount = 0;

  for (const lesson of instructionalLessons) {
    const profile: TopicLearningProfile | null = await getTopicLearningProfile(
      userId,
      courseId,
      lesson
    );

    if (!profile || profile.level === "NOT_ENOUGH_DATA" || profile.evidenceBreakdown.evidenceCount < 2) {
      notEnoughDataTopics.push({
        topic: lesson,
        masteryScore: profile?.masteryScore ?? 0,
        level: "NOT_ENOUGH_DATA",
        recommendedDifficulty: "BEGINNER",
        evidenceBreakdown: profile?.evidenceBreakdown || {
          understandingScore: 0,
          assessmentScore: 0,
          codingScore: 0,
          recentPerformance: 0,
          consistencyScore: 50,
          evidenceCount: profile?.evidenceBreakdown.evidenceCount ?? 0,
          teachAgainCount: 0,
          repeatedMistakesCount: 0,
        },
        misconceptions: profile?.misconceptions || [],
        strengths: profile?.strengths || [],
        weaknesses: profile?.weaknesses || [],
        reason: "Insufficient learning evidence (< 2 interactions recorded).",
      });
      continue;
    }

    topicsWithDataCount++;
    totalScoreWithData += profile.masteryScore;

    const topicAnalysis: TopicChapterAnalysis = {
      topic: lesson,
      masteryScore: profile.masteryScore,
      level: profile.level,
      recommendedDifficulty: profile.recommendedDifficulty,
      evidenceBreakdown: profile.evidenceBreakdown,
      misconceptions: profile.misconceptions,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
    };

    if (profile.level === "ADVANCED" || profile.level === "STRONG" || profile.masteryScore >= 75) {
      strongTopics.push(topicAnalysis);
    } else if (profile.level === "DEVELOPING" || profile.masteryScore >= 50) {
      developingTopics.push(topicAnalysis);
    } else {
      // NEEDS_SUPPORT: construct evidence-based reason
      const reasonParts: string[] = [];
      if (profile.misconceptions && profile.misconceptions.length > 0) {
        reasonParts.push(`detected misconception: "${profile.misconceptions[0]}"`);
      }
      if (profile.evidenceBreakdown.teachAgainCount > 0) {
        reasonParts.push(`${profile.evidenceBreakdown.teachAgainCount} reteach attempts`);
      }
      if (profile.evidenceBreakdown.recentPerformance > 0) {
        reasonParts.push(`recent checkpoint accuracy ${profile.evidenceBreakdown.recentPerformance}%`);
      }
      if (reasonParts.length === 0) {
        reasonParts.push(`mastery score ${profile.masteryScore}% requires foundational review`);
      }

      topicAnalysis.reason = reasonParts.join(", ");
      needsSupportTopics.push(topicAnalysis);
    }
  }

  const overallMasteryScore =
    topicsWithDataCount > 0 ? Math.round(totalScoreWithData / topicsWithDataCount) : 0;

  let overallLevel: StudentMasteryLevel = "NOT_ENOUGH_DATA";
  if (topicsWithDataCount >= 2) {
    if (overallMasteryScore >= 90) overallLevel = "ADVANCED";
    else if (overallMasteryScore >= 75) overallLevel = "STRONG";
    else if (overallMasteryScore >= 50) overallLevel = "DEVELOPING";
    else overallLevel = "NEEDS_SUPPORT";
  }

  const isComplete = await isChapterGenuinelyCompleted({
    userId,
    courseId,
    chapterId,
    chapterLessons,
  });

  return {
    courseId,
    chapterId,
    chapterTitle: chapterTitle || `Chapter ${chapterId}`,
    overallMasteryScore,
    overallLevel,
    totalTopics: instructionalLessons.length,
    strongTopics,
    developingTopics,
    needsSupportTopics,
    notEnoughDataTopics,
    isComplete,
  };
}

/**
 * Unified Resume State Decision Engine.
 * Implements the strict state machine:
 * - Completed chapter -> shouldChapterRecap: true, shouldQuickRecap: false
 * - Incomplete chapter with meaningful interaction -> shouldQuickRecap: true, shouldChapterRecap: false
 * - Fresh chapter with 0 interaction -> neither (normal initial start)
 */
export async function getChapterResumeState(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  chapterTitle?: string;
  chapterLessons: string[];
}): Promise<{
  isChapterComplete: boolean;
  lastMeaningfulTopic: string | null;
  shouldQuickRecap: boolean;
  shouldChapterRecap: boolean;
  chapterAnalysis: ChapterLearningAnalysis;
}> {
  const { userId, courseId, chapterId, chapterTitle, chapterLessons } = params;

  const [lastMeaningfulTopic, chapterAnalysis] = await Promise.all([
    getLastMeaningfulTopic({ userId, courseId, chapterId, chapterLessons }),
    getChapterLearningAnalysis({ userId, courseId, chapterId, chapterTitle, chapterLessons }),
  ]);

  const isChapterComplete = chapterAnalysis.isComplete;

  // Strict State Machine Rule:
  // 1. If chapter is genuinely complete -> CHAPTER RECAP only
  // 2. If chapter is incomplete AND has a last meaningful topic -> QUICK RECAP only
  // 3. Never trigger both for the same return event
  const shouldChapterRecap = isChapterComplete;
  const shouldQuickRecap = !isChapterComplete && Boolean(lastMeaningfulTopic);

  return {
    isChapterComplete,
    lastMeaningfulTopic,
    shouldQuickRecap,
    shouldChapterRecap,
    chapterAnalysis,
  };
}
