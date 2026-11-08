import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { XP_CONFIG } from "@/lib/xp-config";
import { awardXpAndStreak } from "@/lib/xp-service";
import { checkCourseAccess } from "@/lib/subscription-service";
import { getChallengeById } from "@/lib/challenges/challenge-bank";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { chapterId, challengeId } = body;
    const difficultyRaw = (body.difficulty || "EASY").toString().toUpperCase();

    // Check for explicit submission failure
    if (body.passed === false || body.status === "failed" || body.solved === false) {
      return NextResponse.json({
        success: false,
        passed: false,
        xpEarned: 0,
        message: "Challenge submission failed or test cases did not pass.",
      });
    }

    // 1. Resolve requesting user via Better Auth or session token cookie
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Authoritatively resolve course from trusted DB records / challenge definitions
    // Never trust client-supplied courseId, user claims, or parameters
    let trustedCourse: { id: string; language: string; title: string } | null = null;
    let resolvedChapter: { id: string; courseId: string } | null = null;

    if (chapterId && typeof chapterId === "string") {
      const parsedOrder = parseInt(chapterId.replace(/[^0-9]/g, ""), 10);
      const ch = await db.chapter.findFirst({
        where: {
          OR: [
            { id: chapterId },
            ...(!isNaN(parsedOrder) ? [{ orderNumber: parsedOrder }] : []),
          ],
        },
        include: {
          course: {
            select: { id: true, language: true, title: true },
          },
        },
      });

      if (ch?.course) {
        trustedCourse = ch.course;
        resolvedChapter = { id: ch.id, courseId: ch.courseId };
      }
    }

    if (!trustedCourse && challengeId && typeof challengeId === "string") {
      const challengeDef = getChallengeById(challengeId);
      if (challengeDef?.course) {
        const c = await db.course.findFirst({
          where: { language: challengeDef.course.toLowerCase() },
          select: { id: true, language: true, title: true },
        });
        if (c) {
          trustedCourse = c;
        }
      }
    }

    if (!trustedCourse) {
      return NextResponse.json(
        { error: "Unable to authoritatively determine course for this challenge submission." },
        { status: 400 }
      );
    }

    // 3. Authoritative Course Access Check (enforces active subscription and purchase scope)
    const access = await checkCourseAccess(user.id, trustedCourse.language);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to submit challenges."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? `Your current subscription does not cover ${trustedCourse.title || trustedCourse.language}. Upgrade your plan to submit this challenge.`
              : `Active subscription is required to submit challenges.`,
          success: false,
          locked: true,
          lockReason: access.reason,
        },
        { status: 403 }
      );
    }

    // Validate difficulty tier (EASY: 30 XP, MEDIUM: 75 XP, HARD: 150 XP)
    const validTiers = ["EASY", "MEDIUM", "HARD"] as const;
    const difficultyTier = (validTiers as readonly string[]).includes(difficultyRaw)
      ? (difficultyRaw as (typeof validTiers)[number])
      : "EASY";

    const amount = XP_CONFIG.CHALLENGE_SOLVED[difficultyTier];

    // Check for prior solve to enforce idempotency
    let isAlreadySolved = false;
    let existingProgress = null;

    const targetChapterId = resolvedChapter?.id || chapterId || null;

    if (targetChapterId) {
      existingProgress = await db.chapterProgress.findUnique({
        where: {
          userId_chapterId: {
            userId: user.id,
            chapterId: targetChapterId,
          },
        },
      });

      if (existingProgress?.codeSolved) {
        isAlreadySolved = true;
      }
    }

    const targetId = challengeId || targetChapterId || null;
    if (!isAlreadySolved && targetId) {
      const previousSolveLog = await db.activityLog.findFirst({
        where: {
          userId: user.id,
          actionType: "CHALLENGE_SOLVED",
          metadata: { contains: targetId },
        },
      });
      if (previousSolveLog) {
        isAlreadySolved = true;
      }
    }

    // Idempotent behavior: if already solved, do NOT award duplicate XP
    if (isAlreadySolved) {
      const currentUser = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, currentStreak: true, longestStreak: true },
      });

      return NextResponse.json({
        success: true,
        alreadySolved: true,
        difficulty: difficultyTier,
        xpEarned: 0,
        currentStreak: currentUser?.currentStreak ?? 0,
        longestStreak: currentUser?.longestStreak ?? 0,
        message: "Challenge already solved previously; no additional XP awarded.",
      });
    }

    // Mark codeSolved on chapter progress if targetChapterId is provided
    if (targetChapterId) {
      if (existingProgress) {
        await db.chapterProgress.update({
          where: { id: existingProgress.id },
          data: { codeSolved: true },
        });
      } else {
        await db.chapterProgress.create({
          data: {
            userId: user.id,
            chapterId: targetChapterId,
            codeSolved: true,
          },
        });
      }
    }

    // Award XP and update streak with source="challenge_solved" for first accepted solve
    const xpResult = await awardXpAndStreak({
      userId: user.id,
      amount,
      source: "challenge_solved",
      courseId: trustedCourse.id,
      idempotencyKey: `legacy_challenge_solved_${user.id}_${targetId}`,
    });

    // Log activity record
    await db.activityLog.create({
      data: {
        userId: user.id,
        actionType: "CHALLENGE_SOLVED",
        metadata: JSON.stringify({
          difficulty: difficultyTier,
          xpEarned: amount,
          courseId: trustedCourse.id,
          courseLanguage: trustedCourse.language,
          chapterId: targetChapterId,
          challengeId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      alreadySolved: false,
      difficulty: difficultyTier,
      xpEarned: xpResult.xpAwarded,
      currentStreak: xpResult.user.currentStreak,
      longestStreak: xpResult.user.longestStreak,
      user: {
        id: xpResult.user.id,
        currentStreak: xpResult.user.currentStreak,
        longestStreak: xpResult.user.longestStreak,
      },
    });
  } catch (error) {
    console.error("POST Challenge Submit Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
