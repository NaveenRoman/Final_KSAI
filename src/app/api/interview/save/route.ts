import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { awardXpAndStreak } from "@/lib/xp-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      interviewType = "technical",
      title,
      role = "Software Engineer",
      technology = "Java",
      score = 0,
      technicalScore,
      communicationScore,
      relevanceScore,
      totalQuestions = 1,
      completedQuestions = 0,
      durationSeconds = 0,
    } = body;

    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    // 1. Resolve and authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let user = session?.user as any;

    if (!user && sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        user = dbSession.user;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // 2. Enforce strict completion criteria
    const totalQ = Math.max(1, Number(totalQuestions) || 1);
    const completedQ = Math.max(0, Number(completedQuestions) || 0);

    if (completedQ <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete interview: At least 1 question must be answered to record a completed interview.",
        },
        { status: 400 }
      );
    }

    // 3. Server-side score validation and capping based on actual completion
    const completionRatio = Math.min(1, completedQ / totalQ);
    const maxAllowableScore = Math.min(100, Math.round(completionRatio * 100));
    const safeScore = Math.min(maxAllowableScore, Math.max(0, Math.round(Number(score) || 0)));

    const safeTechnicalScore = technicalScore !== undefined
      ? Math.min(maxAllowableScore, Math.max(0, Math.round(Number(technicalScore))))
      : safeScore;
    const safeCommunicationScore = communicationScore !== undefined
      ? Math.min(100, Math.max(0, Math.round(Number(communicationScore))))
      : safeScore;
    const safeRelevanceScore = relevanceScore !== undefined
      ? Math.min(maxAllowableScore, Math.max(0, Math.round(Number(relevanceScore))))
      : safeScore;

    // 4. Duplicate submission and duplicate XP prevention (30-second window / sessionId check)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const recentDuplicate = await db.activityLog.findFirst({
      where: {
        userId: user.id,
        actionType: "INTERVIEW_COMPLETE",
        createdAt: { gte: thirtySecondsAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentDuplicate) {
      let existingMeta: any = {};
      try {
        existingMeta = JSON.parse(recentDuplicate.metadata || "{}");
      } catch {
        existingMeta = {};
      }

      const isSameSession = sessionId && existingMeta.sessionId === sessionId;
      const isRapidDuplicate =
        existingMeta.technology === technology && existingMeta.interviewType === interviewType;

      if (isSameSession || isRapidDuplicate) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "Interview session already recorded. Duplicate submission prevented.",
          activityId: recentDuplicate.id,
          xpAwarded: 0,
        });
      }
    }

    const interviewTitle =
      title ||
      `${technology} ${
        interviewType === "hr"
          ? "HR"
          : interviewType === "coding"
          ? "Coding"
          : interviewType === "mock"
          ? "Mock"
          : "Technical"
      } Interview`;

    const metadataPayload = {
      sessionId: sessionId || `intv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      interviewType,
      title: interviewTitle,
      role,
      technology,
      score: safeScore,
      technicalScore: safeTechnicalScore,
      communicationScore: safeCommunicationScore,
      relevanceScore: safeRelevanceScore,
      totalQuestions: totalQ,
      completedQuestions: completedQ,
      durationSeconds: Math.max(0, Number(durationSeconds) || 0),
    };

    // 5. Persist genuine interview completion log
    const activity = await db.activityLog.create({
      data: {
        userId: user.id,
        actionType: "INTERVIEW_COMPLETE",
        metadata: JSON.stringify(metadataPayload),
      },
    });

    // 6. Award genuine XP atomically based on completion and score (capped at 50 XP)
    const xpAwarded = Math.round(25 * completionRatio) + Math.round((safeScore / 100) * 25);
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    let finalXpAwarded = 0;

    if (dbUser && xpAwarded > 0) {
      const effectiveSessionId = sessionId || `intv_${activity.id}`;
      const xpResult = await awardXpAndStreak({
        userId: user.id,
        amount: xpAwarded,
        source: "interview_mock",
        idempotencyKey: `interview_${effectiveSessionId}`,
      });
      finalXpAwarded = xpResult.xpAwarded;

      if (xpResult.user && xpResult.user.level > dbUser.level) {
        await db.notification.create({
          data: {
            userId: user.id,
            title: "Level Up! 🎯",
            message: `Congratulations! You've reached Level ${xpResult.user.level} through AI Mock Interview practice!`,
            read: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      activityId: activity.id,
      xpAwarded: finalXpAwarded,
      metadata: metadataPayload,
    });
  } catch (error: any) {
    console.error("Save Interview API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record interview session" },
      { status: 500 }
    );
  }
}
