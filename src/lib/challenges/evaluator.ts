import { getChallengeById } from "./challenge-bank";
import { ChallengeSubmissionEvaluation, TestCase } from "./types";
import { buildSignedExecutionEnvelope } from "@/lib/broker-signer";

export const PASSING_SCORE_THRESHOLD = 70;

interface RawExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  executionTime?: number;
}

/**
 * Execute student challenge code strictly through the authenticated Django-to-Broker pipeline.
 * Direct child_process host execution is STRICTLY PROHIBITED to prevent host compromise.
 * If the execution infrastructure is unreachable, fails closed with a structured 503 error.
 */
async function executeSandboxedChallengeCode({
  code,
  language,
  stdin = "",
  studentId = "student_challenge_runner",
}: {
  code: string;
  language: string;
  stdin: string;
  studentId?: string;
}): Promise<RawExecutionResult> {
  const normLang = language.toLowerCase().trim();
  const startTime = Date.now();

  try {
    const runEndpoint = process.env.DJANGO_RUN_URL || "http://127.0.0.1:8000/api/run/";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.INTERNAL_API_SECRET) {
      headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
    }

    const signingSecret =
      process.env.STUDENT_SIGNING_SECRET ||
      process.env.INTERNAL_API_SECRET ||
      "codexa_dev_student_signing_secret_insecure";

    const signedEnvelope = buildSignedExecutionEnvelope(
      signingSecret,
      studentId,
      normLang,
      code,
      stdin
    );

    const res = await fetch(runEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(signedEnvelope),
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = await res.json();
      const duration = Date.now() - startTime;
      return {
        success: data.success ?? (data.exitCode === 0),
        output: data.output ?? "",
        exitCode: data.exitCode ?? 0,
        executionTime: data.executionTime ?? duration,
      };
    }

    const errorData = await res.json().catch(() => ({}));
    return {
      success: false,
      output: errorData.output || `Execution service returned error status ${res.status}.`,
      exitCode: res.status,
      executionTime: Date.now() - startTime,
    };
  } catch (err: any) {
    // FAIL CLOSED: Never execute student code on the host
    return {
      success: false,
      output: `Execution Infrastructure Error: Sandbox execution service unavailable (${err?.message || "connection refused"}). Direct host execution is strictly disabled.`,
      exitCode: 503,
      executionTime: Date.now() - startTime,
    };
  }
}

function normalizeOutput(text: string): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Server-authoritative challenge submission evaluator.
 * Executes student code against each test case via the isolated execution broker,
 * calculates weighted score, and enforces strict >= 70% threshold.
 */
export async function evaluateChallengeSubmission({
  challengeId,
  code,
  language,
  studentId,
}: {
  challengeId: string;
  code: string;
  language?: string;
  studentId?: string;
}): Promise<ChallengeSubmissionEvaluation> {
  const challenge = getChallengeById(challengeId);
  if (!challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }

  const effectiveLang = language || challenge.course;
  const testCases = challenge.testCases;
  const results: ChallengeSubmissionEvaluation["results"] = [];

  let totalWeight = 0;
  let passedWeight = 0;
  let compilerError: string | null = null;

  for (let idx = 0; idx < testCases.length; idx++) {
    const tc: TestCase = testCases[idx];
    const weight = tc.weight ?? 1;
    totalWeight += weight;

    const execResult = await executeSandboxedChallengeCode({
      code,
      language: effectiveLang,
      stdin: tc.input || "",
      studentId: studentId || "student_challenge_runner",
    });

    if (!execResult.success && idx === 0 && !compilerError) {
      compilerError = execResult.output;
    }

    const actualNormalized = normalizeOutput(execResult.output);
    const expectedNormalized = normalizeOutput(tc.expectedOutput);
    const testPassed = execResult.success && actualNormalized === expectedNormalized;

    if (testPassed) {
      passedWeight += weight;
    }

    results.push({
      testCaseIndex: idx,
      passed: testPassed,
      actualOutput: tc.isHidden ? "[Hidden Test Case]" : actualNormalized,
      expectedOutput: tc.isHidden ? "[Hidden Test Case]" : expectedNormalized,
      input: tc.isHidden ? "[Hidden]" : tc.input,
      isHidden: !!tc.isHidden,
      executionTimeMs: execResult.executionTime,
      error: !execResult.success ? execResult.output : undefined,
    });
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const passed = score >= PASSING_SCORE_THRESHOLD;
  const passedTestCases = results.filter((r) => r.passed).length;

  return {
    challengeId,
    score,
    passed,
    totalTestCases: testCases.length,
    passedTestCases,
    results,
    compilerError,
  };
}
