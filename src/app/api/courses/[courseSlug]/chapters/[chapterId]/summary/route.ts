import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { checkCourseAccess } from "@/lib/subscription-service";

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

    // 1. Authenticate user strictly from server session
    const sessionData = await auth.api.getSession({
      headers: await headers().catch(() => request.headers),
    });
    let user = sessionData?.user ?? null;

    if (!user) {
      const cookieStore = await cookies();
      const sessionTokenRaw =
        cookieStore.get("better-auth.session_token")?.value ||
        cookieStore.get("__Secure-better-auth.session_token")?.value ||
        cookieStore.get("better-auth.session-token")?.value ||
        cookieStore.get("sessionToken")?.value;

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

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const requestedEmail = url.searchParams.get("userEmail");
    let courseId = url.searchParams.get("courseId");

    // Prevent parameter spoofing: if client supplied userEmail, verify it matches
    if (requestedEmail && user.email && requestedEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot access chapter summary of another user.",
        },
        { status: 403 }
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

    // 2. Authoritative Course Access Check
    const access = await checkCourseAccess(user.id, courseSlug);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to access chapter summaries."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? `Your current subscription does not cover ${courseSlug}. Upgrade your plan to access this course.`
              : `Enrollment in ${courseSlug} is required to access chapter summaries.`,
          lockReason: access.reason,
        },
        { status: 403 }
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