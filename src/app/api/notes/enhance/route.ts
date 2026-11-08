import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { checkCourseAccess } from "@/lib/subscription-service";

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

  if (!sessionTokenRaw) return null;

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      courseId,
      chapterId,
      topic,
    } = body;

    if (!courseId || !chapterId || !topic) {
      return NextResponse.json(
        {
          success: false,
          error: "courseId, chapterId and topic are required.",
        },
        { status: 400 }
      );
    }

    // Authoritative Course Access Gate
    const access = await checkCourseAccess(user.id, courseId);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to generate AI note enhancements."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? "Your current subscription does not cover this course."
              : "Active course enrollment is required.",
          lockReason: access.reason,
        },
        { status: 403 }
      );
    }

    /*
     * ---------------------------------------------------------
     * COLLECT THE STUDENT'S REAL LEARNING DATA
     * ---------------------------------------------------------
     */

    const notes = await db.learningNote.findMany({
      where: {
        userId: user.id,
        courseId,
        chapterId,
        topic,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const progress = await db.topicProgress.findFirst({
      where: {
        userId: user.id,
        courseId,
        chapterId,
        topic,
      },
    });

    if (notes.length === 0) {
      return NextResponse.json({
        success: true,
        enhanced: false,
        message: "No learning data available yet.",
      });
    }

    /*
     * ---------------------------------------------------------
     * BUILD AI-ENHANCED SECTIONS
     *
     * For now these are generated deterministically from the
     * student's actual learning records.
     *
     * The AI provider can be connected here afterward.
     * ---------------------------------------------------------
     */

    const explanations = notes.filter(
      (n) => n.type === "EXPLANATION"
    );

    const examples = notes.filter(
      (n) => n.type === "EXAMPLE"
    );

    const questions = notes.filter(
      (n) => n.type === "QUESTION"
    );

    const mistakes = notes.filter(
      (n) => n.type === "MISTAKE"
    );

    const corrections = notes.filter(
      (n) => n.type === "CORRECTION"
    );

    const practice = notes.filter(
      (n) => n.type === "PRACTICE"
    );

    const visuals = notes.filter(
      (n) => n.type === "VISUAL"
    );

    const tips = notes.filter(
      (n) => n.type === "TIP"
    );

    /*
     * ---------------------------------------------------------
     * QUICK RECAP
     * ---------------------------------------------------------
     */

    const recapParts: string[] = [];

    if (explanations.length > 0) {
      recapParts.push(explanations[explanations.length - 1].content);
    }

    if (examples.length > 0) {
      recapParts.push(
        `Example: ${examples[examples.length - 1].content}`
      );
    }

    const quickRecap =
      recapParts.length > 0
        ? recapParts.join("\n\n")
        : `You have started learning ${topic}.`;

    /*
     * ---------------------------------------------------------
     * REMEMBER
     * ---------------------------------------------------------
     */

    const remember =
      tips.length > 0
        ? tips
            .slice(-3)
            .map((n) => `• ${n.content}`)
            .join("\n")
        : explanations.length > 0
          ? explanations
              .slice(-2)
              .map((n) => `• ${n.content}`)
              .join("\n")
          : `Keep the core idea of ${topic} in mind and practice it.`;

    /*
     * ---------------------------------------------------------
     * COMMON MISTAKE
     * ---------------------------------------------------------
     */

    const commonMistake =
      mistakes.length > 0
        ? mistakes
            .slice(-3)
            .map((n) => `• ${n.content}`)
            .join("\n")
        : "No mistake has been recorded for this topic yet.";

    /*
     * ---------------------------------------------------------
     * YOU SHOULD NOW BE ABLE TO
     * ---------------------------------------------------------
     */

    const abilities: string[] = [];

    if (explanations.length > 0) {
      abilities.push("Explain the main concept");
    }

    if (examples.length > 0) {
      abilities.push("Understand a practical example");
    }

    if (questions.length > 0 || corrections.length > 0) {
      abilities.push("Answer questions about the concept");
    }

    if (practice.length > 0) {
      abilities.push("Apply the concept in practice");
    }

    if (visuals.length > 0) {
      abilities.push("Understand the concept visually");
    }

    if (abilities.length === 0) {
      abilities.push(`Understand the fundamentals of ${topic}`);
    }

    /*
     * ---------------------------------------------------------
     * QUESTIONS
     * ---------------------------------------------------------
     */

    const studentQuestions =
      questions.length > 0
        ? questions
            .slice(-5)
            .map((n) => `• ${n.content}`)
            .join("\n")
        : "No questions recorded yet.";

    /*
     * ---------------------------------------------------------
     * PRACTICE
     * ---------------------------------------------------------
     */

    const practiceSummary =
      practice.length > 0
        ? practice
            .slice(-5)
            .map((n) => `• ${n.content}`)
            .join("\n")
        : "No practice activity recorded yet.";

    /*
     * ---------------------------------------------------------
     * VISUALS
     * ---------------------------------------------------------
     */

    const visualSummary =
      visuals.length > 0
        ? visuals
            .slice(-5)
            .map((n) => `• ${n.content}`)
            .join("\n")
        : "No visual explanation recorded yet.";

    /*
     * ---------------------------------------------------------
     * REVIEW RECOMMENDATION
     * ---------------------------------------------------------
     */

    let review = "Continue practicing this topic.";

    if (
      progress?.status === "NEEDS_REVIEW" ||
      mistakes.length >= 2
    ) {
      review =
        `Review ${topic} before moving to a more advanced concept.`;
    } else if (
      progress?.status === "MASTERED" ||
      (progress?.masteryScore ?? 0) >= 80
    ) {
      review =
        `You appear comfortable with ${topic}. Try a harder problem next.`;
    } else if (progress?.status === "LEARNING") {
      review =
        `Continue practicing ${topic} until you can explain it without help.`;
    }

    /*
     * ---------------------------------------------------------
     * SAVE ENHANCED NOTE
     * ---------------------------------------------------------
     */

    const enhancedContent = JSON.stringify({
      quickRecap,
      remember,
      commonMistake,
      youShouldBeAbleTo: abilities,
      practice: practiceSummary,
      questions: studentQuestions,
      visuals: visualSummary,
      review,
    });

    const enhancedNote = await db.learningNote.create({
      data: {
        userId: user.id,
        courseId,
        chapterId,
        topic,
        title: `${topic} — AI Learning Summary`,
        type: "TIP",
        content: enhancedContent,
        metadata: JSON.stringify({
          enhanced: true,
          version: 1,
          sourceNoteCount: notes.length,
          generatedAt: new Date().toISOString(),
        }),
        importance: 5,
        isPinned: true,
      },
    });

    return NextResponse.json({
      success: true,
      enhanced: true,
      note: enhancedNote,
      summary: {
        quickRecap,
        remember,
        commonMistake,
        youShouldBeAbleTo: abilities,
        practice: practiceSummary,
        questions: studentQuestions,
        visuals: visualSummary,
        review,
      },
    });
  } catch (error) {
    console.error("AI note enhancement error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to enhance learning notes.",
      },
      { status: 500 }
    );
  }
}