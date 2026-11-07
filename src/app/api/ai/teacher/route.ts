import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { logUserActivity } from "@/lib/progression";

export const dynamic = "force-dynamic";

const DJANGO_TEACH_URL =
  process.env.DJANGO_TEACH_URL ||
  "http://127.0.0.1:8000/api/ai/teach/";

const VALID_MODES = [
  "explain",
  "example",
  "visual",
  "question",
  "confused",
  "chat",
] as const;

type TeachMode = (typeof VALID_MODES)[number];

function getMode(
  quickAction: string | undefined,
): TeachMode {
  if (
    quickAction &&
    VALID_MODES.includes(
      quickAction as TeachMode,
    )
  ) {
    return quickAction as TeachMode;
  }

  return "chat";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      message = "",
      quickAction,
      courseLanguage,
      course,
      chapter,
      topic,
      content,
      history = [],
    } = body;

    // --------------------------------------------------
    // 1. AUTHENTICATION
    // --------------------------------------------------

    const cookieStore = await cookies();

    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let user = session?.user as any;

    if (!user && sessionTokenRaw) {
      const rawToken = parseSessionToken(
        sessionTokenRaw,
      );

      const dbSession =
        await db.session.findUnique({
          where: {
            token: rawToken,
          },
          include: {
            user: true,
          },
        });

      if (
        dbSession &&
        new Date() < dbSession.expiresAt
      ) {
        user = dbSession.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. RESOLVE COURSE
    // --------------------------------------------------

    let activeCourse: any = null;

    if (courseLanguage) {
      activeCourse =
        await db.course.findFirst({
          where: {
            language:
              String(courseLanguage).toLowerCase(),
          },
          include: {
            chapters: true,
          },
        });
    }

    // Fallback to user's latest enrollment
    if (!activeCourse) {
      const enrollments =
        await db.enrollment.findMany({
          where: {
            userId: user.id,
          },
          include: {
            course: {
              include: {
                chapters: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (enrollments.length > 0) {
        activeCourse =
          enrollments[0].course;
      }
    }

    // --------------------------------------------------
    // 3. RESOLVE CURRENT CHAPTER
    // --------------------------------------------------

    let currentChapter: any = null;

    if (
      activeCourse &&
      activeCourse.chapters?.length > 0
    ) {
      const progresses =
        await db.chapterProgress.findMany({
          where: {
            userId: user.id,
            chapterId: {
              in: activeCourse.chapters.map(
                (ch: any) => ch.id,
              ),
            },
          },
        });

      const incomplete =
        activeCourse.chapters.filter(
          (ch: any) =>
            !progresses.some(
              (p: any) =>
                p.chapterId === ch.id &&
                p.isCompleted,
            ),
        );

      currentChapter =
        incomplete.length > 0
          ? incomplete[0]
          : activeCourse.chapters[0];
    }

    // --------------------------------------------------
    // 4. BUILD TEACHING CONTEXT
    // --------------------------------------------------

    const courseContext =
      course ||
      activeCourse?.title ||
      "Programming";

    const chapterContext =
      chapter ||
      currentChapter?.title ||
      "Current Chapter";

    /*
     * IMPORTANT:
     *
     * The frontend should preferably send the actual
     * current topic and lesson content.
     *
     * We do NOT invent lesson content here.
     */

    const topicContext =
      topic ||
      chapterContext;

    const contentContext =
      content ||
      currentChapter?.explanation ||
      "";

    if (!contentContext.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Lesson content is required for the Teaching Engine.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 5. TEACHING MODE
    // --------------------------------------------------

    const mode = getMode(
      quickAction,
    );

    /*
     * Django teach_views.py currently requires
     * question to be non-empty.
     *
     * For quick actions, create a natural request.
     */

    let teachingQuestion =
      String(message || "").trim();

    if (!teachingQuestion) {
      const defaultQuestions: Record<
        TeachMode,
        string
      > = {
        explain:
          "Please explain this topic to me.",
        example:
          "Please give me an example of this topic.",
        visual:
          "Please show me this concept visually.",
        question:
          "Please ask me one question to check my understanding.",
        confused:
          "I'm confused about this topic. Please explain it differently.",
        chat:
          "Help me understand this lesson.",
      };

      teachingQuestion =
        defaultQuestions[mode];
    }

    // --------------------------------------------------
    // 6. CALL DJANGO TEACHING ENGINE
    // --------------------------------------------------

    const djangoResponse =
      await fetch(
        DJANGO_TEACH_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            ...(process.env.INTERNAL_API_SECRET
              ? { "X-Internal-Secret": process.env.INTERNAL_API_SECRET }
              : {}),
          },

          body: JSON.stringify({
            course:
              courseContext,

            chapter:
              chapterContext,

            topic:
              topicContext,

            content:
              contentContext,

            question:
              teachingQuestion,

            mode,

            history:
              Array.isArray(history)
                ? history
                : [],
          }),

          cache: "no-store",
        },
      );

    const djangoResult =
      await djangoResponse.json();

    if (!djangoResponse.ok) {
      console.error(
        "Django Teaching Engine error:",
        djangoResult,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            djangoResult?.message ||
            djangoResult?.error ||
            "Teaching Engine failed.",
        },
        {
          status:
            djangoResponse.status,
        },
      );
    }

    // --------------------------------------------------
    // 7. ACTIVITY LOG
    // --------------------------------------------------

    try {
      await logUserActivity(
        user.id,
        "AI_TEACHING",
        {
          course:
            courseContext,

          chapter:
            chapterContext,

          topic:
            topicContext,

          mode,

          question:
            teachingQuestion,
        },
      );
    } catch (activityError) {
      console.error(
        "Teaching activity log failed:",
        activityError,
      );
    }

    // --------------------------------------------------
    // 8. RETURN REAL AI TEACHER RESPONSE
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      data: djangoResult.data,

      /*
       * Keep these fields available for the
       * frontend if needed.
       */

      context: {
        course:
          courseContext,

        chapter:
          chapterContext,

        topic:
          topicContext,

        mode,
      },
    });
  } catch (error) {
    console.error(
      "Teacher API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "AI Teaching Engine failed.",
      },
      { status: 500 },
    );
  }
}