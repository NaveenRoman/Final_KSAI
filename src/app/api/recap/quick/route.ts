import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { generateQuickRecap, generateCheckpointQuestionForTopic } from "@/lib/recap-bank";
import { appendLearningUnitToNotebook, resolveCourse } from "@/lib/notebook/notebook-service";

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
 * GET /api/recap/quick
 *
 * Grounded directly on the student's actual accumulated Learning Notebook context.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const rawLang = (searchParams.get("language") || searchParams.get("course") || "python").toLowerCase().trim();
    const language = rawLang === "c++" ? "cpp" : rawLang;

    let topic = searchParams.get("topic");
    let chapterOrder = parseInt(searchParams.get("chapterOrder") || "0", 10);
    let resolvedCourseId = "";
    let resolvedChapterId = "";

    const courseObj = await resolveCourse(language);
    resolvedCourseId = courseObj.id;

    // Fetch the student's latest chronologically completed learning note in this course
    let latestNote: any = null;

    if (user) {
      latestNote = await db.learningNote.findFirst({
        where: {
          userId: user.id,
          courseId: resolvedCourseId,
        },
        include: {
          chapter: { select: { id: true, orderNumber: true, title: true } },
          course: { select: { id: true, language: true, title: true } },
        },
        orderBy: [
          { sequenceOrder: "desc" },
          { createdAt: "desc" },
        ],
      });

      if (latestNote && (!topic || topic === "auto" || topic === "undefined")) {
        topic = latestNote.topic;
        chapterOrder = latestNote.chapter?.orderNumber ?? chapterOrder;
        resolvedChapterId = latestNote.chapterId;
      }
    }

    // Fallback topic if no history
    if (!topic || topic === "auto" || topic === "undefined") {
      topic = language === "c"
        ? "1. What is C, and Where is it Used?"
        : language === "cpp"
        ? "1. Classes and Objects in C++"
        : language === "java"
        ? "1. Java JVM Architecture & Bytecode"
        : "1. What is Python & Setting Up Your Environment";
    }

    // Parse actual learning context from latest note
    let meta: any = null;
    if (latestNote?.metadata) {
      try {
        meta = typeof latestNote.metadata === "string" ? JSON.parse(latestNote.metadata) : latestNote.metadata;
      } catch {
        meta = null;
      }
    }

    const whatAITaughtActual =
      meta?.whatAITaught?.explanation ||
      meta?.whatILearned ||
      latestNote?.content ||
      `Core concepts covered in ${topic}.`;

    const whatStudentAnsweredActual =
      meta?.understandingCheck?.studentActualAnswer ||
      meta?.teacherQuestions?.[0]?.answer ||
      (meta?.studentQuestions?.[0]?.question ? `Asked: "${meta.studentQuestions[0].question}"` : null);

    const whatWasUnderstoodActual =
      meta?.learningSignals?.strengths ||
      meta?.importantPoints ||
      meta?.coreConcepts ||
      [];

    const whatNeedsSupportActual =
      meta?.learningSignals?.needsSupport ||
      (meta?.understandingCheck?.misconception ? [meta.understandingCheck.misconception] : []);

    const whereStopped = topic;

    // Base quick recap template
    let quickRecap = generateQuickRecap(language, chapterOrder, topic);
    let question = generateCheckpointQuestionForTopic(language, topic);

    // Enrich with actual learning context
    if (latestNote) {
      quickRecap.whatWeLearned = `Welcome back! In your last session, you studied ${topic}.\n\n` +
        `What you covered: ${meta?.whatAITaught?.concept || topic}.\n` +
        (whatWasUnderstoodActual.length > 0 ? `Demonstrated understanding: ${whatWasUnderstoodActual.slice(0, 2).join(", ")}.\n` : "") +
        (whatNeedsSupportActual.length > 0 ? `Keep in mind: ${whatNeedsSupportActual[0]}.\n` : "") +
        `Resuming directly from ${whereStopped}.`;

      if (meta?.understandingCheck?.aiQuestion) {
        question = meta.understandingCheck.aiQuestion;
      }
    }

    // Adaptive profile enrichment
    if (user) {
      try {
        const { getTopicLearningProfile } = await import("@/lib/adaptive/profile-service");
        const { buildAdaptiveQuickRecap } = await import("@/lib/adaptive/teaching-adapter");
        const profile = await getTopicLearningProfile(user.id, language, topic);
        if (profile) {
          const adapted = buildAdaptiveQuickRecap({
            topic,
            course: language,
            profile,
          });
          if (adapted.recapText && !latestNote) {
            quickRecap.whatWeLearned = adapted.recapText;
          }
          if (adapted.question && !meta?.understandingCheck?.aiQuestion) {
            question = adapted.question;
          }
        }
      } catch (err) {
        console.warn("Adaptive quick recap enrichment notice:", err);
      }
    }

    return NextResponse.json({
      success: true,
      lastStudiedTopic: topic,
      chapterOrder,
      courseId: resolvedCourseId,
      chapterId: resolvedChapterId,
      recap: quickRecap,
      question,
      actualLearningContext: {
        whatAITaught: whatAITaughtActual,
        whatStudentAnswered: whatStudentAnsweredActual,
        whatWasUnderstood: whatWasUnderstoodActual,
        whatNeedsSupport: whatNeedsSupportActual,
        whereStopped,
      },
    });
  } catch (error) {
    console.error("GET /api/recap/quick error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate quick recap." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recap/quick
 *
 * Saves/persists interactive quick recap checkpoint into Learning Notebook
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
      language = "python",
      topic,
      whatWeLearned,
      keyConcept,
      importantSyntaxOrRule,
      codeExample,
      oneThingToRemember,
      question,
      studentAnswer,
      aiFeedback,
      understandingDecision, // "CONTINUE" | "TEACH_AGAIN"
    } = body;

    const courseObj = await resolveCourse(courseId || language);

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "topic is required." },
        { status: 400 }
      );
    }

    const content = `Quick Recap & Understanding Check: ${topic}\n\n` +
      `${whatWeLearned || ""}\n\n` +
      `Teacher Question:\n${question || ""}\n\n` +
      `Student Answer:\n${studentAnswer || "(Voice/Text response)"}\n\n` +
      `AI Evaluation & Feedback:\n${aiFeedback || "Concept reviewed."}\n\n` +
      `Decision: ${understandingDecision === "TEACH_AGAIN" ? "Teach Again Requested" : "Understood & Continued"}`;

    const metadata = {
      language: courseObj.language,
      topic,
      whatWeLearned,
      keyConcept,
      importantSyntaxOrRule,
      codeExample,
      oneThingToRemember,
      question,
      studentAnswer,
      aiFeedback,
      understandingDecision: understandingDecision || "CONTINUE",
      completedAt: new Date().toISOString(),
    };

    const note = await appendLearningUnitToNotebook({
      userId: user.id,
      courseIdOrSlug: courseObj.id,
      chapterId: chapterId || "chapter-default",
      topic: `Quick Recap: ${topic}`,
      title: `Quick Recap • ${topic}`,
      type: "QUICK_RECAP",
      content,
      rawMetadata: metadata,
      saveEvent: true,
    });

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("POST /api/recap/quick error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to persist quick recap." },
      { status: 500 }
    );
  }
}
