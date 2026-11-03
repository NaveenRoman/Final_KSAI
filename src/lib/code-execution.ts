/**
 * Secure Code Execution Service.
 *
 * ALL execution is strictly routed to the Django -> Broker -> Docker (runsc) pipeline
 * using cryptographic HMAC-SHA256 signed envelopes.
 *
 * Direct host execution and local Docker spawns are STRICTLY DISABLED.
 * If the sandbox broker is unavailable, execution FAILS CLOSED with a structured 503 error.
 */

import { buildSignedExecutionEnvelope } from "./broker-signer";

export interface CodeExecutionRequest {
  code: string;
  language: string;
  studentId: string;
  stdin?: string;
  files?: Array<{ name: string; content: string }>;
  timeoutMs?: number;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  stdout: string;
  stderr: string;
  compileError?: string | null;
  error?: string | null;
  exitCode?: number | null;
  executionTime?: number;
  infrastructureError?: boolean;
}

export const APPROVED_LANGUAGES = ["python", "java", "c", "cpp", "javascript", "typescript"];

/**
 * Main Execution Entrypoint.
 * Evaluates student code strictly within the isolated Broker -> gVisor container sandbox.
 */
export async function executeCode({
  code,
  language,
  studentId,
  stdin = "",
  timeoutMs = 14000,
}: CodeExecutionRequest): Promise<CodeExecutionResult> {
  const normLang = (language || "python").toLowerCase().trim();

  // Validate studentId is provided and non-empty
  if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
    return {
      success: false,
      output: "Authentication error: Student ID is required for sandboxed execution.",
      stdout: "",
      stderr: "Authentication error: Student ID is required for sandboxed execution.",
      error: "UNAUTHORIZED_EXECUTION",
      exitCode: 401,
      infrastructureError: false,
    };
  }

  // Validate payload before sandbox dispatch
  if (!code || typeof code !== "string" || !code.trim()) {
    return {
      success: false,
      output: "Empty or invalid source code provided.",
      stdout: "",
      stderr: "Empty or invalid source code provided.",
      error: "Invalid code",
      exitCode: 1,
      infrastructureError: false,
    };
  }

  const djangoRunUrl = process.env.DJANGO_RUN_URL || "http://127.0.0.1:8000/api/run/";
  const studentSigningSecret =
    process.env.STUDENT_SIGNING_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    "codexa_dev_student_signing_secret_insecure";

  const signedEnvelope = buildSignedExecutionEnvelope(
    studentSigningSecret,
    studentId.trim(),
    normLang,
    code,
    stdin
  );

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.INTERNAL_API_SECRET) {
    headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
  }

  try {
    const res = await fetch(djangoRunUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(signedEnvelope),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        output: `Execution service error (${res.status}): ${errText || res.statusText}`,
        stdout: "",
        stderr: errText || res.statusText,
        exitCode: res.status,
        infrastructureError: true,
        error: `HTTP_${res.status}`,
      };
    }

    const data = await res.json();
    const isSuccess = Boolean(data.success);
    const out = data.output || "";
    return {
      success: isSuccess,
      output: out,
      stdout: isSuccess ? out : "",
      stderr: isSuccess ? "" : out,
      exitCode: data.exitCode ?? (isSuccess ? 0 : 1),
      executionTime: data.executionTime ?? 0,
      infrastructureError: false,
      error: data.error || (isSuccess ? null : "EXECUTION_ERROR"),
    };
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    const msg = isTimeout
      ? "Execution timed out. Program exceeded allowed execution time."
      : "Execution service unavailable. Please try again shortly. (Direct host execution disabled for platform security)";
    return {
      success: false,
      output: msg,
      stdout: "",
      stderr: msg,
      exitCode: isTimeout ? 504 : 503,
      infrastructureError: true,
      error: isTimeout ? "TIMEOUT" : "BROKER_UNAVAILABLE",
    };
  }
}

export async function isDockerAvailable(): Promise<boolean> {
  return false;
}

