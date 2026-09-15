import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";
import { getChapterLearningAnalysis } from "@/lib/adaptive/resume-service";

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

    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (userId || userEmail || "");

    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: "Authenticated user or identifier is required" },
        { status: 400 }
      );
    }

    const analysis = await getChapterLearningAnalysis({
      userId: effectiveUserId,
      courseId: course.toLowerCase(),
      chapterId,
      chapterTitle,
      chapterLessons: Array.isArray(lessons) ? lessons : [],
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("Adaptive Chapter Analysis API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze chapter" },
      { status: 500 }
    );
  }
}
