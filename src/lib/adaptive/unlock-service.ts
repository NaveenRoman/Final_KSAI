/**
 * KnowledgeStream AI — Strict Chapter Unlock & Sequential Progression Service
 *
 * Enforces:
 * 1. Sequential Progression:
 *    - Chapter 1: UNLOCKED by default according to existing enrollment/course rules.
 *    - Chapter 2: LOCKED until Chapter 1 satisfies ALL completion requirements.
 *    - Chapter 3: LOCKED until Chapter 2 satisfies ALL completion requirements.
 *    - ... through to the Final Chapter.
 * 2. Strict Chapter Completion Gate (All 3 required):
 *    - Gate A: ALL instructional topics/lessons are MASTERED or PRACTICED.
 *    - Gate B: Required Chapter Recap is completed.
 *    - Gate C: Chapter Quiz is PASSED (score >= 75%).
 * 3. Server-Side Security:
 *    - Direct URL access to locked chapters is blocked.
 *    - Protected content is stripped for locked chapters.
 * 4. Zero Derogatory Terminology.
 */

import { prisma } from "@/lib/prisma";
import { normalizeTopicName } from "./resume-service";

export const QUIZ_PASS_THRESHOLD = 75;

export interface ChapterCompletionRequirements {
  topicsCompleted: boolean;
  totalTopics: number;
  completedTopicsCount: number;
  chapterRecapCompleted: boolean;
  quizPassed: boolean;
  quizScore: number;
  minPassingScore: number;
}

export interface ChapterCompletionResult {
  chapterId: string;
  orderNumber: number;
  title: string;
  isCompleted: boolean;
  requirements: ChapterCompletionRequirements;
  missingRequirements: string[];
}

export interface ChapterUnlockResult {
  chapterId: string;
  orderNumber: number;
  title: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  lockReason?: "PREVIOUS_CHAPTER_INCOMPLETE" | "ENROLLMENT_REQUIRED" | "NONE";
  previousChapter?: {
    id: string;
    orderNumber: number;
    title: string;
    isCompleted: boolean;
    requirements: ChapterCompletionRequirements;
  };
  requirements: ChapterCompletionRequirements;
  quizStatus: {
    hasTaken: boolean;
    score: number;
    passed: boolean;
    minPassingScore: number;
  };
  isFinalChapter: boolean;
  isCourseCompleted: boolean;
}

/**
 * Normalizes course identifier into language slug.
 */
function normalizeCourseSlug(slugOrId: string): string {
  const s = slugOrId.toLowerCase().trim();
  if (s.includes("python")) return "python";
  if (s.includes("java")) return "java";
  if (s === "c" || s.startsWith("c_") || s.startsWith("c-")) return "c";
  if (s.includes("cpp") || s.includes("c++")) return "cpp";
  return s;
}

/**
 * Checks if a chapter satisfies ALL 3 completion requirements:
 * Gate A: Topics completed
 * Gate B: Chapter recap completed
 * Gate C: Quiz passed (>= 75%)
 */
export async function checkChapterCompletion(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  chapterLessons?: string[];
}): Promise<ChapterCompletionResult> {
  const { userId, courseId, chapterId, chapterLessons } = params;

  // 1. Resolve Course
  const courseSlug = normalizeCourseSlug(courseId);
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { language: courseSlug }],
    },
    include: {
      chapters: {
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!course) {
    throw new Error(`Course not found for identifier: ${courseId}`);
  }

  // 2. Resolve Chapter
  const parsedOrder = parseInt(chapterId.replace(/[^0-9]/g, ""), 10);
  const chapter = course.chapters.find(
    (c) =>
      c.id === chapterId ||
      (!isNaN(parsedOrder) && c.orderNumber === parsedOrder)
  );

  if (!chapter) {
    throw new Error(`Chapter not found for identifier: ${chapterId}`);
  }

  // 3. Resolve Instructional Lessons
  let lessons = chapterLessons || [];
  if (lessons.length === 0) {
    try {
      const { extractChapterTopics } = await import("@/lib/progression");
      lessons = extractChapterTopics(course.language, chapter.orderNumber, chapter.explanation);
    } catch {
      lessons = [];
    }
  }

  const instructionalLessons = lessons.filter(
    (l) => !l.toLowerCase().includes("quiz") && !l.toLowerCase().includes("assessment")
  );

  // -------------------------------------------------------------------------
  // Gate A: Verify all instructional topics are MASTERED / PRACTICED
  // -------------------------------------------------------------------------
  let completedTopicsCount = 0;
  const topicProgressRecords = await prisma.topicProgress.findMany({
    where: {
      userId,
      courseId: course.language,
    },
  });

  const lessonProgressRecords = await prisma.lessonProgress.findMany({
    where: {
      userId,
      chapterId: chapter.id,
    },
  });

  for (const lesson of instructionalLessons) {
    const norm = normalizeTopicName(lesson);
    const tp = topicProgressRecords.find((p) => normalizeTopicName(p.topic) === norm);
    const lp = lessonProgressRecords.find((l) => normalizeTopicName(l.lesson) === norm);

    const isMasteredInTP = tp && (tp.status === "MASTERED" || tp.status === "PRACTICED" || tp.masteryScore >= 75);
    const isMasteredInLP = lp && (lp.status === "MASTERED" || lp.status === "PRACTICED");

    if (isMasteredInTP || isMasteredInLP) {
      completedTopicsCount++;
    }
  }

  const topicsCompleted =
    instructionalLessons.length === 0 || completedTopicsCount >= instructionalLessons.length;

  // -------------------------------------------------------------------------
  // Gate B: Verify Chapter Recap is completed
  // -------------------------------------------------------------------------
  const recapRecord = await prisma.chapterRecap.findUnique({
    where: {
      userId_chapterId: {
        userId,
        chapterId: chapter.id,
      },
    },
  });

  const recapEvent = await prisma.learningEvent.findFirst({
    where: {
      userId,
      courseId: course.language,
      chapterId: chapter.id,
      eventType: { in: ["CHAPTER_RECAP_COMPLETED", "CHAPTER_RECAP"] },
    },
  });

  const recapNote = await prisma.learningNote.findFirst({
    where: {
      userId,
      chapterId: chapter.id,
      type: "CHAPTER_RECAP",
    },
  });

  const chapterRecapCompleted = Boolean(recapRecord || recapEvent || recapNote);

  // -------------------------------------------------------------------------
  // Gate C: Verify Chapter Quiz is PASSED (score >= 75%)
  // -------------------------------------------------------------------------
  const chapterProgress = await prisma.chapterProgress.findUnique({
    where: {
      userId_chapterId: {
        userId,
        chapterId: chapter.id,
      },
    },
  });

  // Also check LearningEvents for quiz submissions
  const quizEvents = await prisma.learningEvent.findMany({
    where: {
      userId,
      courseId: course.language,
      chapterId: chapter.id,
      eventType: "EVIDENCE_QUIZ",
    },
  });

  let maxEventScore = 0;
  for (const qe of quizEvents) {
    try {
      const meta = qe.metadata ? JSON.parse(qe.metadata) : {};
      if (typeof meta.score === "number" && meta.score > maxEventScore) {
        maxEventScore = meta.score;
      }
    } catch {}
  }

  const quizScore = Math.max(chapterProgress?.quizScore ?? 0, maxEventScore);

  let hasQuizData = false;
  if (chapter.quizData) {
    try {
      const parsed = JSON.parse(chapter.quizData);
      hasQuizData = Array.isArray(parsed) && parsed.length > 0;
    } catch {}
  }

  // If chapter has quiz questions, quiz must meet pass threshold
  const quizPassed = hasQuizData ? quizScore >= QUIZ_PASS_THRESHOLD : true;

  // -------------------------------------------------------------------------
  // Overall Chapter Completion Decision
  // -------------------------------------------------------------------------
  const isCompleted = topicsCompleted && chapterRecapCompleted && quizPassed;

  const missingRequirements: string[] = [];
  if (!topicsCompleted) {
    missingRequirements.push(
      `Topics incomplete (${completedTopicsCount}/${instructionalLessons.length} mastered)`
    );
  }
  if (!chapterRecapCompleted) {
    missingRequirements.push("Chapter Recap has not been completed");
  }
  if (!quizPassed) {
    missingRequirements.push(
      `Chapter Quiz not passed (score: ${quizScore}%, required: ${QUIZ_PASS_THRESHOLD}%)`
    );
  }

  // Authoritatively synchronize ChapterProgress in database
  if (isCompleted) {
    if (!chapterProgress || !chapterProgress.isCompleted) {
      await prisma.chapterProgress.upsert({
        where: {
          userId_chapterId: {
            userId,
            chapterId: chapter.id,
          },
        },
        update: {
          isCompleted: true,
          quizScore: Math.max(quizScore, QUIZ_PASS_THRESHOLD),
        },
        create: {
          userId,
          chapterId: chapter.id,
          isCompleted: true,
          quizScore: Math.max(quizScore, QUIZ_PASS_THRESHOLD),
        },
      });
    }
  } else {
    // If not completed, cure any legacy false completions
    if (chapterProgress?.isCompleted) {
      await prisma.chapterProgress.update({
        where: { id: chapterProgress.id },
        data: { isCompleted: false },
      });
    }
  }

  return {
    chapterId: chapter.id,
    orderNumber: chapter.orderNumber,
    title: chapter.title,
    isCompleted,
    requirements: {
      topicsCompleted,
      totalTopics: instructionalLessons.length,
      completedTopicsCount,
      chapterRecapCompleted,
      quizPassed,
      quizScore,
      minPassingScore: QUIZ_PASS_THRESHOLD,
    },
    missingRequirements,
  };
}

/**
 * Authoritative Server-Side Chapter Unlock Resolver
 * Determines whether a given chapter is unlocked or locked.
 */
export async function getChapterUnlockStatus(params: {
  userId: string;
  courseSlug: string;
  chapterOrderOrId: number | string;
}): Promise<ChapterUnlockResult> {
  const { userId, courseSlug, chapterOrderOrId } = params;
  const normSlug = normalizeCourseSlug(courseSlug);

  // 1. Fetch Course & Ordered Chapters
  const course = await prisma.course.findFirst({
    where: { language: normSlug },
    include: {
      chapters: {
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!course) {
    throw new Error(`Course not found: ${courseSlug}`);
  }

  // 2. Identify Target Chapter
  const parsedOrder =
    typeof chapterOrderOrId === "number"
      ? chapterOrderOrId
      : parseInt(chapterOrderOrId.replace(/[^0-9]/g, ""), 10);

  const currentChapter =
    course.chapters.find(
      (c) =>
        c.id === chapterOrderOrId ||
        (!isNaN(parsedOrder) && c.orderNumber === parsedOrder)
    ) || course.chapters[0];

  const currentIdx = course.chapters.findIndex((c) => c.id === currentChapter.id);

  // 3. Check Course Enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: course.id,
    },
  });
  const isEnrolled = Boolean(enrollment);

  // 4. Compute Current Chapter Completion Status
  const currentCompletion = await checkChapterCompletion({
    userId,
    courseId: course.id,
    chapterId: currentChapter.id,
  });

  // 5. Compute Sequential Unlock State
  let isUnlocked = false;
  let lockReason: "PREVIOUS_CHAPTER_INCOMPLETE" | "ENROLLMENT_REQUIRED" | "NONE" = "NONE";
  let previousChapterInfo: ChapterUnlockResult["previousChapter"] | undefined;

  // Chapter 0 (Preview): Always unlocked
  if (currentChapter.orderNumber === 0) {
    isUnlocked = true;
  }
  // Chapter 1: Unlocked by default according to existing enrollment/course rules
  else if (currentChapter.orderNumber === 1) {
    isUnlocked = true;
  }
  // Chapter N (N >= 2): Strictly locked until Chapter N-1 is complete
  else {
    // Resolve preceding chapter (by orderNumber or index)
    const prevChapter =
      course.chapters.find((c) => c.orderNumber === currentChapter.orderNumber - 1) ||
      (currentIdx > 0 ? course.chapters[currentIdx - 1] : null);

    if (prevChapter) {
      const prevCompletion = await checkChapterCompletion({
        userId,
        courseId: course.id,
        chapterId: prevChapter.id,
      });

      previousChapterInfo = {
        id: prevChapter.id,
        orderNumber: prevChapter.orderNumber,
        title: prevChapter.title,
        isCompleted: prevCompletion.isCompleted,
        requirements: prevCompletion.requirements,
      };

      if (prevCompletion.isCompleted) {
        isUnlocked = true;
      } else {
        isUnlocked = false;
        lockReason = "PREVIOUS_CHAPTER_INCOMPLETE";
      }
    } else {
      isUnlocked = false;
      lockReason = "PREVIOUS_CHAPTER_INCOMPLETE";
    }
  }

  // 6. Check Final Chapter & Course Completion
  const isFinalChapter = currentIdx === course.chapters.length - 1;
  let isCourseCompleted = false;

  if (isFinalChapter && currentCompletion.isCompleted) {
    isCourseCompleted = true;
    if (enrollment) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress: 100 },
      });
    }
  }

  return {
    chapterId: currentChapter.id,
    orderNumber: currentChapter.orderNumber,
    title: currentChapter.title,
    isUnlocked,
    isCompleted: currentCompletion.isCompleted,
    lockReason: isUnlocked ? "NONE" : lockReason,
    previousChapter: previousChapterInfo,
    requirements: currentCompletion.requirements,
    quizStatus: {
      hasTaken: currentCompletion.requirements.quizScore > 0,
      score: currentCompletion.requirements.quizScore,
      passed: currentCompletion.requirements.quizPassed,
      minPassingScore: QUIZ_PASS_THRESHOLD,
    },
    isFinalChapter,
    isCourseCompleted,
  };
}

/**
 * Returns the complete course chapter unlock hierarchy.
 */
export async function getCourseUnlockHierarchy(
  paramsOrUserId: string | { userId: string; courseSlug: string },
  maybeSlug?: string
): Promise<{ chapters: ChapterUnlockResult[]; isCourseCompleted: boolean }> {
  const userId = typeof paramsOrUserId === "string" ? paramsOrUserId : paramsOrUserId.userId;
  const courseSlug = typeof paramsOrUserId === "string" ? maybeSlug || "python" : paramsOrUserId.courseSlug;
  const normSlug = normalizeCourseSlug(courseSlug);

  const course = await prisma.course.findFirst({
    where: { language: normSlug },
    include: {
      chapters: {
        orderBy: { orderNumber: "asc" },
      },
    },
  });

  if (!course) {
    throw new Error(`Course not found: ${courseSlug}`);
  }

  const results: ChapterUnlockResult[] = [];
  let allCompleted = true;

  for (const ch of course.chapters) {
    const status = await getChapterUnlockStatus({
      userId,
      courseSlug: normSlug,
      chapterOrderOrId: ch.orderNumber,
    });

    results.push(status);
    if (!status.isCompleted) {
      allCompleted = false;
    }
  }

  return {
    chapters: results,
    isCourseCompleted: allCompleted && results.length > 0,
  };
}

/**
 * Authoritatively persists Chapter Recap completion in the database.
 */
export async function recordChapterRecapCompletion(params: {
  userId: string;
  courseId?: string;
  courseSlug?: string;
  chapterId: string;
  summaryText?: string;
  recapSummary?: string;
}): Promise<void> {
  const { userId, chapterId } = params;
  const rawCourse = params.courseId || params.courseSlug || "python";
  const courseSlug = normalizeCourseSlug(rawCourse);

  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: rawCourse }, { language: courseSlug }],
    },
    include: { chapters: true },
  });

  if (!course) return;

  const parsedOrder = parseInt(chapterId.replace(/[^0-9]/g, ""), 10);
  const chapter = course.chapters.find(
    (c) =>
      c.id === chapterId ||
      (!isNaN(parsedOrder) && c.orderNumber === parsedOrder)
  );

  if (!chapter) return;

  const summary =
    params.summaryText ||
    params.recapSummary ||
    `Chapter Recap completed for ${chapter.title}. Core concepts and syntax synthesized.`;

  await prisma.chapterRecap.upsert({
    where: {
      userId_chapterId: {
        userId,
        chapterId: chapter.id,
      },
    },
    update: {
      summary,
      updatedAt: new Date(),
    },
    create: {
      userId,
      courseId: course.id,
      chapterId: chapter.id,
      summary,
      keyConcepts: JSON.stringify([`Core concepts for ${chapter.title}`]),
    },
  });

  await prisma.learningEvent.create({
    data: {
      userId,
      courseId: course.language,
      chapterId: chapter.id,
      topic: chapter.title,
      eventType: "CHAPTER_RECAP_COMPLETED",
      content: `Chapter recap completed for ${chapter.title}`,
      metadata: JSON.stringify({
        chapterId: chapter.id,
        orderNumber: chapter.orderNumber,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  await checkChapterCompletion({
    userId,
    courseId: course.id,
    chapterId: chapter.id,
  });
}
