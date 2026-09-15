import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      courseSlug: string;
      chapterId: string;
    }>;
  }
) {
  try {
    const { courseSlug, chapterId } = await context.params;

    const url = new URL(request.url);

    const userEmail = url.searchParams.get("userEmail");
    let courseId = url.searchParams.get("courseId");

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "User email is required.",
        },
        { status: 400 }
      );
    }

    // Auto-resolve courseId if omitted
    if (!courseId) {
      const course = await db.course.findFirst({
        where: { language: (courseSlug || "").toLowerCase() },
        select: { id: true },
      });
      if (course) {
        courseId = course.id;
      }
    }

    if (!courseId || !chapterId) {
      return NextResponse.json(
        {
          success: false,
          error: "Course and chapter are required.",
        },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        email: userEmail,
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

    let chapter = await db.chapter.findFirst({
      where: {
        id: chapterId,
        courseId,
      },
    });

    if (!chapter && !isNaN(Number(chapterId))) {
      chapter = await db.chapter.findFirst({
        where: {
          orderNumber: parseInt(chapterId, 10),
          courseId,
        },
      });
    }

    if (!chapter) {
      return NextResponse.json(
        {
          success: false,
          error: `Chapter not found for ${courseSlug}.`,
        },
        { status: 404 }
      );
    }

    // ==========================================
    // TOPIC PERFORMANCE
    // ==========================================

    const topicProgress =
      await db.topicProgress.findMany({
        where: {
          userId: user.id,
          courseId,
          chapterId,
        },
        orderBy: {
          masteryScore: "desc",
        },
      });

    // ==========================================
    // LEARNING MEMORY
    // ==========================================

    const memories =
      await db.learningMemory.findMany({
        where: {
          userId: user.id,
          courseId,
          chapterId,
          isActive: true,
        },
        orderBy: [
          {
            priority: "desc",
          },
          {
            confidence: "desc",
          },
        ],
      });

    // ==========================================
    // LEARNING EVENTS
    // ==========================================

    const events =
      await db.learningEvent.findMany({
        where: {
          userId: user.id,
          courseId,
          chapterId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    // ==========================================
    // COMPLETED TOPICS
    // ==========================================

    const completedTopics =
      topicProgress
        .filter(
          (topic) =>
            topic.status === "MASTERED" ||
            topic.status === "PRACTICED" ||
            topic.masteryScore >= 70
        )
        .map((topic) => topic.topic);

    // ==========================================
    // STRENGTHS
    // ==========================================

    const strengths =
      memories
        .filter(
          (memory) =>
            memory.memoryType === "STRENGTH" ||
            memory.memoryType === "MASTERY"
        )
        .map((memory) => memory.topic);

    // ==========================================
    // WEAK CONCEPTS
    // ==========================================

    const weakConcepts =
      memories
        .filter(
          (memory) =>
            memory.memoryType === "STRUGGLE" ||
            memory.memoryType === "MISTAKE" ||
            memory.memoryType === "REVIEW"
        )
        .map((memory) => memory.topic);

    const unique = (
      items: string[]
    ) =>
      Array.from(
        new Set(
          items
            .map((item) =>
              item?.trim()
            )
            .filter(Boolean)
        )
      );

    const uniqueCompletedTopics =
      unique(completedTopics);

    const uniqueStrengths =
      unique(strengths);

    const uniqueWeakConcepts =
      unique(weakConcepts);

    // ==========================================
    // MASTERY
    // ==========================================

    const masteryScore =
      topicProgress.length > 0
        ? Math.round(
            topicProgress.reduce(
              (sum, topic) =>
                sum +
                Math.max(
                  0,
                  Math.min(
                    100,
                    topic.masteryScore
                  )
                ),
              0
            ) / topicProgress.length
          )
        : 0;

    // ==========================================
    // CHAPTER INSIGHT
    // ==========================================

    let summary = "";

    if (masteryScore >= 85) {
      summary =
        `Excellent ${courseSlug} chapter performance. You demonstrated strong understanding across the major concepts. Keep practicing real problems to turn this knowledge into consistent skills.`;
    } else if (masteryScore >= 70) {
      summary =
        `Good ${courseSlug} chapter performance. You understand most of the important concepts, but additional practice on the weaker areas will improve your confidence and retention.`;
    } else if (masteryScore >= 50) {
      summary =
        `You have built a foundation in this ${courseSlug} chapter, but several concepts still need reinforcement. Review the weaker concepts and practice them before moving ahead.`;
    } else {
      summary =
        `This ${courseSlug} chapter needs more reinforcement. Focus on the concepts marked for review, revisit the explanations, and practice small problems before taking the assessment.`;
    }

    return NextResponse.json({
      success: true,

      summary: {
        completedTopics:
          uniqueCompletedTopics,

        strengths:
          uniqueStrengths,

        weakConcepts:
          uniqueWeakConcepts,

        masteryScore,

        totalEvents:
          events.length,

        summary,
      },
    });
  } catch (error) {
    console.error(
      "Chapter summary API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to generate chapter summary.",
      },
      { status: 500 }
    );
  }
}