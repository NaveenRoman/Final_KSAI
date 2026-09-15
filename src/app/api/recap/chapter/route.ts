import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    return session.user;
  }

  const cookieStore = await cookies();

  const sessionTokenRaw =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("sessionToken")?.value;

  if (!sessionTokenRaw) {
    return null;
  }

  const rawToken = parseSessionToken(sessionTokenRaw);

  const dbSession = await db.session.findUnique({
    where: {
      token: rawToken,
    },
    include: {
      user: true,
    },
  });

  if (!dbSession || new Date() >= dbSession.expiresAt) {
    return null;
  }

  return dbSession.user;
}

/**
 * GET /api/recap/chapter
 *
 * Query params:
 * - courseId
 * - chapterId
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get("chapterId");
    const courseId = searchParams.get("courseId");

    if (!chapterId) {
      return NextResponse.json(
        { success: false, error: "chapterId is required." },
        { status: 400 }
      );
    }

    // 1. Check existing persistent ChapterRecap
    const existing = await db.chapterRecap.findUnique({
      where: {
        userId_chapterId: {
          userId: user.id,
          chapterId,
        },
      },
      include: {
        course: { select: { id: true, title: true, language: true } },
        chapter: { select: { id: true, title: true, orderNumber: true } },
      },
    });

    let chapterAnalysis = null;
    try {
      const { getChapterLearningAnalysis } = await import("@/lib/adaptive/resume-service");
      chapterAnalysis = await getChapterLearningAnalysis({
        userId: user.id,
        courseId: existing?.course?.language || "python",
        chapterId,
        chapterLessons: [],
      });
    } catch (e) {
      console.warn("getChapterLearningAnalysis notice:", e);
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        recap: {
          ...existing,
          keyConcepts: JSON.parse(existing.keyConcepts || "[]"),
          importantExamples: existing.importantExamples
            ? JSON.parse(existing.importantExamples)
            : [],
          importantSyntax: existing.importantSyntax
            ? JSON.parse(existing.importantSyntax)
            : [],
          whatYouLearned: existing.whatYouLearned
            ? JSON.parse(existing.whatYouLearned)
            : [],
          revisionPoints: existing.revisionPoints
            ? JSON.parse(existing.revisionPoints)
            : [],
        },
        chapterAnalysis,
      });
    }

    // 2. Fetch chapter info & student notes for this chapter
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: {
        course: { select: { id: true, title: true, language: true } },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "Chapter not found." },
        { status: 404 }
      );
    }

    const notes = await db.learningNote.findMany({
      where: {
        userId: user.id,
        chapterId,
      },
      orderBy: { createdAt: "asc" },
    });

    const keyConcepts = notes
      .filter((n) => n.type === "EXPLANATION" || n.type === "TIP")
      .map((n) => `${n.title}: ${n.content.slice(0, 150)}`);

    const importantExamples = notes
      .filter((n) => n.type === "EXAMPLE" || n.type === "CODE")
      .map((n) => ({ title: n.title, content: n.content }));

    const whatYouLearned = notes.map((n) => n.topic || n.title);

    const revisionPoints = notes
      .filter((n) => n.type === "MISTAKE" || n.type === "CORRECTION" || n.importance >= 3)
      .map((n) => `${n.title}: ${n.content.slice(0, 120)}`);

    const synthesized = {
      id: "chapter-synthesis",
      userId: user.id,
      courseId: chapter.courseId,
      chapterId: chapter.id,
      course: chapter.course,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        orderNumber: chapter.orderNumber,
      },
      summary: `Comprehensive recap of ${chapter.title}. This chapter covers foundational logic, syntax, rules, and practical examples.`,
      keyConcepts:
        keyConcepts.length > 0
          ? keyConcepts
          : [`Core concepts and principles of ${chapter.title}`],
      importantExamples,
      importantSyntax: [],
      whatYouLearned: Array.from(new Set(whatYouLearned)),
      revisionPoints:
        revisionPoints.length > 0
          ? revisionPoints
          : ["Review key syntax and practice exercises before taking the quiz."],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      recap: synthesized,
      chapterAnalysis,
      isSynthesized: true,
    });
  } catch (error) {
    console.error("GET /api/recap/chapter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load chapter recap." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recap/chapter
 *
 * Persists / updates a chapter recap.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      courseId,
      chapterId,
      summary,
      keyConcepts,
      importantExamples,
      importantSyntax,
      whatYouLearned,
      revisionPoints,
    } = body;

    if (!courseId || !chapterId || !summary) {
      return NextResponse.json(
        {
          success: false,
          error: "courseId, chapterId and summary are required.",
        },
        { status: 400 }
      );
    }

    const recap = await db.chapterRecap.upsert({
      where: {
        userId_chapterId: {
          userId: user.id,
          chapterId,
        },
      },
      create: {
        userId: user.id,
        courseId,
        chapterId,
        summary,
        keyConcepts:
          typeof keyConcepts === "string"
            ? keyConcepts
            : JSON.stringify(keyConcepts || []),
        importantExamples:
          typeof importantExamples === "string"
            ? importantExamples
            : importantExamples
            ? JSON.stringify(importantExamples)
            : null,
        importantSyntax:
          typeof importantSyntax === "string"
            ? importantSyntax
            : importantSyntax
            ? JSON.stringify(importantSyntax)
            : null,
        whatYouLearned:
          typeof whatYouLearned === "string"
            ? whatYouLearned
            : whatYouLearned
            ? JSON.stringify(whatYouLearned)
            : null,
        revisionPoints:
          typeof revisionPoints === "string"
            ? revisionPoints
            : revisionPoints
            ? JSON.stringify(revisionPoints)
            : null,
      },
      update: {
        summary,
        keyConcepts:
          typeof keyConcepts === "string"
            ? keyConcepts
            : JSON.stringify(keyConcepts || []),
        importantExamples:
          typeof importantExamples === "string"
            ? importantExamples
            : importantExamples
            ? JSON.stringify(importantExamples)
            : null,
        importantSyntax:
          typeof importantSyntax === "string"
            ? importantSyntax
            : importantSyntax
            ? JSON.stringify(importantSyntax)
            : null,
        whatYouLearned:
          typeof whatYouLearned === "string"
            ? whatYouLearned
            : whatYouLearned
            ? JSON.stringify(whatYouLearned)
            : null,
        revisionPoints:
          typeof revisionPoints === "string"
            ? revisionPoints
            : revisionPoints
            ? JSON.stringify(revisionPoints)
            : null,
      },
    });

    // Also persist chapter understanding note in db.learningNote
    const existingNote = await db.learningNote.findFirst({
      where: {
        userId: user.id,
        courseId,
        chapterId,
        topic: { startsWith: "Chapter Recap" },
      },
    });

    const noteContent = `Chapter Recap & Understanding Check\n\n${summary}\n\nKey Concepts:\n${Array.isArray(keyConcepts) ? keyConcepts.map((k: string) => `• ${k}`).join("\n") : keyConcepts}\n\nDecision: ${body.understandingDecision === "TEACH_AGAIN" ? "Teach Chapter Again Requested" : "Chapter Understood & Ready"}`;

    if (existingNote) {
      await db.learningNote.update({
        where: { id: existingNote.id },
        data: {
          content: noteContent,
          metadata: JSON.stringify({
            summary,
            keyConcepts,
            importantSyntax,
            whatYouLearned,
            revisionPoints,
            studentAnswer: body.studentAnswer,
            aiFeedback: body.aiFeedback,
            understandingDecision: body.understandingDecision || "START_NEXT_CHAPTER",
          }),
          updatedAt: new Date(),
        },
      });
    } else {
      await db.learningNote.create({
        data: {
          userId: user.id,
          courseId,
          chapterId,
          topic: `Chapter Recap`,
          title: `Chapter Understanding Summary`,
          type: "CHAPTER_RECAP",
          content: noteContent,
          metadata: JSON.stringify({
            summary,
            keyConcepts,
            importantSyntax,
            whatYouLearned,
            revisionPoints,
            studentAnswer: body.studentAnswer,
            aiFeedback: body.aiFeedback,
            understandingDecision: body.understandingDecision || "START_NEXT_CHAPTER",
          }),
          importance: 3,
          isPinned: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      recap,
    });
  } catch (error) {
    console.error("POST /api/recap/chapter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save chapter recap." },
      { status: 500 }
    );
  }
}
