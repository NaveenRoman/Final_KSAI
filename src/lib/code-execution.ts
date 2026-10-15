/**
 * Secure Code Execution Service.
 *
 * ALL execution is strictly routed to the isolated Docker container sandbox.
 * Direct host execution is STRICTLY DISABLED to prevent security compromise
 * and host resource exhaustion.
 *
 * If the sandbox runtime is unavailable, execution FAILS CLOSED with a structured error.
 */

import { executeInDockerSandbox, isDockerAvailable, APPROVED_RUNTIME_IMAGES } from "./sandbox/docker-sandbox";
import { SandboxExecutionRequest } from "./sandbox/types";

export interface CodeExecutionRequest {
  code: string;
  language: string;
  stdin?: string;
  files?: Array<{ name: string; content: string }>;
  timeoutMs?: number;
}

export interface CodeExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  compileError?: string | null;
  error?: string | null;
  exitCode?: number | null;
  infrastructureError?: boolean;
}

export const APPROVED_LANGUAGES = Object.keys(APPROVED_RUNTIME_IMAGES);

/**
 * Main Execution Entrypoint.
 * Evaluates student code strictly within an isolated Docker container sandbox.
 */
export async function executeCode({
  code,
  language,
  stdin = "",
  files = [],
  timeoutMs,
}: CodeExecutionRequest): Promise<CodeExecutionResult> {
  const normLang = (language || "python").toLowerCase().trim();

  // Validate payload before sandbox dispatch
  if (!code || typeof code !== "string") {
    return {
      success: false,
      stdout: "",
      stderr: "Empty or invalid source code provided.",
      error: "Invalid code",
      exitCode: 1,
      infrastructureError: false,
    };
  }

  // Dispatch strictly to Docker container sandbox
  const result = await executeInDockerSandbox({
    code,
    language: normLang,
    stdin,
    files,
    timeoutMs,
  });

  return {
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    compileError: result.compileError ?? null,
    error: result.error ?? null,
    exitCode: result.exitCode,
    infrastructureError: result.infrastructureError ?? false,
  };
}

export { isDockerAvailable };
