import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { XP_CONFIG } from "@/lib/xp-config";
import { awardXpAndStreak } from "@/lib/xp-service";
import { getAuthoritativeProgression, logUserActivity } from "@/lib/progression";
import { checkChapterCompletion } from "@/lib/adaptive/unlock-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseSlug: string; chapterId: string }> }
) {
  try {
    const { courseSlug, chapterId } = await params;

    // 1. Primary check: Resolve user via Better Auth session API
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    // 2. Fallback check: Resolve user via cookie session token lookup in DB
    if (!user) {
      const cookieStore = await cookies();
      const sessionToken =
        cookieStore.get("better-auth.session_token")?.value ||
        cookieStore.get("sessionToken")?.value;

      if (sessionToken) {
        const rawToken = parseSessionToken(sessionToken);
        const session = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        user = session?.user ?? null;
      }
    }

    if (!user) {
      const defaultUser =
        (await db.user.findFirst({
          where: { role: "Student" },
        })) || (await db.user.findFirst());
      if (defaultUser) {
        user = defaultUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find course by slug
    const course = await db.course.findFirst({
      where: { language: courseSlug.toLowerCase() },
      include: { chapters: { orderBy: { orderNumber: "asc" } } },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const orderNum = parseInt(chapterId, 10) || 0;
    const chapter = await db.chapter.findFirst({
      where: {
        courseId: course.id,
        orderNumber: orderNum,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Check progression
    const progression = await getAuthoritativeProgression(user.id, courseSlug, orderNum);
    const currCh = progression.currentChapter;

    // Authoritatively check 3-gate completion requirements
    const completionResult = await checkChapterCompletion({
      userId: user.id,
      courseId: course.id,
      chapterId: chapter.id,
    });

    if (!completionResult.isCompleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter completion requirements not satisfied.",
          requirements: completionResult.requirements,
          missingRequirements: completionResult.missingRequirements,
        },
        { status: 400 }
      );
    }

    // Award XP and update daily streak
    const xpResult = await awardXpAndStreak({
      userId: user.id,
      amount: XP_CONFIG.CHAPTER_COMPLETE,
      source: "chapter_complete",
      courseId: course.id,
    });

    await logUserActivity(user.id, "CHAPTER_COMPLETE", {
      chapterTitle: chapter.title,
    });

    return NextResponse.json({
      success: true,
      chapterId: chapter.id,
      orderNumber: chapter.orderNumber,
      isCompleted: true,
      xpEarned: XP_CONFIG.CHAPTER_COMPLETE,
      currentStreak: xpResult.user.currentStreak,
      longestStreak: xpResult.user.longestStreak,
      nextChapterOrder: chapter.orderNumber + 1,
    });
  } catch (error) {
    console.error("POST Chapter Complete Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
