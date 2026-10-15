export interface SandboxExecutionRequest {
  code: string;
  language: string;
  stdin?: string;
  files?: Array<{ name: string; content: string }>;
  timeoutMs?: number;
}

export interface SandboxExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  compileError?: string | null;
  error?: string | null;
  exitCode: number;
  executionTime: number;
  infrastructureError?: boolean;
  sandboxAvailable: boolean;
  truncated?: boolean;
}

export interface ApprovedRuntime {
  image: string;
  extension: string;
  mainFile: string;
  compileCmd?: string[];
  runCmd: (mainFile: string) => string[];
}
