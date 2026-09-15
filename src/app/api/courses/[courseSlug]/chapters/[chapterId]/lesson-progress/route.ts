import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthoritativeProgression } from "@/lib/progression";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "NOT_STARTED",
  "LEARNING",
  "PRACTICED",
  "NEEDS_REVIEW",
  "MASTERED",
] as const;

type LessonStatus = (typeof VALID_STATUSES)[number];

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

    const userEmail = request.nextUrl.searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "userEmail is required.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
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

    if (!userEmail || !lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "userEmail and lesson are required.",
        },
        { status: 400 }
      );
    }

    const nextStatus: LessonStatus = VALID_STATUSES.includes(status)
      ? status
      : "LEARNING";

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
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