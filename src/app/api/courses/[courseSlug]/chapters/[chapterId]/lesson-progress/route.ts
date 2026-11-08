import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { getAuthoritativeProgression } from "@/lib/progression";
import { checkCourseAccess } from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "NOT_STARTED",
  "LEARNING",
  "PRACTICED",
  "NEEDS_REVIEW",
  "MASTERED",
] as const;

type LessonStatus = (typeof VALID_STATUSES)[number];

async function resolveAuthenticatedUser(req: NextRequest) {
  const sessionData = await auth.api.getSession({ headers: req.headers });
  if (sessionData?.user) {
    return sessionData.user;
  }

  const cookieStore = await cookies();
  const sessionTokenRaw =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value ||
    cookieStore.get("better-auth.session-token")?.value ||
    cookieStore.get("sessionToken")?.value;

  if (sessionTokenRaw) {
    const rawToken = parseSessionToken(sessionTokenRaw);
    const dbSession = await prisma.session.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });
    if (dbSession && new Date() < dbSession.expiresAt) {
      return dbSession.user;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      courseSlug: string;
      chapterId: string;
    }>;
  }
) {
  try {
    const { courseSlug, chapterId } = await params;

    // 1. Authenticate user strictly from server session
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Prevent parameter spoofing: if client supplied userEmail, it must match authenticated user
    const requestedEmail = request.nextUrl.searchParams.get("userEmail");
    if (requestedEmail && user.email && requestedEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot access lesson progress of another user.",
        },
        { status: 403 }
      );
    }

    const normSlug = courseSlug.toLowerCase();
    let chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        course: {
          language: normSlug,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        courseId: true,
      },
    });

    if (!chapter && !isNaN(Number(chapterId))) {
      chapter = await prisma.chapter.findFirst({
        where: {
          orderNumber: parseInt(chapterId, 10),
          course: {
            language: normSlug,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          courseId: true,
        },
      });
    }

    if (!chapter) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter not found.",
        },
        { status: 404 }
      );
    }

    const progress = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        chapterId: chapter.id,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    // Authoritative progression calculation
    const authoritative = await getAuthoritativeProgression(
      user.id,
      courseSlug,
      chapter.orderNumber
    );

    return NextResponse.json({
      success: true,
      progress,
      lastStudiedLesson: progress[0]?.lesson || null,
      authoritativeProgression: authoritative,
    });
  } catch (error) {
    console.error("Lesson progress GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load lesson progress.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      courseSlug: string;
      chapterId: string;
    }>;
  }
) {
  try {
    const { courseSlug, chapterId } = await params;

    const body = await request.json();

    const {
      userEmail,
      lesson,
      status,
      attempts,
      correctAnswers,
      totalQuestions,
      lastScore,
    } = body;

    // 1. Authenticate user strictly from server session
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // 2. Prevent parameter spoofing: if client supplied userEmail, verify it matches authenticated user
    if (userEmail && user.email && userEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot modify lesson progress of another user.",
        },
        { status: 403 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "lesson is required.",
        },
        { status: 400 }
      );
    }

    // 3. Authoritative Course Access Gate
    const access = await checkCourseAccess(user.id, courseSlug);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to record lesson progress."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? `Your current subscription does not cover ${courseSlug}. Upgrade your plan to access this course.`
              : `Enrollment in ${courseSlug} is required to record lesson progress.`,
          lockReason: access.reason,
        },
        { status: 403 }
      );
    }

    const nextStatus: LessonStatus = VALID_STATUSES.includes(status)
      ? status
      : "LEARNING";

    const normSlug = courseSlug.toLowerCase();
    let chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        course: {
          language: normSlug,
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (!chapter && !isNaN(Number(chapterId))) {
      chapter = await prisma.chapter.findFirst({
        where: {
          orderNumber: parseInt(chapterId, 10),
          course: {
            language: normSlug,
          },
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });
    }

    if (!chapter) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter not found.",
        },
        { status: 404 }
      );
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_chapterId_lesson: {
          userId: user.id,
          chapterId: chapter.id,
          lesson,
        },
      },
      update: {
        status: nextStatus,
        attempts:
          typeof attempts === "number"
            ? attempts
            : undefined,
        correctAnswers:
          typeof correctAnswers === "number"
            ? correctAnswers
            : undefined,
        totalQuestions:
          typeof totalQuestions === "number"
            ? totalQuestions
            : undefined,
        lastScore:
          typeof lastScore === "number"
            ? lastScore
            : undefined,
        lastActivity: new Date(),
      },
      create: {
        userId: user.id,
        chapterId: chapter.id,
        lesson,
        status: nextStatus,
        attempts:
          typeof attempts === "number"
            ? attempts
            : 0,
        correctAnswers:
          typeof correctAnswers === "number"
            ? correctAnswers
            : 0,
        totalQuestions:
          typeof totalQuestions === "number"
            ? totalQuestions
            : 0,
        lastScore:
          typeof lastScore === "number"
            ? lastScore
            : 0,
        lastActivity: new Date(),
      },
    });

    // Authoritative progression calculation after update
    const authoritative = await getAuthoritativeProgression(
      user.id,
      courseSlug,
      chapter.orderNumber
    );

    return NextResponse.json({
      success: true,
      progress,
      authoritativeProgression: authoritative,
    });
  } catch (error) {
    console.error("Lesson progress POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save lesson progress.",
      },
      { status: 500 }
    );
  }
}