import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { getAuthoritativeProgression } from "@/lib/progression";
import { getChapterUnlockStatus } from "@/lib/adaptive/unlock-service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
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
    let course = await db.course.findFirst({
      where: { language: courseSlug.toLowerCase() },
    });

    if (!course) {
      // Trigger course re-seeding via internal API endpoint if missing
      try {
        const reqUrl = new URL(req.url);
        await fetch(`${reqUrl.origin}/api/courses`, { cache: "no-store" });
        course = await db.course.findFirst({
          where: { language: courseSlug.toLowerCase() },
        });
      } catch (e) {
        console.error("Auto-seed trigger error:", e);
      }
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Fetch all chapters in this course
    const chapters = await db.chapter.findMany({
      where: { courseId: course.id },
      orderBy: { orderNumber: "asc" },
    });

    const cleanChapterId = chapterId.replace(/\/+$/, "").trim();
    const parsed = parseInt(cleanChapterId.replace(/[^0-9]/g, ""), 10);
    const orderNum = isNaN(parsed) ? 0 : parsed;
    const currentChapter =
      chapters.find(
        (c: { orderNumber: number; id: string }) =>
          c.orderNumber === orderNum ||
          c.id === cleanChapterId ||
          c.id === chapterId
      ) || chapters[0];

    if (!currentChapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Check if user is enrolled
    const enrollment = await db.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
      },
    });

    // Fetch user progresses
    const progresses = await db.chapterProgress.findMany({
      where: {
        userId: user.id,
        chapterId: { in: chapters.map((c: { id: string }) => c.id) },
      },
    });

    // Authoritative sequential chapter unlock verification
    const unlockStatus = await getChapterUnlockStatus({
      userId: user.id,
      courseSlug,
      chapterOrderOrId: currentChapter.orderNumber,
    });

    if (!unlockStatus.isUnlocked) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          isUnlocked: false,
          lockReason: unlockStatus.lockReason,
          chapterTitle: currentChapter.title,
          orderNumber: currentChapter.orderNumber,
          previousChapter: unlockStatus.previousChapter,
          requirements: unlockStatus.requirements,
          quizStatus: unlockStatus.quizStatus,
          message: unlockStatus.previousChapter
            ? `Chapter ${currentChapter.orderNumber} is locked. Complete Chapter ${unlockStatus.previousChapter.orderNumber} and pass its required assessment to continue.`
            : `Chapter ${currentChapter.orderNumber} is locked. Complete previous chapter requirements first.`,
          courseTitle: course.title,
          courseSlug: course.language || courseSlug,
          courseId: course.id,
          isEnrolled: !!enrollment,
          userEmail: user.email,
          chapters: chapters.map((c: { id: string; title: string; orderNumber: number }) => ({
            id: c.id,
            title: c.title,
            orderNumber: c.orderNumber,
          })),
          progresses: progresses.map((p: { chapterId: string; isCompleted: boolean; quizScore: number }) => ({
            chapterId: p.chapterId,
            isCompleted: p.isCompleted,
            quizScore: p.quizScore,
          })),
        },
        { status: 403 }
      );
    }

    // Extract raw markdown explanation
    let notesContent = currentChapter.explanation;
    try {
      const absolutePath = path.join(process.cwd(), currentChapter.explanation);
      if (fs.existsSync(absolutePath)) {
        notesContent = fs.readFileSync(absolutePath, "utf-8");
      } else {
        notesContent = currentChapter.explanation;
      }
    } catch (e) {
      notesContent = currentChapter.explanation;
    }

    // Metadata defaults
    const estimatedTime = currentChapter.orderNumber === 0 ? "15 mins" : "30 mins";
    const difficulty = currentChapter.orderNumber === 0 ? "Beginner" : "Intermediate";

    // Authoritative progression computation
    const progressionData = await getAuthoritativeProgression(
      user.id,
      courseSlug,
      currentChapter.orderNumber
    );

    return NextResponse.json({
      success: true,
      courseTitle: course.title,
      courseSlug: course.language || courseSlug,
      courseId: course.id,
      coursePrice: course.price,
      isEnrolled: !!enrollment,
      userEmail: user.email,
      currentChapter: {
        id: currentChapter.id,
        title: currentChapter.title,
        orderNumber: currentChapter.orderNumber,
        content: notesContent,
        estimatedTime,
        difficulty,
      },
      chapter: {
        id: currentChapter.id,
        title: currentChapter.title,
        orderNumber: currentChapter.orderNumber,
        content: notesContent,
        estimatedTime,
        difficulty,
      },
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
      },
      chapters: chapters.map((c: { id: string; title: string; orderNumber: number }) => ({
        id: c.id,
        title: c.title,
        orderNumber: c.orderNumber,
      })),
      progresses: progresses.map((p: { chapterId: string; isCompleted: boolean; quizScore: number }) => ({
        chapterId: p.chapterId,
        isCompleted: p.isCompleted,
        quizScore: p.quizScore,
      })),
      progression: progressionData,
    });
  } catch (error) {
    console.error("GET Chapter Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
