/**
 * Legacy Host C/C++ Compiler Utility.
 *
 * Direct host compilation and execution are STRICTLY DISALLOWED for platform security.
 * All C/C++ programs compile and execute strictly inside the isolated Broker -> gVisor container.
 */

export function ensureCompilerOnPath(_compilerPath: string): void {
  // No-op: Host PATH manipulation is disabled
}

export function resolveCompiler(_isCpp: boolean = false): string | null {
  // Always null: Host compilers are never invoked
  return null;
}

export function getCompilerMissingMessage(isCpp: boolean = false): string {
  const lang = isCpp ? "C++" : "C";
  return [
    `${lang} Host Compiler Disabled`,
    "",
    "Direct host compilation has been permanently disabled for platform security.",
    "All code is executed in an isolated gVisor container sandbox via the execution broker.",
  ].join("\n");
}

