import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { XP_CONFIG } from "@/lib/xp-config";
import { awardXpAndStreak } from "@/lib/xp-service";
import { executeCode } from "@/lib/code-execution";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contestId: string; challengeId: string }> }
) {
  try {
    const { contestId, challengeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { code = "", language = "javascript" } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Code submission cannot be empty." }, { status: 400 });
    }

    // 1. Resolve student session user
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user) {
      try {
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
      } catch {
        // Fallback for non-standard request contexts
      }
    }

    if (!user) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:better-auth\.session_token|sessionToken)=([^;]+)/);
      if (match && match[1]) {
        const rawToken = parseSessionToken(decodeURIComponent(match[1]));
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

    // 2. Resolve target challenge & contest
    const challenge = await db.challenge.findFirst({
      where: {
        id: challengeId,
        contestId,
      },
      include: { contest: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge or Contest not found" }, { status: 404 });
    }

    // Contest status check
    if (challenge.contest.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Contest is not currently published." }, { status: 400 });
    }

    // Parse test cases from Challenge.testCases
    let testCasesList: Array<{ input?: unknown; expectedOutput?: unknown; output?: unknown }> = [];
    try {
      if (typeof challenge.testCases === "string") {
        testCasesList = JSON.parse(challenge.testCases);
      } else if (Array.isArray(challenge.testCases)) {
        testCasesList = challenge.testCases;
      }
    } catch {
      testCasesList = [];
    }

    if (!Array.isArray(testCasesList) || testCasesList.length === 0) {
      return NextResponse.json(
        { error: "No test cases configured for this challenge." },
        { status: 400 }
      );
    }

    // Server-side code execution for each test case
    const executionResults: Array<{
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      error?: string | null;
    }> = [];

    let overallPassed = true;
    let errorDetailsText: string | null = null;
    let infrastructureErrorOccurred = false;

    for (let i = 0; i < testCasesList.length; i++) {
      const tc = testCasesList[i];
      const rawExpected = tc.expectedOutput ?? tc.output;
      const expectedStr = rawExpected !== undefined && rawExpected !== null ? String(rawExpected).trim() : "";
      const stdinInput = tc.input !== undefined && tc.input !== null ? String(tc.input) : "";

      const execRes = await executeCode({
        code,
        language,
        studentId: user.id,
        stdin: stdinInput,
      });

      if (execRes.infrastructureError) {
        infrastructureErrorOccurred = true;
        errorDetailsText = execRes.error || "Infrastructure Execution Service Error";
        overallPassed = false;
        executionResults.push({
          input: stdinInput,
          expectedOutput: expectedStr,
          actualOutput: "",
          passed: false,
          error: errorDetailsText,
        });
        break;
      }

      if (!execRes.success) {
        overallPassed = false;
        const errDesc = execRes.compileError || execRes.error || execRes.stderr || "Execution Error";
        if (!errorDetailsText) {
          errorDetailsText = `Testcase #${i + 1} Error: ${errDesc}`;
        }
        executionResults.push({
          input: stdinInput,
          expectedOutput: expectedStr,
          actualOutput: execRes.stdout.trim(),
          passed: false,
          error: errDesc,
        });
        continue;
      }

      const actualTrimmed = execRes.stdout.trim();
      const matches = expectedStr !== "" && actualTrimmed === expectedStr;

      if (!matches) {
        overallPassed = false;
        if (!errorDetailsText) {
          errorDetailsText = `Testcase #${i + 1} Output Mismatch. Expected: "${expectedStr}", Got: "${actualTrimmed}"`;
        }
      }

      executionResults.push({
        input: stdinInput,
        expectedOutput: expectedStr,
        actualOutput: actualTrimmed,
        passed: matches,
      });
    }

    if (infrastructureErrorOccurred) {
      return NextResponse.json(
        {
          success: false,
          error: `Code execution infrastructure unavailable: ${errorDetailsText}. Please try again shortly.`,
        },
        { status: 503 }
      );
    }

    const submissionStatus = overallPassed ? "PASSED" : "FAILED";

    // 3. Idempotency Check: check for prior PASSED submission for this user + challenge
    const priorPassedSubmission = await db.submission.findFirst({
      where: {
        userId: user.id,
        challengeId: challenge.id,
        status: "PASSED",
      },
    });

    const isFirstTimePassed = submissionStatus === "PASSED" && !priorPassedSubmission;

    // Determine XP award
    const validTiers = ["EASY", "MEDIUM", "HARD"] as const;
    const rawDiff = (challenge.difficulty || "").toUpperCase().trim();
    const difficultyTier = validTiers.includes(rawDiff as any)
      ? (rawDiff as (typeof validTiers)[number])
      : "EASY";

    const amount = XP_CONFIG.CHALLENGE_SOLVED[difficultyTier];
    const xpToAward = isFirstTimePassed ? amount : 0;

    let xpResult = null;
    if (isFirstTimePassed) {
      xpResult = await awardXpAndStreak({
        userId: user.id,
        amount: xpToAward,
        source: "challenge_solved",
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          actionType: "CHALLENGE_SOLVED",
          metadata: JSON.stringify({
            contestId,
            challengeId,
            difficulty: difficultyTier,
            xpEarned: xpToAward,
            language,
          }),
        },
      });
    }

    // 4. Always log submission record to database
    const submission = await db.submission.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        code,
        language,
        status: submissionStatus,
        xpAwarded: xpToAward,
        errorDetail: errorDetailsText,
      },
    });

    // Fetch current user streak info if not awarded in this turn
    let streakUser = xpResult?.user;
    if (!streakUser) {
      streakUser = (await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, currentStreak: true, longestStreak: true },
      })) as any;
    }

    // Sanitize errorDetail for student-facing response so expectedOutput is never exposed
    let studentErrorDetail: string | null = null;
    if (submission.errorDetail) {
      studentErrorDetail = submission.errorDetail.replace(/\. Expected: ".*?", Got: ".*?"/g, "");
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        xpAwarded: submission.xpAwarded,
        alreadySolved: !isFirstTimePassed && submissionStatus === "PASSED",
        errorDetail: studentErrorDetail,
      },
      results: executionResults.map((r) => ({
        input: r.input,
        actualOutput: r.actualOutput,
        passed: r.passed,
        error: r.error || null,
      })),
      currentStreak: streakUser?.currentStreak ?? 0,
      longestStreak: streakUser?.longestStreak ?? 0,
    });
  } catch (error) {
    console.error("POST Student Contest Challenge Submit Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
