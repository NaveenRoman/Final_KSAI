/**
 * Interactive Process Service.
 *
 * Direct child_process spawning and Docker container execution are
 * completely excised for platform launch security.
 * All interactive operations fail closed safely.
 */

export interface SessionEvent {
  type: "stdout" | "stderr" | "exit" | "error" | "start";
  text?: string;
  exitCode?: number;
  executionTime?: number;
  sessionId?: string;
}

export interface InteractiveSession {
  id: string;
  child: null;
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

export const sessions = new Map<string, InteractiveSession>();

export function cleanupSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSession(sessionId: string): InteractiveSession | undefined {
  return sessions.get(sessionId);
}

export function sendInputToSession(sessionId: string, input: string): boolean {
  return false;
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
  const errorMsg =
    "Interactive terminal execution is temporarily offline for launch verification. Please use standard code execution.";

  const session: InteractiveSession = {
    id: sessionId,
    child: null,
    containerId: "",
    tmpDir: "",
    language,
    startTime: Date.now(),
    lastActivity: Date.now(),
    outputBuffer: "",
    errorBuffer: errorMsg,
    isExited: true,
    exitCode: 503,
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

  setTimeout(() => {
    onEvent({
      type: "stderr",
      text: `\n[${errorMsg}]\n`,
      sessionId,
    });
    onEvent({
      type: "exit",
      exitCode: 503,
      executionTime: 0,
      sessionId,
    });
  }, 10);

  return session;
}

