import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import {
  appendLearningUnitToNotebook,
  getCourseNotebookPage,
  resolveCourse,
  normalizeCourseSlug,
  StructuredLearningContext,
} from "@/lib/notebook/notebook-service";

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

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getLocalDateKey(date: Date, offsetMinutes: number = 0): string {
  const localTime = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return localTime.toISOString().split("T")[0];
}

/**
 * GET /api/notes
 *
 * Query params:
 * - course / courseId / language: (Required or defaults to python)
 * - page: (optional, default: 1) physical A4 notebook page number
 * - mode: (optional, "page" | "all", default: "page")
 * - chapterId: (optional filter)
 * - topic: (optional filter)
 *
 * Guarantees:
 * - Server-side authentication and user isolation
 * - Strict course isolation (Python only shows Python, Java only shows Java, etc.)
 * - Strict chronological ordering: sequenceOrder ASC, createdAt ASC (oldest first)
 * - Physical A4 page metadata (pageNumber, totalPages, hasPrevious, hasNext)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;

    const rawCourseParam =
      searchParams.get("courseId") ||
      searchParams.get("course") ||
      searchParams.get("language") ||
      "python";

    const chapterId = searchParams.get("chapterId");
    const topic = searchParams.get("topic");
    const requestedPage = parseInt(searchParams.get("page") || "1", 10);
    const mode = searchParams.get("mode") || (searchParams.has("page") ? "page" : "page");
    const timezoneOffset = parseInt(searchParams.get("timezoneOffset") || "0", 10);

    // Resolve course
    const course = await resolveCourse(rawCourseParam);

    // If requesting specific A4 page
    if (mode === "page") {
      const pageData = await getCourseNotebookPage({
        userId: user.id,
        courseIdOrSlug: course.id,
        requestedPageNumber: requestedPage,
      });

      // Also generate chronological day mapping for legacy view compatibility
      const daysMap = new Map<string, any>();
      for (const note of pageData.notes) {
        const dayKey = getLocalDateKey(new Date(note.createdAt), timezoneOffset);
        let dayGroup = daysMap.get(dayKey);
        if (!dayGroup) {
          dayGroup = {
            date: dayKey,
            formattedDate: formatDisplayDate(dayKey),
            courses: [pageData.course],
            chapters: [],
            notes: [],
          };
          daysMap.set(dayKey, dayGroup);
        }
        dayGroup.notes.push(note);
      }

      return NextResponse.json({
        success: true,
        course: pageData.course,
        pageNumber: pageData.pageNumber,
        totalPages: pageData.totalPages,
        hasPrevious: pageData.hasPrevious,
        hasNext: pageData.hasNext,
        totalUnitsOnPage: pageData.totalUnitsOnPage,
        chaptersOnPage: pageData.chaptersOnPage,
        notes: pageData.notes,
        days: Array.from(daysMap.values()),
        createdAt: pageData.createdAt,
        updatedAt: pageData.updatedAt,
      });
    }

    // mode === "all": Retrieve all notes for this course chronologically (sequenceOrder ASC)
    const notes = await db.learningNote.findMany({
      where: {
        userId: user.id,
        courseId: course.id,
        ...(chapterId ? { chapterId } : {}),
        ...(topic ? { topic } : {}),
      },
      include: {
        course: {
          select: { id: true, title: true, language: true },
        },
        chapter: {
          select: { id: true, title: true, orderNumber: true },
        },
      },
      // Strict chronological ordering: oldest learning content first
      orderBy: [
        { sequenceOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    const totalPagesCount = await db.notebookPage.count({
      where: {
        userId: user.id,
        courseId: course.id,
      },
    });

    const totalPages = Math.max(1, totalPagesCount);

    // Group notes day-wise chronologically
    const daysMap = new Map<string, any>();
    for (const note of notes) {
      const dayKey = getLocalDateKey(new Date(note.createdAt), timezoneOffset);
      let dayGroup = daysMap.get(dayKey);
      if (!dayGroup) {
        dayGroup = {
          date: dayKey,
          formattedDate: formatDisplayDate(dayKey),
          courses: [course],
          chapters: [],
          notes: [],
        };
        daysMap.set(dayKey, dayGroup);
      }
      dayGroup.notes.push(note);
    }

    return NextResponse.json({
      success: true,
      course,
      pageNumber: 1,
      totalPages,
      hasPrevious: false,
      hasNext: totalPages > 1,
      totalUnits: notes.length,
      notes,
      days: Array.from(daysMap.values()),
    });
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load notes.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 *
 * Creates and appends a structured learning unit to the student's physical A4 notebook.
 *
 * Guarantees:
 * - Server authentication
 * - Strict course and user isolation
 * - Strict monotonic sequenceOrder (chronological append)
 * - Safe topic revisiting: appends new evidence; never overwrites previous history
 * - Rich learning context persistence
 */
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

    let {
      courseId,
      course,
      language,
      chapterId,
      topicId,
      topic,
      subtopic,
      title,
      type = "NOTEBOOK",
      content,
      metadata,
      structuredContext,
      sessionKey,
      saveEvent,
    } = body;

    const courseParam = courseId || course || language || "python";

    if (!topic && title) {
      topic = title;
    }
    if (!title && topic) {
      title = topic;
    }

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: "topic is required.",
        },
        { status: 400 }
      );
    }

    // Extract structured context from body or metadata if passed as object
    let parsedContext: Partial<StructuredLearningContext> | undefined = structuredContext;
    if (!parsedContext && metadata) {
      if (typeof metadata === "object") {
        parsedContext = {
          whatAITaught: {
            concept: metadata.whatILearned || metadata.concept || topic,
            explanation: metadata.whatILearned || content || "",
            importantPoints: metadata.importantPoints || metadata.coreConcepts || [],
            examples: metadata.examples || [],
            codeExamples: metadata.codeSnippets || metadata.examples || [],
          },
          studentInteraction: {
            studentQuestions: metadata.studentQuestions || [],
          },
          understandingCheck: metadata.teacherQuestions?.[0]
            ? {
                aiQuestion: metadata.teacherQuestions[0].question,
                studentActualAnswer: metadata.teacherQuestions[0].answer,
                evaluation: metadata.teacherQuestions[0].result || "CORRECT",
                score: metadata.teacherQuestions[0].score ?? 85,
                misconception: metadata.teacherQuestions[0].misconception || null,
              }
            : undefined,
          learningSignals: {
            strengths: Array.isArray(metadata.importantPoints) ? metadata.importantPoints : [],
            needsSupport: [],
          },
        };
      }
    }

    const note = await appendLearningUnitToNotebook({
      userId: user.id,
      courseIdOrSlug: courseParam,
      chapterId: chapterId || "chapter-default",
      topicId,
      topic,
      subtopic,
      title,
      type,
      content,
      sessionKey,
      structuredContext: parsedContext,
      rawMetadata: metadata,
      saveEvent: saveEvent !== false,
    });

    return NextResponse.json(
      {
        success: true,
        note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create note.",
      },
      { status: 500 }
    );
  }
}