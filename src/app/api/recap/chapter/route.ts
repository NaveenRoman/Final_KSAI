import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { appendLearningUnitToNotebook } from "@/lib/notebook/notebook-service";

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
 * Grounded directly on the student's actual accumulated learning notes & evidence.
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

    // 2. Fetch chapter info & actual accumulated student notes for this chapter
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

    // Query all actual learning notes for this user and chapter, strictly chronological
    const notes = await db.learningNote.findMany({
      where: {
        userId: user.id,
        chapterId,
      },
      orderBy: [
        { sequenceOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Synthesize actual accumulated evidence
    const conceptsActuallyTaught: string[] = [];
    const examplesActuallyTaught: Array<{ title: string; code?: string; content?: string }> = [];
    const questionsAsked: string[] = [];
    const studentAnswers: string[] = [];
    const evaluations: string[] = [];
    const mistakes: string[] = [];
    const corrections: string[] = [];
    const strengths: string[] = [];
    const needsSupport: string[] = [];

    for (const note of notes) {
      let meta: any = null;
      if (note.metadata) {
        try {
          meta = typeof note.metadata === "string" ? JSON.parse(note.metadata) : note.metadata;
        } catch {
          meta = null;
        }
      }

      // Concepts
      if (meta?.whatAITaught?.concept) {
        conceptsActuallyTaught.push(`${note.topic}: ${meta.whatAITaught.concept}`);
      } else if (meta?.whatILearned) {
        conceptsActuallyTaught.push(`${note.topic}: ${meta.whatILearned.slice(0, 140)}`);
      } else {
        conceptsActuallyTaught.push(note.topic);
      }

      // Examples
      const exList = meta?.whatAITaught?.codeExamples || meta?.whatAITaught?.examples || meta?.codeSnippets || meta?.examples || [];
      for (const ex of exList) {
        if (ex.code) {
          examplesActuallyTaught.push({
            title: ex.title || `${note.topic} Example`,
            code: ex.code,
            content: ex.code,
          });
        }
      }

      // Questions & Student Answers
      if (meta?.understandingCheck?.aiQuestion) {
        questionsAsked.push(meta.understandingCheck.aiQuestion);
        if (meta.understandingCheck.studentActualAnswer) {
          studentAnswers.push(meta.understandingCheck.studentActualAnswer);
        }
        if (meta.understandingCheck.evaluation) {
          evaluations.push(`${note.topic}: ${meta.understandingCheck.evaluation} (${meta.understandingCheck.score ?? 85}%)`);
        }
        if (meta.understandingCheck.misconception) {
          mistakes.push(meta.understandingCheck.misconception);
        }
      }

      if (meta?.teacherQuestions && Array.isArray(meta.teacherQuestions)) {
        for (const tq of meta.teacherQuestions) {
          if (tq.question) questionsAsked.push(tq.question);
          if (tq.answer) studentAnswers.push(tq.answer);
          if (tq.feedback) corrections.push(tq.feedback);
        }
      }

      if (meta?.studentQuestions && Array.isArray(meta.studentQuestions)) {
        for (const sq of meta.studentQuestions) {
          if (sq.question) questionsAsked.push(`Student asked: ${sq.question}`);
          if (sq.answer) corrections.push(`AI Mentor answered: ${sq.answer}`);
        }
      }

      // Learning signals
      if (meta?.learningSignals?.strengths) {
        strengths.push(...meta.learningSignals.strengths);
      }
      if (meta?.learningSignals?.needsSupport) {
        needsSupport.push(...meta.learningSignals.needsSupport);
      }
      if (meta?.importantPoints) {
        strengths.push(...meta.importantPoints);
      }
    }

    const uniqueConcepts = Array.from(new Set(conceptsActuallyTaught));
    const uniqueQuestions = Array.from(new Set(questionsAsked));
    const uniqueStrengths = Array.from(new Set(strengths));
    const uniqueNeedsSupport = Array.from(new Set(needsSupport));
    const uniqueMistakes = Array.from(new Set(mistakes));

    const summaryText = notes.length > 0
      ? `Evidence-based recap of ${chapter.title}. You completed ${notes.length} structured learning sessions covering ${notes.map((n) => n.topic).join(", ")}. Demonstrated mastery across core concepts with real evaluation checkpoints.`
      : `Comprehensive recap of ${chapter.title}. This chapter covers foundational logic, syntax, rules, and practical examples.`;

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
      summary: summaryText,
      keyConcepts: uniqueConcepts.length > 0 ? uniqueConcepts : [`Core concepts and principles of ${chapter.title}`],
      importantExamples: examplesActuallyTaught,
      importantSyntax: [],
      whatYouLearned: Array.from(new Set(notes.map((n) => n.topic || n.title))),
      revisionPoints: uniqueMistakes.length > 0
        ? uniqueMistakes.map((m) => `Clarification: ${m}`)
        : uniqueNeedsSupport.length > 0
        ? uniqueNeedsSupport.map((ns) => `Review: ${ns}`)
        : ["Review key syntax and practice exercises before taking the quiz."],
      actualEvidence: {
        notesCount: notes.length,
        conceptsActuallyTaught: uniqueConcepts,
        examplesActuallyTaught: examplesActuallyTaught.slice(0, 5),
        questionsAsked: uniqueQuestions.slice(0, 5),
        studentAnswers: studentAnswers.slice(0, 5),
        evaluations: evaluations.slice(0, 5),
        mistakes: uniqueMistakes,
        corrections: corrections.slice(0, 5),
        strengths: uniqueStrengths,
        needsSupport: uniqueNeedsSupport,
        demonstratedMastery: notes.map((n) => n.topic),
      },
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
 * Persists chapter recap and appends chapter summary note to notebook.
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

    const noteContent = `Chapter Recap & Mastery Summary\n\n${summary}\n\n` +
      `Key Concepts:\n${Array.isArray(keyConcepts) ? keyConcepts.map((k: string) => `• ${k}`).join("\n") : keyConcepts}\n\n` +
      `Decision: ${body.understandingDecision === "TEACH_AGAIN" ? "Teach Chapter Again Requested" : "Chapter Understood & Ready"}`;

    await appendLearningUnitToNotebook({
      userId: user.id,
      courseIdOrSlug: courseId,
      chapterId,
      topic: `Chapter Recap`,
      title: `Chapter Understanding Summary`,
      type: "CHAPTER_RECAP",
      content: noteContent,
      rawMetadata: {
        summary,
        keyConcepts,
        importantSyntax,
        whatYouLearned,
        revisionPoints,
        studentAnswer: body.studentAnswer,
        aiFeedback: body.aiFeedback,
        understandingDecision: body.understandingDecision || "START_NEXT_CHAPTER",
      },
      saveEvent: true,
    });

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
