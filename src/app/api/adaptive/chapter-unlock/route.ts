import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";
import {
  getChapterUnlockStatus,
  getCourseUnlockHierarchy,
  checkChapterCompletion,
} from "@/lib/adaptive/unlock-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/adaptive/chapter-unlock
 * Query params:
 * - courseSlug (required)
 * - chapterId or orderNumber (optional: if omitted, returns full course unlock hierarchy)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("courseSlug") || searchParams.get("course") || "";
    const chapterId = searchParams.get("chapterId") || searchParams.get("orderNumber") || "";

    if (!courseSlug) {
      return NextResponse.json(
        { success: false, error: "courseSlug is required" },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (chapterId) {
      const status = await getChapterUnlockStatus({
        userId: authUser.id,
        courseSlug,
        chapterOrderOrId: chapterId,
      });

      return NextResponse.json({
        success: true,
        ...status,
      });
    } else {
      const hierarchy = await getCourseUnlockHierarchy({
        userId: authUser.id,
        courseSlug,
      });

      return NextResponse.json({
        success: true,
        ...hierarchy,
      });
    }
  } catch (error: any) {
    console.error("GET chapter-unlock error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve chapter unlock status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/adaptive/chapter-unlock
 * Body:
 * - courseSlug / course (required)
 * - chapterId / orderNumber (optional)
 * - userId / userEmail (fallback only for testing scripts)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const courseSlug = body.courseSlug || body.course || "";
    const chapterId = body.chapterId ?? body.orderNumber ?? "";

    if (!courseSlug) {
      return NextResponse.json(
        { success: false, error: "courseSlug is required" },
        { status: 400 }
      );
    }

    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (body.userId || body.userEmail || "");

    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (chapterId !== undefined && chapterId !== "") {
      const status = await getChapterUnlockStatus({
        userId: effectiveUserId,
        courseSlug,
        chapterOrderOrId: chapterId,
      });

      return NextResponse.json({
        success: true,
        ...status,
      });
    } else {
      const hierarchy = await getCourseUnlockHierarchy({
        userId: effectiveUserId,
        courseSlug,
      });

      return NextResponse.json({
        success: true,
        ...hierarchy,
      });
    }
  } catch (error: any) {
    console.error("POST chapter-unlock error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to resolve chapter unlock status" },
      { status: 500 }
    );
  }
}
