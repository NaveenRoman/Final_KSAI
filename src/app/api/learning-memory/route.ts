import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

async function resolveAuthenticatedUser(request: NextRequest) {
  let sessionData = null;
  try {
    sessionData = await auth.api.getSession({ headers: request.headers });
  } catch {
    try {
      sessionData = await auth.api.getSession({ headers: await headers() });
    } catch {
      // ignore
    }
  }

  let user = sessionData?.user as any;

  if (!user) {
    let sessionTokenRaw =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("sessionToken")?.value;

    if (!sessionTokenRaw) {
      try {
        const cookieStore = await cookies();
        sessionTokenRaw =
          cookieStore.get("better-auth.session_token")?.value ||
          cookieStore.get("sessionToken")?.value;
      } catch {
        // ignore
      }
    }

    if (sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        user = dbSession.user;
      }
    }
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await resolveAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const queryEmail = request.nextUrl.searchParams.get("userEmail");
    const isAdmin =
      authUser.role === "Admin" ||
      authUser.role === "SUPER_ADMIN" ||
      authUser.role === "SuperAdmin";

    if (
      queryEmail &&
      queryEmail.trim().toLowerCase() !== authUser.email.toLowerCase() &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot access another user's learning records",
        },
        { status: 403 }
      );
    }

    const targetEmail = queryEmail?.trim() || authUser.email;

    const user = await db.user.findUnique({
      where: {
        email: targetEmail,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const progress =
      await db.topicProgress.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    const needsReview = progress.filter(
      item =>
        item.status === "NEEDS_REVIEW"
    );

    const mastered = progress.filter(
      item =>
        item.status === "MASTERED"
    );

    const learning = progress.filter(
      item =>
        item.status === "LEARNING"
    );

    const practiced = progress.filter(
      item =>
        item.status === "PRACTICED"
    );

    const total = progress.length;

    const masteryPercentage =
      total > 0
        ? Math.round(
            (mastered.length / total) * 100
          )
        : 0;

    /*
     * Recent weak topics
     */
    const reviewTopics =
      needsReview
        .slice(0, 10)
        .map(item => ({
          topic: item.topic,
          chapterId: item.chapterId,
          masteryScore:
            item.masteryScore,
          attempts: item.attempts,
          accuracy:
            item.totalQuestions > 0
              ? Math.round(
                  (item.correctAnswers /
                    item.totalQuestions) *
                    100
                )
              : 0,
          recommendation:
            `Review ${item.topic} before moving to harder concepts.`,
        }));

    /*
     * Strong topics
     */
    const masteredTopics =
      mastered
        .slice(0, 10)
        .map(item => ({
          topic: item.topic,
          chapterId: item.chapterId,
          masteryScore:
            item.masteryScore,
        }));

    return NextResponse.json({
      success: true,

      memory: {
        totalTopics: total,

        mastered: mastered.length,
        learning: learning.length,
        practiced: practiced.length,
        needsReview: needsReview.length,

        masteryPercentage,

        reviewTopics,
        masteredTopics,
      },
    });
  } catch (error) {
    console.error(
      "Learning memory error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load learning memory.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await resolveAuthenticatedUser(request);
    if (!authUser) {
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
      userEmail,
      courseId,
      chapterId,
      topic,
      memoryType,
      key,
      content,
      confidence = 50,
      priority = 1,
    } = body;

    const isAdmin =
      authUser.role === "Admin" ||
      authUser.role === "SUPER_ADMIN" ||
      authUser.role === "SuperAdmin";

    if (
      userEmail &&
      String(userEmail).trim().toLowerCase() !== authUser.email.toLowerCase() &&
      !isAdmin
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cannot record learning memory for another user",
        },
        { status: 403 }
      );
    }

    if (
      !courseId ||
      !chapterId ||
      !topic ||
      !memoryType ||
      !key ||
      !content
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required learning memory fields.",
        },
        { status: 400 }
      );
    }

    const allowedMemoryTypes = [
      "STRUGGLE",
      "STRENGTH",
      "PREFERENCE",
      "MISTAKE",
      "MASTERY",
      "REVIEW",
    ];

    if (!allowedMemoryTypes.includes(memoryType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid memoryType.",
        },
        { status: 400 }
      );
    }

    const targetEmail = userEmail ? String(userEmail).trim() : authUser.email;

    const user = await db.user.findUnique({
      where: {
        email: targetEmail,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const existing =
      await db.learningMemory.findUnique({
        where: {
          userId_topic_memoryType_key: {
            userId: user.id,
            topic,
            memoryType,
            key,
          },
        },
      });

    let memory;

    if (existing) {
      memory =
        await db.learningMemory.update({
          where: {
            id: existing.id,
          },
          data: {
            courseId,
            chapterId,
            content,
            confidence: Math.max(
              0,
              Math.min(100, Number(confidence))
            ),
            priority: Math.max(
              1,
              Number(priority)
            ),
            occurrences: {
              increment: 1,
            },
            lastObserved: new Date(),
            isActive: true,
          },
        });
    } else {
      memory =
        await db.learningMemory.create({
          data: {
            userId: user.id,
            courseId,
            chapterId,
            topic,
            memoryType,
            key,
            content,
            confidence: Math.max(
              0,
              Math.min(100, Number(confidence))
            ),
            priority: Math.max(
              1,
              Number(priority)
            ),
            occurrences: 1,
            lastObserved: new Date(),
            isActive: true,
          },
        });
    }

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error(
      "Learning memory save error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to save learning memory.",
      },
      { status: 500 }
    );
  }
}