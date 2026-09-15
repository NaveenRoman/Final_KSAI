import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { generateQuickRecap, generateCheckpointQuestionForTopic } from "@/lib/recap-bank";

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
 * Query params: language (c | cpp | python | java), chapterOrder (optional), topic (optional)
 * Automatically detects the student's last actually studied topic if not specified.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const rawLang = (searchParams.get("language") || "python").toLowerCase().trim();
    const language = rawLang === "c++" ? "cpp" : rawLang;

    let topic = searchParams.get("topic");
    let chapterOrder = parseInt(searchParams.get("chapterOrder") || "0", 10);
    let resolvedCourseId = "";
    let resolvedChapterId = "";

    // If user is authenticated and topic is not explicitly provided, detect last studied topic
    if (user && (!topic || topic === "auto" || topic === "undefined")) {
      try {
        const { getLastMeaningfulTopic } = await import("@/lib/adaptive/resume-service");
        const meaningfulTopic = await getLastMeaningfulTopic({
          userId: user.id,
          courseId: language,
          chapterId: resolvedChapterId,
          chapterLessons: [],
        });
        if (meaningfulTopic) {
          topic = meaningfulTopic;
        }
      } catch (e) {
        console.warn("getLastMeaningfulTopic fallback notice:", e);
      }

      if (!topic || topic === "auto" || topic === "undefined") {
        const latestNote = await db.learningNote.findFirst({
          where: {
            userId: user.id,
            course: { language },
            type: "NOTEBOOK",
          },
          include: {
            chapter: { select: { id: true, orderNumber: true } },
            course: { select: { id: true } },
          },
          orderBy: { updatedAt: "desc" },
        });

        if (latestNote) {
          topic = latestNote.topic;
          chapterOrder = latestNote.chapter?.orderNumber ?? chapterOrder;
          resolvedCourseId = latestNote.courseId;
          resolvedChapterId = latestNote.chapterId;
        }
      }
    }

    if (!topic || topic === "auto" || topic === "undefined") {
      topic = language === "c"
        ? "1. What is C, and Where is it Used?"
        : language === "cpp"
        ? "1. Classes and Objects in C++"
        : language === "java"
        ? "1. Java JVM Architecture & Bytecode"
        : "1. What is Python & Setting Up Your Environment";
    }

    let quickRecap = generateQuickRecap(language, chapterOrder, topic);
    let question = generateCheckpointQuestionForTopic(language, topic);

    // If profile exists, generate genuinely adaptive quick recap tailored to student
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
          if (adapted.recapText) {
            quickRecap.whatWeLearned = adapted.recapText;
          }
          if (adapted.question) {
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
 * Saves/persists interactive quick recap checkpoint into LearningNote table
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

    let targetCourseId = courseId;
    let targetChapterId = chapterId;

    if (!targetCourseId) {
      const cleanLang = language.toLowerCase() === "c++" ? "cpp" : language.toLowerCase();
      const course = await db.course.findFirst({
        where: { language: cleanLang },
        include: { chapters: { take: 1, orderBy: { orderNumber: "asc" } } },
      });
      if (course) {
        targetCourseId = course.id;
        targetChapterId = targetChapterId || course.chapters[0]?.id;
      }
    }

    if (!targetCourseId || !topic) {
      return NextResponse.json(
        { success: false, error: "courseId and topic are required." },
        { status: 400 }
      );
    }

    const content = `Quick Recap & Understanding Check: ${topic}\n\n${whatWeLearned || ""}\n\nTeacher Question:\n${question || ""}\n\nStudent Answer:\n${studentAnswer || "(Voice/Text response)"}\n\nAI Evaluation & Feedback:\n${aiFeedback || "Concept reviewed."}\n\nDecision: ${understandingDecision === "TEACH_AGAIN" ? "Teach Again Requested" : "Understood & Continued"}`;

    const metadata = {
      language,
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

    // Upsert quick recap note
    const existing = await db.learningNote.findFirst({
      where: {
        userId: user.id,
        courseId: targetCourseId,
        topic: `Quick Recap: ${topic}`,
      },
    });

    let note;
    if (existing) {
      note = await db.learningNote.update({
        where: { id: existing.id },
        data: {
          content,
          metadata: JSON.stringify(metadata),
          updatedAt: new Date(),
        },
      });
    } else {
      note = await db.learningNote.create({
        data: {
          userId: user.id,
          courseId: targetCourseId,
          chapterId: targetChapterId || "chapter-default",
          topic: `Quick Recap: ${topic}`,
          title: `Quick Recap • ${topic}`,
          type: "QUICK_RECAP",
          content,
          metadata: JSON.stringify(metadata),
          importance: 3,
        },
      });
    }

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
