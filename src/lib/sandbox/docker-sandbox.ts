import { SandboxExecutionRequest, SandboxExecutionResult } from "./types";

/**
 * Legacy Docker Sandbox Service.
 *
 * Local Docker execution via child_process is PERMANENTLY DISABLED.
 * All production code execution routes strictly through the authenticated
 * Django -> Broker -> Docker (runsc) pipeline.
 */

export const APPROVED_RUNTIME_IMAGES: Record<
  string,
  {
    image: string;
    extension: string;
    defaultFileName: string;
    buildCommand?: (fileName: string) => string[];
    executeCommand: (fileName: string) => string[];
  }
> = {
  python: {
    image: "python:3.11-alpine",
    extension: "py",
    defaultFileName: "main.py",
    executeCommand: (f) => ["python", "-u", f],
  },
  java: {
    image: "eclipse-temurin:17-jdk-alpine",
    extension: "java",
    defaultFileName: "Main.java",
    executeCommand: () => ["java", "-cp", ".", "Main"],
  },
  c: {
    image: "gcc:13.2-alpine",
    extension: "c",
    defaultFileName: "main.c",
    executeCommand: () => ["./main.out"],
  },
  cpp: {
    image: "gcc:13.2-alpine",
    extension: "cpp",
    defaultFileName: "main.cpp",
    executeCommand: () => ["./main.out"],
  },
};

export async function isDockerAvailable(): Promise<boolean> {
  return false;
}

export async function executeInDockerSandbox(
  _request: SandboxExecutionRequest
): Promise<SandboxExecutionResult> {
  return {
    success: false,
    stdout: "",
    stderr:
      "Direct Node.js Docker execution is permanently disabled for platform security. All execution must route through the signed Django-to-Broker pipeline.",
    error: "LOCAL_DOCKER_DISABLED",
    exitCode: 503,
    executionTime: 0,
    sandboxAvailable: false,
    infrastructureError: true,
  };
}

