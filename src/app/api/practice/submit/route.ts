import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseSessionToken } from "@/lib/auth-cookie";
import { awardXpAndStreak } from "@/lib/xp-service";
import {
  getQuestionMarks,
  calculatePracticeScore,
  calculateAccuracy,
  extractWeakTopicsFromIncorrectOnly,
  checkCertificateEligibility,
} from "@/lib/practice-utils";

export const dynamic = "force-dynamic";

function getGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function normalizeWhitespace(value: any) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getDifficultyMultiplier(difficulty: string) {
  const d = String(difficulty).toLowerCase();
  if (d === "easy") return 1;
  if (d === "hard") return 2;
  return 1.5;
}

export async function POST(req: Request) {
  let sessionData = null;
  try {
    sessionData = await auth.api.getSession({ headers: req.headers });
  } catch {
    try {
      sessionData = await auth.api.getSession({ headers: await headers() });
    } catch {
      // ignore
    }
  }

  let user = sessionData?.user as any;

  if (!user) {
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

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

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      sessionId,
      answers = {},
      confidence = {},
      bookmarks = [],
      timeTakenSeconds = 0,
      finalize = false,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const rec = await db.practice.findUnique({
      where: { id: sessionId },
    });

    if (!rec) {
      return NextResponse.json({ error: "Practice session not found" }, { status: 404 });
    }

    if (rec.userEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let meta: any = {};
    try {
      meta = rec.meta ? JSON.parse(rec.meta) : {};
    } catch {
      meta = {};
    }

    meta.answers = answers;
    meta.confidence = confidence;
    meta.bookmarks = Array.isArray(bookmarks) ? bookmarks.map(String) : [];
    meta.bookmarkedQuestions = meta.bookmarks;
    meta.lastSavedAt = new Date().toISOString();

    if (!finalize) {
      await db.practice.update({
        where: { id: sessionId },
        data: {
          meta: JSON.stringify(meta),
        },
      });

      return NextResponse.json({ saved: true });
    }

    // Idempotency: Reject repeated evaluation and duplicate XP if session is already finalized
    if (meta.finalized) {
      return NextResponse.json({
        sessionId,
        scorePercent: meta.scorePercent ?? meta.score ?? 0,
        earnedMarks: meta.earnedMarks ?? 0,
        totalMarks: meta.totalMarks ?? 0,
        attemptedCount: meta.attemptedCount ?? 0,
        correctCount: meta.correctCount ?? 0,
        wrongCount: meta.wrongCount ?? 0,
        skippedCount: meta.skippedCount ?? 0,
        accuracy: meta.accuracy ?? 0,
        xpEarned: 0,
        alreadyFinalized: true,
        message: "Practice session already finalized; no duplicate XP awarded.",
      });
    }

    const quiz = Array.isArray(meta.quiz) ? meta.quiz : [];
    const isProctored = Boolean(meta.challengeMode ?? false);

    let totalMarks = 0;
    let earnedMarks = 0;
    let attemptedCount = 0;
    let correctCount = 0;
    let skippedCount = 0;

    const perQuestion: any[] = [];
    const topicStats: Record<string, { correct: number; attempted: number; total: number }> = {};
    const difficultyStats: Record<string, { correct: number; total: number }> = {};

    const confidenceAnalysis = {
      correct_confident: 0,
      correct_not_confident: 0,
      wrong_confident: 0,
      wrong_not_confident: 0,
    };

    for (const q of quiz) {
      const questionId = String(q.id);
      const qType = String(q.type || "mcq").toLowerCase();
      const qDifficulty = String(q.difficulty || "medium").toLowerCase();
      const qMarks = Number(q.marks ?? getQuestionMarks(qDifficulty, qType));
      
      totalMarks += qMarks;

      const given = answers?.[questionId];
      const isAttempted = given !== undefined && given !== null && String(given).trim() !== "";
      const isConfident = Boolean(confidence?.[questionId] ?? false);

      let isCorrect = false;

      if (!isAttempted) {
        skippedCount += 1;
      } else {
        attemptedCount += 1;

        if (qType === "code" || qType === "coding") {
          const testCases = Array.isArray(q.testCases) && q.testCases.length > 0
            ? q.testCases
            : [{ input: q.input ?? "", expected: q.expectedOutput ?? q.answer ?? "" }];

          const expectedOutputs = testCases.map((tc: any) =>
            typeof tc === "string" ? tc : String(tc.expected ?? tc.output ?? q.expectedOutput ?? "")
          );
          const actualAnswer = String(given ?? "");
          const normalizedActual = normalizeWhitespace(actualAnswer);

          let passCount = 0;
          for (const expected of expectedOutputs) {
            const expectedNormalized = normalizeWhitespace(expected);
            if (
              normalizedActual.includes(expectedNormalized) ||
              expectedNormalized.includes(normalizedActual) ||
              normalizedActual.length > 15
            ) {
              passCount += 1;
            }
          }

          const caseTotal = Math.max(1, expectedOutputs.length);
          const passRate = passCount / caseTotal;
          isCorrect = passRate >= 0.5;
        } else if (qType === "mcq") {
          const options = Array.isArray(q.options) ? q.options : [];
          if (options.length === 0) {
            isCorrect = normalizeWhitespace(given) === normalizeWhitespace(q.correctAnswer ?? q.answer);
          } else if (typeof (q.correctAnswer ?? q.answer) === "number") {
            isCorrect = Number(given) === Number(q.correctAnswer ?? q.answer);
          } else {
            const normalizedGiven = normalizeWhitespace(given);
            const normalizedAnswer = normalizeWhitespace(q.correctAnswer ?? q.answer);
            isCorrect = normalizedGiven === normalizedAnswer;
          }
        } else {
          // Conceptual
          const expected = String(q.correctAnswer ?? q.answer ?? "");
          const userAns = String(given ?? "");
          const normGiven = normalizeWhitespace(userAns);
          const normExpected = normalizeWhitespace(expected);
          isCorrect = normGiven.includes(normExpected) || normExpected.includes(normGiven) || normGiven.length > 15;
        }
      }

      if (isCorrect) {
        earnedMarks += qMarks;
        correctCount += 1;
      }

      const topic = String(q.topic || "General");
      topicStats[topic] = topicStats[topic] || { correct: 0, attempted: 0, total: 0 };
      difficultyStats[qDifficulty] = difficultyStats[qDifficulty] || { correct: 0, total: 0 };

      if (isAttempted) {
        topicStats[topic].attempted += 1;
      }
      if (isCorrect) {
        topicStats[topic].correct += 1;
        difficultyStats[qDifficulty].correct += 1;
      }

      topicStats[topic].total += 1;
      difficultyStats[qDifficulty].total += 1;

      // Confidence matrix tracking
      if (isAttempted) {
        if (isCorrect && isConfident) {
          confidenceAnalysis.correct_confident += 1;
        } else if (isCorrect && !isConfident) {
          confidenceAnalysis.correct_not_confident += 1;
        } else if (!isCorrect && isConfident) {
          confidenceAnalysis.wrong_confident += 1;
        } else {
          confidenceAnalysis.wrong_not_confident += 1;
        }
      }

      perQuestion.push({
        id: questionId,
        question: q.question,
        type: qType,
        isAttempted,
        isCorrect,
        selectedAnswer: given ?? null,
        correctAnswer: q.correctAnswer ?? q.answer ?? q.expectedOutput ?? null,
        marks: qMarks,
        awardedMarks: isCorrect ? qMarks : 0,
        topic,
        difficulty: qDifficulty,
        confidence: isConfident,
        explanation: q.explanation || "",
        starterCode: q.starterCode ?? null,
        testCases: q.testCases ?? null,
      });
    }

    const totalQuestions = quiz.length;
    const wrongCount = Math.max(0, attemptedCount - correctCount);

    // Calculate score & accuracy strictly:
    // If attemptedCount === 0 => scorePercent = 0
    const scorePercent = calculatePracticeScore({
      earnedMarks,
      totalMarks,
      attemptedCount,
    });

    const accuracy = calculateAccuracy({
      correctCount,
      attemptedCount,
    });

    // Extract Weak Topics strictly from attempted INCORRECT questions ONLY
    const weakTopics = extractWeakTopicsFromIncorrectOnly(perQuestion);

    // Check certificate eligibility (All attempted, Score >= 75%, Proctor ON)
    const certificationEligible = checkCertificateEligibility({
      scorePercent,
      attemptedCount,
      totalQuestions,
      isProctored,
    });

    // XP calculation: earnedMarks * difficulty multiplier
    const avgDifficultyMultiplier = quiz.length > 0
      ? quiz.reduce((sum: number, q: any) => sum + getDifficultyMultiplier(String(q.difficulty || "medium")), 0) / quiz.length
      : 1.5;

    const xpEarned = Math.round(earnedMarks * avgDifficultyMultiplier);

    // Form explanations array
    const explanations = perQuestion.map((item) => ({
      question: item.question,
      correctAnswer: item.correctAnswer,
      userAnswer: item.selectedAnswer,
      explanation: item.explanation,
    }));

    // Save evaluated meta
    meta.perQuestion = perQuestion;
    meta.perQuestionReview = perQuestion;
    meta.answers = answers;
    meta.confidence = confidence;
    meta.bookmarks = Array.isArray(bookmarks) ? bookmarks.map(String) : [];
    meta.bookmarkedQuestions = meta.bookmarks;
    meta.timeTakenSeconds = timeTakenSeconds;
    meta.weakTopics = weakTopics;
    meta.attemptedCount = attemptedCount;
    meta.correctCount = correctCount;
    meta.wrongCount = wrongCount;
    meta.skippedCount = skippedCount;
    meta.accuracy = accuracy;
    meta.scorePercent = scorePercent;
    meta.score = scorePercent;
    meta.earnedMarks = earnedMarks;
    meta.awardedMarks = earnedMarks;
    meta.totalMarks = totalMarks;
    meta.xpEarned = xpEarned;
    meta.avgTimePerQuestion = totalQuestions > 0 ? Math.round(timeTakenSeconds / totalQuestions) : 0;
    meta.difficultyBreakdown = difficultyStats;
    meta.confidenceAnalysis = confidenceAnalysis;
    meta.topicsCovered = Object.keys(topicStats);
    meta.grade = getGrade(scorePercent);
    meta.certificationEligible = certificationEligible;
    meta.evaluatedAt = new Date().toISOString();
    meta.finalized = true;

    await db.practice.update({
      where: { id: sessionId },
      data: {
        meta: JSON.stringify(meta),
      },
    });

    // Increment user XP atomically with idempotency key if user is logged in
    let finalXpEarned = 0;
    if (user.id && xpEarned > 0) {
      try {
        const xpResult = await awardXpAndStreak({
          userId: user.id,
          amount: xpEarned,
          source: "ai_practice_lab",
          courseId: rec.courseId ?? null,
          idempotencyKey: `practice_${sessionId}`,
        });
        finalXpEarned = xpResult.xpAwarded;
      } catch (userXpErr) {
        console.error("Failed to increment user XP via awardXpAndStreak:", userXpErr);
      }
    }

    return NextResponse.json({
      sessionId,
      scorePercent,
      earnedMarks,
      totalMarks,
      attemptedCount,
      correctCount,
      wrongCount,
      skippedCount,
      accuracy,
      weakTopics,
      explanations,
      grade: getGrade(scorePercent),
      xpEarned: finalXpEarned,
      confidenceAnalysis,
      certificationEligible,
    });
  } catch (err) {
    console.error("Practice submit error:", err);
    return NextResponse.json({ error: "Server error submitting quiz" }, { status: 500 });
  }
}
