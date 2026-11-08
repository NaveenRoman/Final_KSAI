import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { XP_CONFIG } from "@/lib/xp-config";
import { awardXpAndStreak } from "@/lib/xp-service";
import { evaluateChallengeSubmission } from "@/lib/challenges/evaluator";
import {
  getChapterChallengeProgression,
  checkChapterCompletion,
  CHALLENGE_PASS_THRESHOLD,
} from "@/lib/adaptive/unlock-service";
import { getChallengeById, normalizeCourseSlug } from "@/lib/challenges/challenge-bank";
import { checkCourseAccess } from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseSlug: string; chapterId: string }> }
) {
  try {
    const { courseSlug, chapterId } = await params;
    const body = await req.json().catch(() => ({}));

    // 1. Authenticate requesting user
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
        if (session && new Date() < session.expiresAt) {
          user = session.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Validate submission payload
    const { challengeId, code, language } = body;
    if (!challengeId || typeof challengeId !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing challengeId" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { error: "Code cannot be empty" },
        { status: 400 }
      );
    }

    const challengeDef = getChallengeById(challengeId);
    if (!challengeDef) {
      return NextResponse.json(
        { error: `Challenge definition not found: ${challengeId}` },
        { status: 404 }
      );
    }

    const normSlug = normalizeCourseSlug(courseSlug);
    const orderNum = parseInt(chapterId.replace(/[^0-9]/g, ""), 10) || 0;

    // Validate course ownership
    if (challengeDef.course !== normSlug) {
      return NextResponse.json(
        { error: `Challenge '${challengeId}' belongs to '${challengeDef.course}', not '${courseSlug}'` },
        { status: 400 }
      );
    }

    // Validate chapter ownership
    if (challengeDef.chapterOrder !== orderNum) {
      return NextResponse.json(
        { error: `Challenge '${challengeId}' belongs to chapter ${challengeDef.chapterOrder}, not chapter ${orderNum}` },
        { status: 400 }
      );
    }

    // 3. Authoritative Course Access Gate (Challenge evaluation requires active access)
    const access = await checkCourseAccess(user.id, courseSlug);
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error:
            access.reason === "SUBSCRIPTION_EXPIRED"
              ? "Your subscription has expired. Active subscription is required to submit coding challenges."
              : access.reason === "SUBJECT_NOT_INCLUDED"
              ? `Your current subscription does not cover ${courseSlug}. Upgrade your plan to submit this challenge.`
              : `Enrollment in ${courseSlug} is required to submit coding challenges.`,
          isUnlocked: false,
          lockReason: access.reason,
        },
        { status: 403 }
      );
    }

    // 4. Server-authoritative sequential unlock gate check
    const progression = await getChapterChallengeProgression({
      userId: user.id,
      courseSlug: normSlug,
      chapterOrder: orderNum,
    });

    const targetItem = progression.challenges.find((c) => c.id === challengeId);
    if (!targetItem) {
      return NextResponse.json(
        { error: `Challenge ${challengeId} does not belong to chapter ${orderNum}` },
        { status: 400 }
      );
    }

    if (!targetItem.isUnlocked) {
      return NextResponse.json(
        {
          error: "Sequential Gate Locked: You must pass the previous program(s) in this chapter before attempting this challenge.",
          isUnlocked: false,
        },
        { status: 403 }
      );
    }

    // 4. Server-Side Execution & Evaluation (Language is authoritatively bound to challenge definition)
    const evalResult = await evaluateChallengeSubmission({
      challengeId,
      code,
      language: challengeDef.course,
      studentId: user.id,
    });


    const course = await db.course.findFirst({
      where: { language: courseSlug.toLowerCase() },
      include: { chapters: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: `Course not found for language: ${courseSlug}` },
        { status: 404 }
      );
    }

    const chapter = course.chapters.find((c) => c.orderNumber === orderNum);
    if (!chapter) {
      return NextResponse.json(
        { error: `Chapter not found for order number: ${orderNum}` },
        { status: 404 }
      );
    }

    let isChapterCodeComplete = false;
    let xpAwarded = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    // 5. If passed (score >= 70%), persist idempotent passing event and update gates
    if (evalResult.passed) {
      // Check if this specific challenge was already passed
      const previousPass = await db.learningEvent.findFirst({
        where: {
          userId: user.id,
          courseId: course.language,
          chapterId: chapter.id,
          eventType: "CHALLENGE_PASSED",
          metadata: { contains: challengeId },
        },
      });

      // Record this attempt as a verified learning event
      await db.learningEvent.create({
        data: {
          userId: user.id,
          courseId: course.language,
          chapterId: chapter.id,
          topic: challengeDef.title,
          eventType: "CHALLENGE_PASSED",
          content: `Passed programming challenge ${challengeDef.title} with score ${evalResult.score}%`,
          metadata: JSON.stringify({
            challengeId,
            score: evalResult.score,
            passed: true,
            passedTestCases: evalResult.passedTestCases,
            totalTestCases: evalResult.totalTestCases,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      // Check if ALL challenges for this chapter are now passed
      const updatedProgression = await getChapterChallengeProgression({
        userId: user.id,
        courseSlug,
        chapterOrder: orderNum,
      });

      isChapterCodeComplete = updatedProgression.isAllChallengesPassed;

      if (isChapterCodeComplete) {
        // Mark codeSolved in ChapterProgress
        await db.chapterProgress.upsert({
          where: {
            userId_chapterId: {
              userId: user.id,
              chapterId: chapter.id,
            },
          },
          update: {
            codeSolved: true,
          },
          create: {
            userId: user.id,
            chapterId: chapter.id,
            codeSolved: true,
          },
        });

        // Trigger full chapter completion evaluation to unlock next chapter if all 4 gates pass
        await checkChapterCompletion({
          userId: user.id,
          courseId: course.id,
          chapterId: chapter.id,
        });
      }

      // Award XP for first-time solve of this challenge
      if (!previousPass) {
        const tier = challengeDef.difficulty || "EASY";
        const amount = XP_CONFIG.CHALLENGE_SOLVED[tier] || 30;

        const xpResult = await awardXpAndStreak({
          userId: user.id,
          amount,
          source: "challenge_solved",
          courseId: course.id,
        });

        xpAwarded = xpResult.xpAwarded;
        currentStreak = xpResult.user.currentStreak;
        longestStreak = xpResult.user.longestStreak;
      }
    }

    return NextResponse.json({
      success: true,
      challengeId,
      passed: evalResult.passed,
      score: evalResult.score,
      minPassingScore: CHALLENGE_PASS_THRESHOLD,
      totalTestCases: evalResult.totalTestCases,
      passedTestCases: evalResult.passedTestCases,
      results: evalResult.results,
      compilerError: evalResult.compilerError,
      isChapterCodeComplete,
      xpEarned: xpAwarded,
      currentStreak,
      longestStreak,
      message: evalResult.passed
        ? `Challenge passed with score ${evalResult.score}%!`
        : `Score ${evalResult.score}% is below the required ${CHALLENGE_PASS_THRESHOLD}%. Review test results and retry.`,
    });
  } catch (error: any) {
    console.error("POST Challenge Submit Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process challenge submission" },
      { status: 500 }
    );
  }
}
