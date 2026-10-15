import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { SandboxExecutionRequest, SandboxExecutionResult } from "./types";
import { sandboxLimiter } from "./concurrency-limiter";

/**
 * Approved, explicitly pinned runtime container images.
 * Runs strictly isolated, non-root, with zero network capabilities.
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
  py: {
    image: "python:3.11-alpine",
    extension: "py",
    defaultFileName: "main.py",
    executeCommand: (f) => ["python", "-u", f],
  },
  java: {
    image: "eclipse-temurin:17-jdk-alpine",
    extension: "java",
    defaultFileName: "Main.java",
    buildCommand: (f) => ["javac", f],
    executeCommand: () => ["java", "-cp", ".", "Main"],
  },
  c: {
    image: "gcc:13.2-alpine",
    extension: "c",
    defaultFileName: "main.c",
    buildCommand: (f) => ["gcc", "-std=c11", "-O2", f, "-o", "main.out"],
    executeCommand: () => ["./main.out"],
  },
  cpp: {
    image: "gcc:13.2-alpine",
    extension: "cpp",
    defaultFileName: "main.cpp",
    buildCommand: (f) => ["g++", "-std=c17", "-O2", f, "-o", "main.out"],
    executeCommand: () => ["./main.out"],
  },
  "c++": {
    image: "gcc:13.2-alpine",
    extension: "cpp",
    defaultFileName: "main.cpp",
    buildCommand: (f) => ["g++", "-std=c17", "-O2", f, "-o", "main.out"],
    executeCommand: () => ["./main.out"],
  },
  javascript: {
    image: "node:20-alpine",
    extension: "js",
    defaultFileName: "main.js",
    executeCommand: (f) => ["node", f],
  },
  js: {
    image: "node:20-alpine",
    extension: "js",
    defaultFileName: "main.js",
    executeCommand: (f) => ["node", f],
  },
  typescript: {
    image: "node:20-alpine",
    extension: "ts",
    defaultFileName: "main.ts",
    executeCommand: (f) => ["node", "--experimental-strip-types", f],
  },
  ts: {
    image: "node:20-alpine",
    extension: "ts",
    defaultFileName: "main.ts",
    executeCommand: (f) => ["node", "--experimental-strip-types", f],
  },
};

const MAX_OUTPUT_BYTES = 100 * 1024; // 100 KB max stdout/stderr
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds total

let isDockerInstalledCache: boolean | null = null;
let lastDockerCheckTime = 0;
const DOCKER_CHECK_TTL_MS = 30000; // 30 seconds cache

/**
 * Safely verify if the Docker daemon is accessible without throwing.
 */
export async function isDockerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (isDockerInstalledCache !== null && now - lastDockerCheckTime < DOCKER_CHECK_TTL_MS) {
    return isDockerInstalledCache;
  }

  return new Promise<boolean>((resolve) => {
    try {
      const proc = spawn("docker", ["version", "--format", "{{.Server.Version}}"], {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2500,
      });

      let stdout = "";
      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });

      proc.on("error", () => {
        isDockerInstalledCache = false;
        lastDockerCheckTime = Date.now();
        resolve(false);
      });

      proc.on("close", (code) => {
        const available = code === 0 && stdout.trim().length > 0;
        isDockerInstalledCache = available;
        lastDockerCheckTime = Date.now();
        resolve(available);
      });
    } catch {
      isDockerInstalledCache = false;
      lastDockerCheckTime = Date.now();
      resolve(false);
    }
  });
}

/**
 * Helper to force-kill a Docker container by name if a run command times out.
 */
async function forceKillContainer(containerName: string): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const killer = spawn("docker", ["rm", "-f", containerName], {
        stdio: "ignore",
        timeout: 3000,
      });
      killer.on("close", () => resolve());
      killer.on("error", () => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * Execute student-submitted code in an isolated Docker container sandbox.
 * Enforces strict CPU, memory, process-count, network-isolation, and non-root security.
 *
 * FAILS CLOSED: If Docker is unavailable, returns a structured error immediately.
 * Direct host execution is STRICTLY DISALLOWED.
 */
export async function executeInDockerSandbox({
  code,
  language,
  stdin = "",
  files = [],
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: SandboxExecutionRequest): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const normLang = (language || "python").toLowerCase().trim();

  // 1. Validate supported language
  const runtime = APPROVED_RUNTIME_IMAGES[normLang];
  if (!runtime) {
    return {
      success: false,
      stdout: "",
      stderr: `Unsupported language: '${language}'. Supported runtimes: Python, Java, C, C++, JavaScript, TypeScript.`,
      exitCode: 1,
      executionTime: 0,
      sandboxAvailable: true,
      infrastructureError: false,
    };
  }

  // 2. Validate code payload size (max 64 KB)
  if (Buffer.byteLength(code, "utf8") > 64 * 1024) {
    return {
      success: false,
      stdout: "",
      stderr: "Source code size exceeds the 64 KB limit.",
      exitCode: 1,
      executionTime: 0,
      sandboxAvailable: true,
      infrastructureError: false,
    };
  }

  // 3. Check Docker sandbox availability (Fail Closed!)
  const dockerOnline = await isDockerAvailable();
  if (!dockerOnline) {
    return {
      success: false,
      stdout: "",
      stderr:
        "Execution Sandbox Unavailable: Secure container runtime (Docker) is required but not active on this host. Direct host execution is strictly disabled for security.",
      error: "Execution sandbox unavailable.",
      exitCode: 1,
      executionTime: 0,
      sandboxAvailable: false,
      infrastructureError: true,
    };
  }

  // 4. Acquire slot from Concurrency Limiter
  let releaseSlot: (() => void) | null = null;
  try {
    releaseSlot = await sandboxLimiter.acquire();
  } catch (capacityError: any) {
    return {
      success: false,
      stdout: "",
      stderr: capacityError.message || "Execution capacity reached. Please retry in a few moments.",
      exitCode: 1,
      executionTime: 0,
      sandboxAvailable: true,
      infrastructureError: false,
    };
  }

  // 5. Create an isolated, ephemeral host directory for student files
  const containerId = `ksai_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ksai_sandbox_${containerId}_`));

  try {
    // Write primary source file
    let mainFileName = runtime.defaultFileName;
    if (normLang === "java") {
      const publicClassMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      if (publicClassMatch) {
        mainFileName = `${publicClassMatch[1]}.java`;
      }
    }
    fs.writeFileSync(path.join(tmpDir, mainFileName), code, "utf8");

    // Write auxiliary student files if provided
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f.name && f.content && f.name !== mainFileName) {
          const safeName = path.basename(f.name);
          fs.writeFileSync(path.join(tmpDir, safeName), f.content, "utf8");
        }
      }
    }

    // 6. Build the safe Docker command arguments
    // Run container as unprivileged user, without network, with bounded memory, CPU, and pids.
    // Mount ONLY the ephemeral temporary directory as /workspace
    const dockerArgs: string[] = [
      "run",
      "--rm",
      "-i",
      "--name",
      containerId,
      "--label",
      "ksai-sandbox=true",
      "--network",
      "none", // STRICT: Zero outbound network access
      "--user",
      "1000:1000", // Non-root execution
      "--read-only", // Read-only container rootfs
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=64m", // Ephemeral isolated tmp
      "--memory",
      "256m", // Strict 256MB RAM cap
      "--memory-swap",
      "256m", // Disable swap expansion
      "--cpus",
      "0.5", // Half-core CPU limit
      "--pids-limit",
      "64", // Prevent fork bombs
      "--cap-drop",
      "ALL", // Drop all Linux kernel capabilities
      "--security-opt",
      "no-new-privileges:true",
      "-v",
      `${tmpDir}:/workspace:rw`,
      "-w",
      "/workspace",
      runtime.image,
    ];

    // Determine command to run inside container:
    // If compilation is required (Java / C / C++), run compile then execute
    if (runtime.buildCommand) {
      const buildParts = runtime.buildCommand(mainFileName).join(" ");
      const execParts = runtime.executeCommand(mainFileName).join(" ");
      dockerArgs.push("sh", "-c", `${buildParts} && ${execParts}`);
    } else {
      dockerArgs.push(...runtime.executeCommand(mainFileName));
    }

    // 7. Spawn Docker child process
    return await new Promise<SandboxExecutionResult>((resolve) => {
      let stdoutData = "";
      let stderrData = "";
      let isTimedOut = false;
      let isTruncated = false;

      const proc = spawn("docker", dockerArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Write stdin if provided
      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      const timer = setTimeout(async () => {
        isTimedOut = true;
        try {
          proc.kill("SIGKILL");
        } catch {}
        await forceKillContainer(containerId);
      }, timeoutMs);

      proc.stdout?.on("data", (chunk: Buffer) => {
        if (stdoutData.length + chunk.length > MAX_OUTPUT_BYTES) {
          isTruncated = true;
          const remaining = MAX_OUTPUT_BYTES - stdoutData.length;
          if (remaining > 0) stdoutData += chunk.subarray(0, remaining).toString("utf8");
        } else {
          stdoutData += chunk.toString("utf8");
        }
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        if (stderrData.length + chunk.length > MAX_OUTPUT_BYTES) {
          isTruncated = true;
          const remaining = MAX_OUTPUT_BYTES - stderrData.length;
          if (remaining > 0) stderrData += chunk.subarray(0, remaining).toString("utf8");
        } else {
          stderrData += chunk.toString("utf8");
        }
      });

      proc.on("error", (err: any) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout: stdoutData,
          stderr: `Container process error: ${err.message}`,
          error: err.message,
          exitCode: 1,
          executionTime: Date.now() - startTime,
          sandboxAvailable: true,
          infrastructureError: true,
        });
      });

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        if (isTimedOut) {
          return resolve({
            success: false,
            stdout: stdoutData,
            stderr: `Execution timed out after ${timeoutMs / 1000} seconds. Process terminated.`,
            error: "Execution Timeout",
            exitCode: 124,
            executionTime: duration,
            sandboxAvailable: true,
            infrastructureError: false,
          });
        }

        const codeVal = exitCode ?? 0;
        const isSuccess = codeVal === 0;

        resolve({
          success: isSuccess,
          stdout: stdoutData.trimEnd(),
          stderr: stderrData.trim(),
          error: isSuccess ? null : (stderrData.trim() || `Process exited with code ${codeVal}`),
          exitCode: codeVal,
          executionTime: duration,
          sandboxAvailable: true,
          truncated: isTruncated,
          infrastructureError: false,
        });
      });
    });
  } finally {
    // 8. Always release concurrency slot and remove ephemeral temp workspace
    if (releaseSlot) {
      releaseSlot();
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
