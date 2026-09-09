import { exec, spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { resolveCompiler, getCompilerMissingMessage } from "./c-compiler";

export interface SessionEvent {
  type: "stdout" | "stderr" | "exit" | "error" | "start";
  text?: string;
  exitCode?: number;
  executionTime?: number;
  sessionId?: string;
}

export interface InteractiveSession {
  id: string;
  child: ChildProcess;
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
      try {
        if (session.child && typeof session.child.kill === "function") {
          session.child.kill();
        }
      } catch {}
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

  try {
    if (session.child && typeof session.child.kill === "function") {
      session.child.kill();
    }
  } catch {}

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
  const normLang = (language || "java").toLowerCase().trim();
  const startTime = Date.now();

  const session: InteractiveSession = {
    id: sessionId,
    child: null as any,
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

  let tmpDir = "";
  let child: ChildProcess;

  if (normLang === "python" || normLang === "py") {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ksai_py_int_"));
    const pyFile = path.join(tmpDir, "main.py");
    fs.writeFileSync(pyFile, code, "utf8");

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    child = spawn(pythonCmd, ["-u", pyFile], {
      cwd: tmpDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  } else if (normLang === "c" || normLang === "cpp" || normLang === "c++") {
    const isCpp = normLang === "cpp" || normLang === "c++";
    const compilerPath = resolveCompiler(isCpp);

    // Case B: Compiler not found on system
    if (!compilerPath) {
      const missingMsg = getCompilerMissingMessage(isCpp);
      session.isExited = true;
      session.errorBuffer = missingMsg;
      setTimeout(() => {
        onEvent({
          type: "stderr",
          text: `${missingMsg}\n`,
          sessionId,
        });
        onEvent({
          type: "exit",
          exitCode: 1,
          executionTime: 0,
          sessionId,
        });
      }, 50);
      return session;
    }

    // Case A: Compiler found -> compile with authentic GCC/G++
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), isCpp ? "ksai_cpp_int_" : "ksai_c_int_"));
    const ext = isCpp ? "cpp" : "c";
    const srcFile = path.join(tmpDir, `main.${ext}`);
    const initFile = path.join(tmpDir, `_ksai_init.${ext}`);
    const outFile = path.join(tmpDir, process.platform === "win32" ? "main.exe" : "main.out");
    fs.writeFileSync(srcFile, code, "utf8");

    // Unbuffer stdout/stderr across pipes so prompts without newlines appear immediately
    const initCode = isCpp
      ? `#include <iostream>\n#include <cstdio>\n__attribute__((constructor)) static void __ksai_unbuffer(void) { std::setvbuf(stdout, NULL, _IONBF, 0); std::setvbuf(stderr, NULL, _IONBF, 0); }\n`
      : `#include <stdio.h>\n__attribute__((constructor)) static void __ksai_unbuffer(void) { setvbuf(stdout, NULL, _IONBF, 0); setvbuf(stderr, NULL, _IONBF, 0); }\n`;
    fs.writeFileSync(initFile, initCode, "utf8");

    const stdFlag = isCpp ? "-std=c++17" : "-std=c11";
    const compileCmd = `"${compilerPath}" ${stdFlag} -O2 "${srcFile}" "${initFile}" -o "${outFile}"`;

    let compileFailed = false;
    let compileErrorOutput = "";

    await new Promise<void>((resolve) => {
      exec(compileCmd, { cwd: tmpDir, timeout: 10000, env: process.env }, (err, stdout, stderr) => {
        if (err) {
          compileFailed = true;
          compileErrorOutput = (stderr || err.message || "Compilation failed").trim();
        }
        resolve();
      });
    });

    // If compilation fails, broadcast authentic GCC compiler error directly to terminal
    if (compileFailed) {
      session.isExited = true;
      session.tmpDir = tmpDir;
      session.errorBuffer = compileErrorOutput;
      setTimeout(() => {
        onEvent({
          type: "stderr",
          text: `Compilation Error:\n\n${compileErrorOutput}\n`,
          sessionId,
        });
        onEvent({
          type: "exit",
          exitCode: 1,
          executionTime: Date.now() - startTime,
          sessionId,
        });
      }, 50);
      cleanupSession(sessionId);
      return session;
    }

    // Compilation succeeded -> execute compiled binary
    child = spawn(outFile, [], { cwd: tmpDir, env: process.env });
  } else {
    // Java
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ksai_java_int_"));
    const javaFile = path.join(tmpDir, "Main.java");
    fs.writeFileSync(javaFile, code, "utf8");

    await new Promise<void>((resolve, reject) => {
      exec(`javac "${javaFile}"`, { cwd: tmpDir, timeout: 8000 }, (err, stdout, stderr) => {
        if (err) {
          const compileErr = stderr || err.message || "Compilation failed";
          return reject(new Error(compileErr));
        }
        resolve();
      });
    });

    child = spawn("java", ["-cp", tmpDir, "Main"], { cwd: tmpDir });
  }

  session.child = child;
  session.tmpDir = tmpDir;
  resetSessionTimeout(session);

  // Flush any inputs that were queued while compiling
  if (session.pendingInputs && session.pendingInputs.length > 0) {
    for (const pInput of session.pendingInputs) {
      try {
        child.stdin?.write(pInput);
      } catch {}
    }
    session.pendingInputs = [];
  }

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    session.outputBuffer += text;
    session.lastActivity = Date.now();
    resetSessionTimeout(session);
    session.broadcast({ type: "stdout", text, sessionId });
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    session.errorBuffer += text;
    session.lastActivity = Date.now();
    resetSessionTimeout(session);
    session.broadcast({ type: "stderr", text, sessionId });
  });

  child.on("close", (code) => {
    const duration = Date.now() - session.startTime;
    session.isExited = true;
    session.exitCode = code;
    session.broadcast({
      type: "exit",
      exitCode: code ?? 0,
      executionTime: duration,
      sessionId,
    });
    cleanupSession(sessionId);
  });

  child.on("error", (err) => {
    const duration = Date.now() - session.startTime;
    session.isExited = true;
    session.broadcast({
      type: "error",
      text: err.message,
      executionTime: duration,
      sessionId,
    });
    cleanupSession(sessionId);
  });

  return session;
}
