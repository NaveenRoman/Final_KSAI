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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      noteId,
      question,
    } = body;

    if (!noteId) {
      return NextResponse.json(
        {
          success: false,
          error: "noteId is required.",
        },
        { status: 400 }
      );
    }

    const note = await db.learningNote.findFirst({
      where: {
        id: noteId,
        userId: user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            language: true,
          },
        },
        chapter: {
          select: {
            id: true,
            title: true,
            orderNumber: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: "Learning note not found.",
        },
        { status: 404 }
      );
    }

    // Authoritative Course Access Gate
    const access = await checkCourseAccess(user.id, note.courseId);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to run AI note explanations."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? "Your current subscription does not cover this course."
              : "Active course enrollment is required.",
          lockReason: access.reason,
        },
        { status: 403 }
      );
    }

    /*
     * Send the note through the existing teaching engine.
     *
     * The note itself becomes the lesson context.
     */

    const teachingRequest = {
      course: note.course?.title || "Programming",
      chapter: note.chapter?.title || "Learning Notes",
      topic: note.topic,
      content: note.content,
      question:
        question ||
        `Explain this saved note to me in simpler language. 
Use intuition, a small example and a short check-for-understanding question.`,
      mode: "explain",
      history: [],
    };

    /*
     * Use the existing Next.js teacher endpoint.
     *
     * This keeps Phase 9 connected to the Teaching Engine
     * instead of creating a second AI implementation.
     */

    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin;

    const aiResponse = await fetch(
      `${origin}/api/ai/teacher`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          message: teachingRequest.question,
          quickAction: "explain",
          courseLanguage: note.course?.language || "python",
        }),
        cache: "no-store",
      }
    );

    let aiData: any = null;

    try {
      aiData = await aiResponse.json();
    } catch {
      aiData = null;
    }

    /*
     * If the Teaching Engine returns a response,
     * use it directly.
     */

    if (aiResponse.ok && aiData) {
      const explanation =
        aiData?.data?.response ||
        aiData?.data?.text ||
        aiData?.response ||
        aiData?.text ||
        aiData?.message;

      if (typeof explanation === "string" && explanation.trim()) {
        return NextResponse.json({
          success: true,
          explanation,
          sourceNote: {
            id: note.id,
            title: note.title,
            topic: note.topic,
          },
        });
      }
    }

    /*
     * Safe fallback.
     *
     * We do not invent information. We simply present
     * the saved note as the explanation context.
     */

    return NextResponse.json({
      success: true,
      explanation:
        `Let's understand this step by step.\n\n` +
        `${note.content}\n\n` +
        `Think about the main idea above and try explaining it in your own words.`,
      sourceNote: {
        id: note.id,
        title: note.title,
        topic: note.topic,
      },
      fallback: true,
    });
  } catch (error) {
    console.error("Explain note error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to explain this note.",
      },
      { status: 500 }
    );
  }
}