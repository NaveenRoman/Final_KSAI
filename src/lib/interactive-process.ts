import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { isDockerAvailable, APPROVED_RUNTIME_IMAGES } from "./sandbox/docker-sandbox";

export interface SessionEvent {
  type: "stdout" | "stderr" | "exit" | "error" | "start";
  text?: string;
  exitCode?: number;
  executionTime?: number;
  sessionId?: string;
}

export interface InteractiveSession {
  id: string;
  child: ChildProcess | null;
  containerId: string;
  tmpDir: string;
  language: string;
  startTime: number;
  lastActivity: number;
  outputBuffer: string;
  errorBuffer: string;
  isExited: boolean;
  exitCode: number | null;
  idleTimer: NodeJS.Timeout | null;
  listeners: ((event: SessionEvent) => void)[];
  broadcast: (event: SessionEvent) => void;
  pendingInputs?: string[];
}

// Global registry for process sessions across all Next.js API routes
const globalForSessions = globalThis as unknown as {
  ksaiInteractiveSessions?: Map<string, InteractiveSession>;
};
export const sessions: Map<string, InteractiveSession> =
  globalForSessions.ksaiInteractiveSessions ??= new Map<string, InteractiveSession>();

const IDLE_TIMEOUT_MS = 60000; // 60 seconds idle timeout

function resetSessionTimeout(session: InteractiveSession) {
  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
  }
  session.idleTimer = setTimeout(() => {
    if (!session.isExited) {
      session.broadcast({
        type: "stderr",
        text: "\n[Process timed out after 60s of inactivity]\n",
      });
      cleanupSession(session.id);
    }
  }, IDLE_TIMEOUT_MS);
}

export function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.isExited = true;
  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
    session.idleTimer = null;
  }

  // Kill child process
  try {
    if (session.child && typeof session.child.kill === "function") {
      session.child.kill("SIGKILL");
    }
  } catch {}

  // Force-kill Docker container if one was running
  if (session.containerId) {
    try {
      const killer = spawn("docker", ["rm", "-f", session.containerId], {
        stdio: "ignore",
        timeout: 3000,
      });
      killer.on("error", () => {});
    } catch {}
  }

  // Clean up temporary workspace
  if (session.tmpDir) {
    setTimeout(() => {
      try {
        fs.rmSync(session.tmpDir, { recursive: true, force: true });
      } catch {}
    }, 1000);
  }

  sessions.delete(sessionId);
}

export function getSession(sessionId: string): InteractiveSession | undefined {
  return sessions.get(sessionId);
}

export function sendInputToSession(sessionId: string, input: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.isExited) {
    return false;
  }

  const dataToSend = input.endsWith("\n") ? input : input + "\n";
  if (!session.child || !session.child.stdin) {
    if (!session.pendingInputs) session.pendingInputs = [];
    session.pendingInputs.push(dataToSend);
    session.lastActivity = Date.now();
    return true;
  }

  try {
    session.child.stdin.write(dataToSend);
    session.lastActivity = Date.now();
    resetSessionTimeout(session);
    return true;
  } catch (err) {
    console.error("Error writing to stdin:", err);
    return false;
  }
}

/**
 * Creates an interactive execution session.
 * STRICT: Runs ONLY inside an isolated Docker container with --network none.
 * Direct host execution is STRICTLY DISABLED.
 */
export async function createInteractiveSession({
  sessionId,
  code,
  language,
  onEvent,
}: {
  sessionId: string;
  code: string;
  language: string;
  onEvent: (event: SessionEvent) => void;
}): Promise<InteractiveSession> {
  const normLang = (language || "python").toLowerCase().trim();
  const startTime = Date.now();
  const containerId = `ksai_int_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  const session: InteractiveSession = {
    id: sessionId,
    child: null,
    containerId,
    tmpDir: "",
    language: normLang,
    startTime,
    lastActivity: Date.now(),
    outputBuffer: "",
    errorBuffer: "",
    isExited: false,
    exitCode: null,
    idleTimer: null,
    listeners: [onEvent],
    pendingInputs: [],
    broadcast(event: SessionEvent) {
      for (const l of this.listeners) {
        try {
          l(event);
        } catch {}
      }
    },
  };
  sessions.set(sessionId, session);

  // 1. Fail closed if Docker sandbox is unavailable
  const dockerOnline = await isDockerAvailable();
  if (!dockerOnline) {
    const errorMsg =
      "Execution Sandbox Unavailable: Secure container runtime (Docker) is required but not active on this host. Direct host execution is strictly disabled for security.";
    session.isExited = true;
    session.errorBuffer = errorMsg;
    setTimeout(() => {
      onEvent({
        type: "stderr",
        text: `\n[${errorMsg}]\n`,
        sessionId,
      });
      onEvent({
        type: "exit",
        exitCode: 1,
        executionTime: 0,
        sessionId,
      });
    }, 50);
    cleanupSession(sessionId);
    return session;
  }

  // 2. Validate approved runtime
  const runtime = APPROVED_RUNTIME_IMAGES[normLang];
  if (!runtime) {
    const errorMsg = `Unsupported runtime: '${language}'. Supported languages: Python, Java, C, C++, JavaScript, TypeScript.`;
    session.isExited = true;
    session.errorBuffer = errorMsg;
    setTimeout(() => {
      onEvent({
        type: "stderr",
        text: `\n[Error: ${errorMsg}]\n`,
        sessionId,
      });
      onEvent({
        type: "exit",
        exitCode: 1,
        executionTime: 0,
        sessionId,
      });
    }, 50);
    cleanupSession(sessionId);
    return session;
  }

  // 3. Prepare isolated ephemeral workspace
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ksai_sandbox_${containerId}_`));
  session.tmpDir = tmpDir;

  let mainFileName = runtime.defaultFileName;
  if (normLang === "java") {
    const publicClassMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    if (publicClassMatch) {
      mainFileName = `${publicClassMatch[1]}.java`;
    }
  }
  fs.writeFileSync(path.join(tmpDir, mainFileName), code, "utf8");

  // 4. Build Docker container args
  const dockerArgs: string[] = [
    "run",
    "--rm",
    "-i",
    "--name",
    containerId,
    "--label",
    "ksai-sandbox=true",
    "--network",
    "none", // STRICT: No network access
    "--user",
    "1000:1000", // Non-root
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--memory",
    "256m",
    "--memory-swap",
    "256m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "64",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "-v",
    `${tmpDir}:/workspace:rw`,
    "-w",
    "/workspace",
    runtime.image,
  ];

  if (runtime.buildCommand) {
    const buildParts = runtime.buildCommand(mainFileName).join(" ");
    const execParts = runtime.executeCommand(mainFileName).join(" ");
    dockerArgs.push("sh", "-c", `${buildParts} && ${execParts}`);
  } else {
    dockerArgs.push(...runtime.executeCommand(mainFileName));
  }

  // 5. Spawn container with interactive stdin/stdout
  const child = spawn("docker", dockerArgs, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  session.child = child;
  resetSessionTimeout(session);

  // Send any inputs queued before spawn
  if (session.pendingInputs && session.pendingInputs.length > 0) {
    for (const pInput of session.pendingInputs) {
      try {
        child.stdin?.write(pInput);
      } catch {}
    }
    session.pendingInputs = [];
  }

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    session.outputBuffer += text;
    session.lastActivity = Date.now();
    resetSessionTimeout(session);
    session.broadcast({ type: "stdout", text, sessionId });
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    session.errorBuffer += text;
    session.lastActivity = Date.now();
    resetSessionTimeout(session);
    session.broadcast({ type: "stderr", text, sessionId });
  });

  child.on("error", (err: any) => {
    session.isExited = true;
    session.broadcast({
      type: "error",
      text: `Container Error: ${err.message}\n`,
      sessionId,
      exitCode: 1,
    });
    cleanupSession(sessionId);
  });

  child.on("close", (exitCode) => {
    session.isExited = true;
    session.exitCode = exitCode ?? 0;
    const duration = Date.now() - startTime;
    session.broadcast({
      type: "exit",
      exitCode: exitCode ?? 0,
      executionTime: duration,
      sessionId,
    });
    cleanupSession(sessionId);
  });

  return session;
}
