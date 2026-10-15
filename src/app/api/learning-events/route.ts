import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

async function resolveAuthenticatedUser(request: NextRequest) {
  let sessionData = null;
  try {
    sessionData = await auth.api.getSession({ headers: request.headers });
  } catch {
    try {
      sessionData = await auth.api.getSession({ headers: await headers() });
    } catch {
      // ignore
    }
  }

  let user = sessionData?.user as any;

  if (!user) {
    let sessionTokenRaw =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("sessionToken")?.value;

    if (!sessionTokenRaw) {
      try {
        const cookieStore = await cookies();
        sessionTokenRaw =
          cookieStore.get("better-auth.session_token")?.value ||
          cookieStore.get("sessionToken")?.value;
      } catch {
        // ignore
      }
    }

    if (sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        user = dbSession.user;
      }
    }
  }

  return user;
}

const EVENT_TYPES = [
  "EXPLANATION",
  "EXAMPLE",
  "QUESTION",
  "ANSWER",
  "MISTAKE",
  "CORRECTION",
  "VISUAL",
  "PRACTICE",
  "CHAT",
];

const SAVEABLE_EVENTS = new Set([
  "EXPLANATION",
  "EXAMPLE",
  "QUESTION",
  "MISTAKE",
  "CORRECTION",
  "VISUAL",
  "PRACTICE",
]);

type MemoryInput = {
  memoryType:
    | "STRUGGLE"
    | "STRENGTH"
    | "PREFERENCE"
    | "MISTAKE"
    | "MASTERY"
    | "REVIEW";
  key: string;
  content: string;
  confidence: number;
  priority: number;
};

async function updateTopicLearningProgress({
  userId,
  courseId,
  chapterId,
  topic,
  eventType,
  isCorrect,
}: {
  userId: string;
  courseId: string;
  chapterId: string;
  topic: string;
  eventType: string;
  isCorrect?: boolean;
}) {
  const existing = await db.topicProgress.findUnique({
    where: {
      userId_chapterId_topic: {
        userId,
        chapterId,
        topic,
      },
    },
  });

  const attempts = existing?.attempts ?? 0;
  const totalQuestions = existing?.totalQuestions ?? 0;
  const correctAnswers = existing?.correctAnswers ?? 0;
  const masteryScore = existing?.masteryScore ?? 0;

  let nextAttempts = attempts;
  let nextTotalQuestions = totalQuestions;
  let nextCorrectAnswers = correctAnswers;
  let nextMasteryScore = masteryScore;

  let status =
    existing?.status ?? "NOT_STARTED";

  // -----------------------------------------
  // QUESTION
  // -----------------------------------------

  if (eventType === "QUESTION") {
    nextTotalQuestions += 1;

    status = "LEARNING";
  }

  // -----------------------------------------
  // ANSWER
  // -----------------------------------------

  if (eventType === "ANSWER") {
    nextAttempts += 1;

    if (isCorrect === true) {
      nextCorrectAnswers += 1;

      nextMasteryScore = Math.min(
        100,
        masteryScore + 20
      );
    }

    if (isCorrect === false) {
      nextMasteryScore = Math.max(
        0,
        masteryScore - 15
      );
    }
  }

  // -----------------------------------------
  // MISTAKE
  // -----------------------------------------

  if (eventType === "MISTAKE") {
    nextMasteryScore = Math.max(
      0,
      masteryScore - 15
    );

    status = "NEEDS_REVIEW";
  }

  // -----------------------------------------
  // CORRECTION
  // -----------------------------------------

  if (eventType === "CORRECTION") {
    nextMasteryScore = Math.min(
      100,
      masteryScore + 5
    );

    status = "NEEDS_REVIEW";
  }

  // -----------------------------------------
  // PRACTICE
  // -----------------------------------------

  if (eventType === "PRACTICE") {
    nextMasteryScore = Math.min(
      100,
      masteryScore + 5
    );

    if (nextMasteryScore >= 80) {
      status = "MASTERED";
    } else {
      status = "PRACTICED";
    }
  }

  // -----------------------------------------
  // EXPLANATION
  // -----------------------------------------

  if (eventType === "EXPLANATION") {
    if (status === "NOT_STARTED") {
      status = "LEARNING";
    }
  }

  // -----------------------------------------
  // PERFORMANCE
  // -----------------------------------------

  const accuracy =
    nextTotalQuestions > 0
      ? Math.round(
          (nextCorrectAnswers /
            nextTotalQuestions) *
            100
        )
      : 0;

  // Repeated poor performance
  if (
    nextTotalQuestions >= 2 &&
    accuracy < 50
  ) {
    status = "NEEDS_REVIEW";
  }

  // Strong performance
  if (
    nextTotalQuestions >= 2 &&
    accuracy >= 80 &&
    nextMasteryScore >= 80
  ) {
    status = "MASTERED";
  }

  // Don't accidentally overwrite review state
  if (
    existing?.status === "NEEDS_REVIEW" &&
    eventType !== "ANSWER"
  ) {
    status = "NEEDS_REVIEW";
  }

  if (existing) {
    return db.topicProgress.update({
      where: {
        id: existing.id,
      },
      data: {
        attempts: nextAttempts,
        totalQuestions: nextTotalQuestions,
        correctAnswers: nextCorrectAnswers,
        masteryScore: nextMasteryScore,
        status,
        lastActivity: new Date(),
      },
    });
  }

  return db.topicProgress.create({
    data: {
      userId,
      courseId,
      chapterId,
      topic,
      attempts: nextAttempts,
      totalQuestions: nextTotalQuestions,
      correctAnswers: nextCorrectAnswers,
      masteryScore: nextMasteryScore,
      status,
      lastActivity: new Date(),
    },
  });
}

function buildMemoryFromEvent(
  eventType: string,
  topic: string,
  content: string
): MemoryInput | null {
  const cleanTopic = topic.trim();

  if (!cleanTopic || !content.trim()) {
    return null;
  }

  switch (eventType) {
    case "MISTAKE":
      return {
        memoryType: "MISTAKE",
        key: cleanTopic,
        content: `Student made a mistake related to ${cleanTopic}: ${content}`,
        confidence: 70,
        priority: 4,
      };

    case "CORRECTION":
      return {
        memoryType: "REVIEW",
        key: cleanTopic,
        content: `Student received a correction related to ${cleanTopic}: ${content}`,
        confidence: 70,
        priority: 3,
      };

    case "QUESTION":
      return {
        memoryType: "STRUGGLE",
        key: cleanTopic,
        content: `Student asked about ${cleanTopic}: ${content}`,
        confidence: 60,
        priority: 3,
      };

    case "PRACTICE":
      return {
        memoryType: "STRENGTH",
        key: cleanTopic,
        content: `Student practiced ${cleanTopic}: ${content}`,
        confidence: 55,
        priority: 2,
      };

    case "EXPLANATION":
  return {
    memoryType: "REVIEW",
    key: cleanTopic,
    content: `Student studied an explanation about ${cleanTopic}: ${content}`,
    confidence: 40,
    priority: 1,
  };

    case "EXAMPLE":
      return {
        memoryType: "STRENGTH",
        key: cleanTopic,
        content: `Student studied an example related to ${cleanTopic}: ${content}`,
        confidence: 45,
        priority: 1,
      };

    case "VISUAL":
      return {
        memoryType: "PREFERENCE",
        key: cleanTopic,
        content: `Student used a visual explanation for ${cleanTopic}: ${content}`,
        confidence: 40,
        priority: 1,
      };

    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      userEmail,
      courseId,
      chapterId,
      topic,
      eventType,
      content,
      metadata,
      isCorrect,
    } = body;

    const isAdmin =
      authUser.role === "Admin" ||
      authUser.role === "SUPER_ADMIN" ||
      authUser.role === "SuperAdmin";

    if (
      userEmail &&
      String(userEmail).trim().toLowerCase() !== authUser.email.toLowerCase() &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot record learning events for another user",
        },
        { status: 403 }
      );
    }

    if (
      !courseId ||
      !chapterId ||
      !topic ||
      !eventType ||
      !content
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required learning event fields.",
        },
        { status: 400 }
      );
    }

    if (!EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid event type.",
        },
        { status: 400 }
      );
    }

    const targetEmail = userEmail ? String(userEmail).trim() : authUser.email;

    const user = await db.user.findUnique({
      where: {
        email: targetEmail,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const shouldSave = SAVEABLE_EVENTS.has(eventType);

    const event = await db.learningEvent.create({
      data: {
        userId: user.id,
        courseId,
        chapterId,
        topic,
        eventType,
        content,
        metadata:
          typeof metadata === "string"
            ? metadata
            : metadata
              ? JSON.stringify(metadata)
              : null,
        shouldSave,
      },
    });


    // =====================================================
// 13C — TOPIC PERFORMANCE
// =====================================================

const eventMetadata =
  typeof metadata === "string"
    ? (() => {
        try {
          return JSON.parse(metadata);
        } catch {
          return {};
        }
      })()
    : metadata || {};

const isCorrectFromMetadata =
  typeof eventMetadata.isCorrect === "boolean"
    ? eventMetadata.isCorrect
    : undefined;

let topicProgress = null;

try {
  topicProgress =
    await updateTopicLearningProgress({

      

      userId: user.id,
      courseId,
      chapterId,
      topic,
      eventType,
      isCorrect: isCorrectFromMetadata,
    });
} catch (progressError) {
  console.error(
    "Topic progress update error:",
    progressError
  );
}

    

    let note = null;

    if (shouldSave) {
      try {
        let actualCourseId = courseId;
        let actualChapterId = chapterId;

        const resolvedCourse = await db.course.findFirst({
          where: { OR: [{ id: courseId }, { language: courseId.toLowerCase() }] },
          select: { id: true },
        });

        if (resolvedCourse) {
          actualCourseId = resolvedCourse.id;
          const orderNum = parseInt(chapterId.replace(/[^0-9]/g, ""), 10);
          const resolvedChapter = await db.chapter.findFirst({
            where: {
              OR: [
                { id: chapterId },
                ...(isNaN(orderNum) ? [] : [{ courseId: actualCourseId, orderNumber: orderNum }]),
              ],
            },
            select: { id: true },
          });

          if (resolvedChapter) {
            actualChapterId = resolvedChapter.id;
          }
        }

        const titleMap: Record<string, string> = {
          EXPLANATION: "Explanation",
          EXAMPLE: "Example",
          QUESTION: "Your Question",
          MISTAKE: "Common Mistake",
          CORRECTION: "Correction",
          VISUAL: "Visual",
          PRACTICE: "Practice",
        };

        const typeMap: Record<string, string> = {
          EXPLANATION: "EXPLANATION",
          EXAMPLE: "EXAMPLE",
          QUESTION: "QUESTION",
          MISTAKE: "MISTAKE",
          CORRECTION: "CORRECTION",
          VISUAL: "VISUAL",
          PRACTICE: "PRACTICE",
        };

        note = await db.learningNote.create({
          data: {
            userId: user.id,
            courseId: actualCourseId,
            chapterId: actualChapterId,
            topic,
            title: titleMap[eventType] || "Learning Note",
            type: typeMap[eventType] || "TIP",
            content,
            metadata: event.metadata,
            importance:
              eventType === "MISTAKE" || eventType === "CORRECTION"
                ? 4
                : 2,
          },
        });
      } catch (noteError) {
        console.error("Learning note create error:", noteError);
      }
    }

    // =====================================================
    // LEARNING MEMORY
    // =====================================================

    const memory = buildMemoryFromEvent(
      eventType,
      topic,
      content
    );

    let savedMemory = null;

    if (memory) {
      const existingMemory = await db.learningMemory.findUnique({
        where: {
          userId_topic_memoryType_key: {
            userId: user.id,
            topic,
            memoryType: memory.memoryType,
            key: memory.key,
          },
        },
      });

      if (existingMemory) {
        const newOccurrences = existingMemory.occurrences + 1;

        const newConfidence = Math.min(
          100,
          Math.max(
            existingMemory.confidence,
            memory.confidence
          ) + 5
        );

        savedMemory = await db.learningMemory.update({
          where: {
            id: existingMemory.id,
          },
          data: {
            content: memory.content,
            confidence: newConfidence,
            priority: Math.max(
              existingMemory.priority,
              memory.priority
            ),
            occurrences: newOccurrences,
            lastObserved: new Date(),
            isActive: true,
          },
        });
      } else {
        savedMemory = await db.learningMemory.create({
          data: {
            userId: user.id,
            courseId,
            chapterId,
            topic,
            memoryType: memory.memoryType,
            key: memory.key,
            content: memory.content,
            confidence: memory.confidence,
            priority: memory.priority,
            occurrences: 1,
            lastObserved: new Date(),
            isActive: true,
          },
        });
      }
    }

    // =====================================================
// 13C — LEARNING INTELLIGENCE
// =====================================================

return NextResponse.json({
  success: true,
  event,
  note,
  memory: savedMemory,
  topicProgress,
});



  } catch (error) {
    console.error("Learning event error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record learning event.",
      },
      { status: 500 }
    );
  }
}