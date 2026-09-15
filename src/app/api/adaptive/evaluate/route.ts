import { NextResponse } from "next/server";
import { evaluateStudentAnswer } from "@/lib/adaptive/evaluator";
import { recordStudentEvidence } from "@/lib/adaptive/profile-service";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      course,
      chapter,
      chapterId,
      topic,
      question,
      studentAnswer,
      topicContent,
      userEmail,
      userId,
      recordEvidence = true,
      reteachCount = 0,
    } = body;

    if (!topic || !question || typeof studentAnswer !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: topic, question, studentAnswer",
        },
        { status: 400 }
      );
    }

    // 1. Evaluate answer with genuine topic-awareness and misconception detection
    const evaluation = await evaluateStudentAnswer({
      course: course || "python",
      chapter,
      topic,
      question,
      studentAnswer,
      topicContent,
    });

    let profile = null;

    // Server-side authoritative identity
    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (userId || "");
    const effectiveUserEmail = authUser ? authUser.email : userEmail;

    // 2. Automatically record evidence to update student's profile & memories
    if (recordEvidence && (effectiveUserId || effectiveUserEmail)) {
      const evidenceRecord = await recordStudentEvidence({
        userId: effectiveUserId,
        userEmail: effectiveUserEmail,
        course: course || "python",
        chapterId: chapterId || "general",
        topic,
        source: reteachCount > 0 ? "TEACH_AGAIN" : "CHECKPOINT",
        score: evaluation.score,
        correct: evaluation.correct,
        misconceptions: evaluation.misconceptions,
        missingConcepts: evaluation.missingConcepts,
        strengths: evaluation.whatWasCorrect ? [evaluation.whatWasCorrect] : [],
        question,
        answer: studentAnswer,
        summary: `${evaluation.appreciation} ${evaluation.reason}`,
        reteachCount,
      });

      if (evidenceRecord.success && evidenceRecord.profile) {
        profile = evidenceRecord.profile;
      }
    }

    return NextResponse.json({
      success: true,
      evaluation,
      profile,
    });
  } catch (error: any) {
    console.error("Adaptive Evaluation API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to evaluate answer",
      },
      { status: 500 }
    );
  }
}
