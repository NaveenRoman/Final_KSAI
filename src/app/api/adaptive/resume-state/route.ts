import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";
import { getChapterResumeState } from "@/lib/adaptive/resume-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      course,
      chapterId,
      chapterTitle,
      lessons = [],
      userId,
      userEmail,
    } = body;

    if (!course || !chapterId) {
      return NextResponse.json(
        { success: false, error: "course and chapterId are required" },
        { status: 400 }
      );
    }

    // Authoritative server-side identity
    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (userId || userEmail || "");

    if (!effectiveUserId) {
      return NextResponse.json(
        {
          success: true,
          isChapterComplete: false,
          lastMeaningfulTopic: null,
          shouldQuickRecap: false,
          shouldChapterRecap: false,
        }
      );
    }

    const state = await getChapterResumeState({
      userId: effectiveUserId,
      courseId: course.toLowerCase(),
      chapterId,
      chapterTitle,
      chapterLessons: Array.isArray(lessons) ? lessons : [],
    });

    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch (error: any) {
    console.error("Adaptive Resume State API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to determine resume state" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");
    const chapterId = searchParams.get("chapterId");
    const chapterTitle = searchParams.get("chapterTitle") || undefined;
    const requestedId = searchParams.get("userId");
    const requestedEmail = searchParams.get("userEmail");

    if (!course || !chapterId) {
      return NextResponse.json(
        { success: false, error: "course and chapterId are required" },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (requestedId || requestedEmail || "");

    if (!effectiveUserId) {
      return NextResponse.json(
        {
          success: true,
          isChapterComplete: false,
          lastMeaningfulTopic: null,
          shouldQuickRecap: false,
          shouldChapterRecap: false,
        }
      );
    }

    const lessonsParam = searchParams.get("lessons");
    let chapterLessons: string[] = [];
    if (lessonsParam) {
      try {
        chapterLessons = JSON.parse(lessonsParam);
      } catch {}
    }

    const state = await getChapterResumeState({
      userId: effectiveUserId,
      courseId: course.toLowerCase(),
      chapterId,
      chapterTitle,
      chapterLessons,
    });

    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch (error: any) {
    console.error("Adaptive Resume State GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to determine resume state" },
      { status: 500 }
    );
  }
}
