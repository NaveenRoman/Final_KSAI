import crypto from "crypto";
import {
  GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODELS,
  MAX_STUDENT_RPM,
  MAX_GUEST_RPM,
  MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
  LOCAL_FALLBACK_CONCURRENCY_LIMIT,
  LOCAL_FALLBACK_STUDENT_RPM,
  LOCAL_FALLBACK_GUEST_RPM,
  CONCURRENCY_QUEUE_TIMEOUT_MS,
  AI_TIMEOUTS,
  BASE_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  MAX_JITTER_MS,
  MAX_RETRIES_PER_MODEL,
  MAX_TOTAL_MODEL_ATTEMPTS,
  RETRYABLE_STATUS_CODES,
} from "./gemini-config";
import {
  isDistributedRedisConfigured,
  checkDistributedRateLimit,
  acquireDistributedConcurrency,
  releaseDistributedConcurrency,
} from "./distributed-limiter";
import { db } from "@/lib/db";
import { calculateAiCostUsd, BillingMode } from "./pricing-config";


// ============================================================================
// Types & Interfaces
// ============================================================================
export interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

export interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiCallOptions {
  service: "teach" | "chat" | "guide" | "interview" | "resume" | "dictate" | "guided-debug" | "general";
  studentId?: string | null;
  isGuest?: boolean;
  limitRpm?: number;
  prompt?: string;
  contents?: GeminiContent[];
  systemInstruction?: string;
  model?: string;
  fallbackModels?: readonly string[] | string[];
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  billingTier?: "paid" | "free" | "unknown";
  billingMode?: BillingMode;
}

export interface GeminiCallResult {
  success: boolean;
  text?: string;
  model?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  fallbackSelected?: string | null;
  requestId?: string;
  endToEndLatencyMs?: number;
  primaryLatencyMs?: number;
  fallbackLatencyMs?: number;
}

export interface AiTelemetryLog {
  timestamp: string;
  requestId?: string | null;
  service: string;
  studentId: string;
  provider?: string;
  model: string;
  attempt: number;
  attemptRole?: "primary" | "retry" | "fallback";
  isFinal?: boolean;
  finalOutcome?: "SUCCESS" | "FAILED" | null;
  latencyMs: number;
  endToEndLatencyMs?: number | null;
  backoffMs?: number | null;
  status: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  billingTier?: "paid" | "free" | "unknown";
  billingMode?: BillingMode;
  error?: string;
  fallbackSelected?: string | null;
}

// ============================================================================
// 1. In-Memory Student-Level Sliding-Window Rate Limiter
// ============================================================================
const studentRequestWindows = new Map<string, number[]>();

export function checkStudentRateLimit(
  studentId: string,
  limitRpm: number = MAX_STUDENT_RPM
): { allowed: boolean; currentCount: number; retryAfterSeconds: number } {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  const timestamps = studentRequestWindows.get(studentId) || [];
  // Prune timestamps older than 60 seconds
  const validTimestamps = timestamps.filter((t) => t > oneMinuteAgo);

  if (validTimestamps.length >= limitRpm) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + 60000 - now) / 1000));
    studentRequestWindows.set(studentId, validTimestamps);
    return {
      allowed: false,
      currentCount: validTimestamps.length,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  studentRequestWindows.set(studentId, validTimestamps);

  return {
    allowed: true,
    currentCount: validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

// Exported for unit testing
export function _resetStudentRateLimit(studentId?: string): void {
  if (studentId) {
    studentRequestWindows.delete(studentId);
  } else {
    studentRequestWindows.clear();
  }
}

// ============================================================================
// 2. Global Concurrency Semaphore
// ============================================================================
let activeConcurrentCalls = 0;
const waitingQueue: Array<(acquired: boolean) => void> = [];

export function getActiveConcurrency(): number {
  return activeConcurrentCalls;
}

export function acquireConcurrencySlot(
  timeoutMs: number = CONCURRENCY_QUEUE_TIMEOUT_MS,
  maxCapacity: number = MAX_GLOBAL_CONCURRENT_GEMINI_CALLS
): Promise<boolean> {
  if (activeConcurrentCalls < maxCapacity) {
    activeConcurrentCalls++;
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;

    const waiter = (acquired: boolean) => {
      if (timer) clearTimeout(timer);
      resolve(acquired);
    };

    timer = setTimeout(() => {
      const idx = waitingQueue.indexOf(waiter);
      if (idx !== -1) {
        waitingQueue.splice(idx, 1);
      }
      resolve(false);
    }, timeoutMs);

    waitingQueue.push(waiter);
  });
}

export function releaseConcurrencySlot(): void {
  if (waitingQueue.length > 0) {
    const nextWaiter = waitingQueue.shift();
    if (nextWaiter) {
      nextWaiter(true);
      return;
    }
  }

  activeConcurrentCalls = Math.max(0, activeConcurrentCalls - 1);
}

// Exported for unit testing
export function _resetConcurrency(): void {
  activeConcurrentCalls = 0;
  waitingQueue.length = 0;
}

// ============================================================================
// 3. Retry-After & Exponential Backoff Helpers
// ============================================================================
export function parseRetryAfterHeader(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();

  // If numeric seconds: "10"
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }

  // If HTTP-Date format: "Wed, 21 Oct 2026 07:28:00 GMT"
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return Math.max(0, Math.min(diff, MAX_RETRY_DELAY_MS));
  }

  return null;
}

export function calculateBackoffWithJitter(
  attempt: number,
  explicitRetryMs?: number | null
): number {
  if (explicitRetryMs !== null && explicitRetryMs !== undefined && explicitRetryMs > 0) {
    return Math.min(explicitRetryMs, MAX_RETRY_DELAY_MS);
  }

  const exponential = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, attempt),
    MAX_RETRY_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  return exponential + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 4. Sanitized Structured Telemetry Logger
// ============================================================================
export function sanitizeLogContent(str: string): string {
  // Strip Google AI API keys (starts with AIza, followed by alphanumeric/dashes/underscores)
  let clean = str.replace(/AIza[A-Za-z0-9_-]{20,}/g, "[REDACTED_API_KEY]");
  // Strip Better-Auth / JWT tokens
  clean = clean.replace(/AQ\.[A-Za-z0-9_-]+/g, "[REDACTED_SESSION]");
  clean = clean.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED_TOKEN]");
  return clean;
}

export function logAiTelemetry(log: AiTelemetryLog): void {
  const sanitizedStudent = log.studentId ? `usr_${log.studentId.slice(-6)}` : "anonymous";
  const hasInputTokens = typeof log.inputTokens === "number" && log.inputTokens >= 0;
  const hasOutputTokens = typeof log.outputTokens === "number" && log.outputTokens >= 0;

  const detectedProvider =
    log.provider ||
    (log.model.toLowerCase().includes("gemini")
      ? "google"
      : log.model.toLowerCase().includes("django")
      ? "django"
      : log.model.toLowerCase().includes("deepseek") || log.model.toLowerCase().includes("ollama")
      ? "local"
      : "unknown");

  const entry = {
    timestamp: log.timestamp,
    event: "GEMINI_TELEMETRY",
    requestId: log.requestId || null,
    service: log.service,
    studentId: sanitizedStudent,
    provider: detectedProvider,
    model: log.model,
    attempt: log.attempt,
    attemptRole: log.attemptRole || "primary",
    isFinal: Boolean(log.isFinal),
    finalOutcome: log.finalOutcome || null,
    latencyMs: log.latencyMs,
    endToEndLatencyMs: log.endToEndLatencyMs ?? log.latencyMs,
    backoffMs: log.backoffMs || 0,
    status: log.status,
    inputTokens: hasInputTokens ? log.inputTokens : "UNKNOWN",
    outputTokens: hasOutputTokens ? log.outputTokens : "UNKNOWN",
    ...(log.error ? { error: sanitizeLogContent(log.error) } : {}),
    ...(log.fallbackSelected ? { fallbackSelected: log.fallbackSelected } : {}),
  };

  // Structured single-line JSON log for cloud log ingestion (Vercel / Datadog)
  console.log(JSON.stringify(entry));

  // Asynchronous non-blocking persistence - NEVER blocks or breaks student AI response
  try {
    const costUsd =
      hasInputTokens && hasOutputTokens
        ? calculateAiCostUsd(
            log.model,
            log.inputTokens,
            log.outputTokens,
            log.billingTier,
            log.billingMode || "standard"
          )
        : null;
    const totalTokens =
      hasInputTokens && hasOutputTokens
        ? (log.inputTokens as number) + (log.outputTokens as number)
        : null;

    db.aiTelemetry
      .create({
        data: {
          requestId: log.requestId || null,
          attempt: log.attempt,
          attemptRole: log.attemptRole || "primary",
          isFinal: log.isFinal ?? false,
          finalOutcome: log.finalOutcome || null,
          endToEndLatencyMs:
            log.endToEndLatencyMs !== undefined && log.endToEndLatencyMs !== null
              ? Math.max(0, Math.round(log.endToEndLatencyMs))
              : null,
          backoffMs:
            log.backoffMs !== undefined && log.backoffMs !== null
              ? Math.max(0, Math.round(log.backoffMs))
              : 0,
          provider: detectedProvider,
          model: log.model,
          service: log.service,
          studentId: sanitizedStudent,
          status: log.status,
          latencyMs: Math.max(0, Math.round(log.latencyMs)),
          inputTokens: hasInputTokens ? log.inputTokens : null,
          outputTokens: hasOutputTokens ? log.outputTokens : null,
          totalTokens: totalTokens,
          costUsd: costUsd,
          error: log.error ? sanitizeLogContent(log.error).slice(0, 500) : null,
          fallbackSelected: log.fallbackSelected || null,
        },
      })
      .catch((persistErr: any) => {
        // Isolated telemetry catch: NEVER breaks student AI interaction
        console.error(
          "[AiTelemetryPersistence] Non-fatal error persisting telemetry record:",
          persistErr?.message
        );
      });
  } catch (outerErr: any) {
    console.error(
      "[AiTelemetryPersistence] Non-fatal error scheduling telemetry record:",
      outerErr?.message
    );
  }
}

// ============================================================================
// 5. Central Resilient Gemini Calling Engine
// ============================================================================
export async function callGeminiWithResilience(
  options: GeminiCallOptions
): Promise<GeminiCallResult> {
  const {
    service,
    studentId,
    prompt,
    contents: customContents,
    systemInstruction,
    model: requestedModel,
    fallbackModels = GEMINI_FALLBACK_MODELS,
    timeoutMs,
    temperature = 0.3,
    maxOutputTokens,
    responseMimeType,
  } = options;

  const requestId = `req_${crypto.randomUUID()}`;
  const overallStartTime = Date.now();
  let primaryLatencyMs: number | null = null;
  let fallbackLatencyMs: number | null = null;
  let fallbackStartTime: number | null = null;
  let totalBackoffMs = 0;
  let requestAttemptCounter = 0;

  const resolvedTimeout =
    timeoutMs ||
    AI_TIMEOUTS[service.toUpperCase() as keyof typeof AI_TIMEOUTS] ||
    AI_TIMEOUTS.DEFAULT;

  // 1. Rate Limit Enforcement (Atomic Distributed Redis with Conservative Local Fail-Open)
  if (studentId) {
    let rateAllowed = true;
    let retryAfterSeconds = 0;
    const requestedLimit = options.limitRpm || (options.isGuest ? MAX_GUEST_RPM : MAX_STUDENT_RPM);

    if (isDistributedRedisConfigured()) {
      const distCheck = await checkDistributedRateLimit(studentId, requestedLimit);
      if (distCheck.isDistributed) {
        rateAllowed = distCheck.allowed;
        retryAfterSeconds = distCheck.retryAfterSeconds;
      } else {
        // Redis error/timeout -> Conservative local fallback to protect provider quota
        const localFallbackRpm = options.isGuest ? LOCAL_FALLBACK_GUEST_RPM : LOCAL_FALLBACK_STUDENT_RPM;
        const localCheck = checkStudentRateLimit(studentId, localFallbackRpm);
        rateAllowed = localCheck.allowed;
        retryAfterSeconds = localCheck.retryAfterSeconds;
      }
    } else {
      // Redis unconfigured -> Conservative local fallback to protect provider quota
      const localFallbackRpm = options.isGuest ? LOCAL_FALLBACK_GUEST_RPM : LOCAL_FALLBACK_STUDENT_RPM;
      const localCheck = checkStudentRateLimit(studentId, localFallbackRpm);
      rateAllowed = localCheck.allowed;
      retryAfterSeconds = localCheck.retryAfterSeconds;
    }

    if (!rateAllowed) {
      logAiTelemetry({
        timestamp: new Date().toISOString(),
        requestId,
        service,
        studentId,
        model: requestedModel || GEMINI_PRIMARY_MODEL,
        attempt: 0,
        attemptRole: "primary",
        isFinal: true,
        finalOutcome: "FAILED",
        latencyMs: 0,
        endToEndLatencyMs: Date.now() - overallStartTime,
        backoffMs: 0,
        status: 429,
        error: "RATE_LIMIT_EXCEEDED",
        billingTier: options.billingTier,
        billingMode: options.billingMode,
      });
      return {
        success: false,
        status: 429,
        error: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds,
        requestId,
        latencyMs: Date.now() - overallStartTime,
        endToEndLatencyMs: Date.now() - overallStartTime,
      };
    }
  }

  // 2. Validate API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    return {
      success: false,
      status: 503,
      error: "GEMINI_API_KEY_UNCONFIGURED",
      requestId,
      latencyMs: Date.now() - overallStartTime,
      endToEndLatencyMs: Date.now() - overallStartTime,
    };
  }

  // 3. Acquire Concurrency Slot (Distributed Tokenized Lease + Local Protection)
  let distributedLeaseId: string | null = null;
  if (isDistributedRedisConfigured()) {
    const distConcur = await acquireDistributedConcurrency(MAX_GLOBAL_CONCURRENT_GEMINI_CALLS);
    if (distConcur.isDistributed) {
      if (!distConcur.acquired) {
        logAiTelemetry({
          timestamp: new Date().toISOString(),
          requestId,
          service,
          studentId: studentId || "anonymous",
          model: requestedModel || GEMINI_PRIMARY_MODEL,
          attempt: 0,
          attemptRole: "primary",
          isFinal: true,
          finalOutcome: "FAILED",
          latencyMs: 0,
          endToEndLatencyMs: Date.now() - overallStartTime,
          backoffMs: 0,
          status: 503,
          error: "CONCURRENCY_LIMIT_EXCEEDED",
          billingTier: options.billingTier,
          billingMode: options.billingMode,
        });
        return {
          success: false,
          status: 503,
          error: "CONCURRENCY_LIMIT_EXCEEDED",
          requestId,
          latencyMs: Date.now() - overallStartTime,
          endToEndLatencyMs: Date.now() - overallStartTime,
        };
      }
      distributedLeaseId = distConcur.leaseId;
    }
  }

  // Enforce local ceiling (LOCAL_FALLBACK_CONCURRENCY_LIMIT when Redis is unconfigured or offline)
  const localCap = isDistributedRedisConfigured() && distributedLeaseId
    ? MAX_GLOBAL_CONCURRENT_GEMINI_CALLS
    : LOCAL_FALLBACK_CONCURRENCY_LIMIT;

  const slotAcquired = await acquireConcurrencySlot(CONCURRENCY_QUEUE_TIMEOUT_MS, localCap);
  if (!slotAcquired) {
    if (distributedLeaseId) {
      await releaseDistributedConcurrency(distributedLeaseId);
    }
    logAiTelemetry({
      timestamp: new Date().toISOString(),
      requestId,
      service,
      studentId: studentId || "anonymous",
      model: requestedModel || GEMINI_PRIMARY_MODEL,
      attempt: 0,
      attemptRole: "primary",
      isFinal: true,
      finalOutcome: "FAILED",
      latencyMs: 0,
      endToEndLatencyMs: Date.now() - overallStartTime,
      backoffMs: 0,
      status: 503,
      error: "CONCURRENCY_LIMIT_EXCEEDED",
      billingTier: options.billingTier,
      billingMode: options.billingMode,
    });
    return {
      success: false,
      status: 503,
      error: "CONCURRENCY_LIMIT_EXCEEDED",
      requestId,
      latencyMs: Date.now() - overallStartTime,
      endToEndLatencyMs: Date.now() - overallStartTime,
    };
  }

  const primaryModel = requestedModel || GEMINI_PRIMARY_MODEL;
  const candidateChain = [
    primaryModel,
    ...fallbackModels.filter((m) => m !== primaryModel),
  ].slice(0, MAX_TOTAL_MODEL_ATTEMPTS);

  let lastStatus = 500;
  let lastError = "All Gemini candidate models failed.";

  try {
    for (let modelIndex = 0; modelIndex < candidateChain.length; modelIndex++) {
      const currentModel = candidateChain[modelIndex];

      if (modelIndex > 0 && fallbackStartTime === null) {
        fallbackStartTime = Date.now();
      }

      for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
        requestAttemptCounter++;
        const attemptRole: "primary" | "retry" | "fallback" =
          modelIndex === 0
            ? attempt === 0
              ? "primary"
              : "retry"
            : "fallback";

        const attemptStartTime = Date.now();
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), resolvedTimeout);

        try {
          const contentsPayload = customContents || [
            {
              role: "user",
              parts: [{ text: prompt || "" }],
            },
          ];

          const requestBody: Record<string, unknown> = {
            contents: contentsPayload,
            generationConfig: {
              temperature,
              ...(maxOutputTokens ? { maxOutputTokens } : {}),
              ...(responseMimeType ? { responseMimeType } : {}),
            },
          };

          if (systemInstruction) {
            requestBody.systemInstruction = {
              parts: [{ text: systemInstruction }],
            };
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify(requestBody),
            }
          );

          clearTimeout(timerId);
          const latencyMs = Date.now() - attemptStartTime;
          lastStatus = response.status;

          // SUCCESS 200
          if (response.ok) {
            const data = await response.json();
            const textOutput =
              data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

            const inputTokens = data?.usageMetadata?.promptTokenCount;
            const outputTokens = data?.usageMetadata?.candidatesTokenCount;
            const now = Date.now();
            const endToEndLatencyMs = now - overallStartTime;

            if (modelIndex === 0) {
              primaryLatencyMs = endToEndLatencyMs;
            } else if (fallbackStartTime) {
              fallbackLatencyMs = now - fallbackStartTime;
            }

            logAiTelemetry({
              timestamp: new Date().toISOString(),
              requestId,
              service,
              studentId: studentId || "anonymous",
              model: currentModel,
              attempt: requestAttemptCounter,
              attemptRole,
              isFinal: true,
              finalOutcome: "SUCCESS",
              latencyMs,
              endToEndLatencyMs,
              backoffMs: totalBackoffMs,
              status: response.status,
              inputTokens,
              outputTokens,
              billingTier: options.billingTier,
              billingMode: options.billingMode,
              fallbackSelected: modelIndex > 0 ? currentModel : null,
            });

            return {
              success: true,
              text: textOutput,
              model: currentModel,
              latencyMs: endToEndLatencyMs,
              endToEndLatencyMs,
              primaryLatencyMs: primaryLatencyMs ?? undefined,
              fallbackLatencyMs: fallbackLatencyMs ?? undefined,
              inputTokens,
              outputTokens,
              status: 200,
              fallbackSelected: modelIndex > 0 ? currentModel : null,
              requestId,
            };
          }

          // ERROR HANDLING
          const errBody = await response.text().catch(() => "");
          lastError = `HTTP ${response.status}: ${errBody.slice(0, 150)}`;

          // 401/403: Key is invalid / unauthorized; abort entire chain immediately
          if (response.status === 401 || response.status === 403) {
            const endToEndLatencyMs = Date.now() - overallStartTime;
            logAiTelemetry({
              timestamp: new Date().toISOString(),
              requestId,
              service,
              studentId: studentId || "anonymous",
              model: currentModel,
              attempt: requestAttemptCounter,
              attemptRole,
              isFinal: true,
              finalOutcome: "FAILED",
              latencyMs,
              endToEndLatencyMs,
              backoffMs: totalBackoffMs,
              status: response.status,
              error: "UNAUTHORIZED_KEY",
              billingTier: options.billingTier,
              billingMode: options.billingMode,
            });
            return {
              success: false,
              status: response.status,
              error: "UNAUTHORIZED_KEY",
              requestId,
              latencyMs: endToEndLatencyMs,
              endToEndLatencyMs,
              primaryLatencyMs: primaryLatencyMs ?? undefined,
              fallbackLatencyMs: fallbackLatencyMs ?? undefined,
            };
          }

          // RETRYABLE ERROR (429 or 5xx)
          if (RETRYABLE_STATUS_CODES.has(response.status)) {
            const explicitRetryMs = parseRetryAfterHeader(
              response.headers.get("Retry-After")
            );
            const backoffMs = calculateBackoffWithJitter(attempt, explicitRetryMs);
            const endToEndLatencyMs = Date.now() - overallStartTime;

            const hasNextRetry = attempt < MAX_RETRIES_PER_MODEL;
            const hasNextModel = modelIndex < candidateChain.length - 1;
            const isChainTerminal = !hasNextRetry && !hasNextModel;

            logAiTelemetry({
              timestamp: new Date().toISOString(),
              requestId,
              service,
              studentId: studentId || "anonymous",
              model: currentModel,
              attempt: requestAttemptCounter,
              attemptRole,
              isFinal: isChainTerminal,
              finalOutcome: isChainTerminal ? "FAILED" : null,
              latencyMs,
              endToEndLatencyMs,
              backoffMs: backoffMs,
              status: response.status,
              error: `RETRYABLE_${response.status}_BACKOFF_${backoffMs}ms`,
              billingTier: options.billingTier,
              billingMode: options.billingMode,
            });

            if (hasNextRetry) {
              totalBackoffMs += backoffMs;
              await sleep(backoffMs);
              continue;
            } else {
              if (modelIndex === 0) {
                primaryLatencyMs = Date.now() - overallStartTime;
              }
              break;
            }
          } else {
            // Non-retryable error (e.g. 404, 400); do not retry this model
            const endToEndLatencyMs = Date.now() - overallStartTime;
            const isChainTerminal = modelIndex >= candidateChain.length - 1;

            logAiTelemetry({
              timestamp: new Date().toISOString(),
              requestId,
              service,
              studentId: studentId || "anonymous",
              model: currentModel,
              attempt: requestAttemptCounter,
              attemptRole,
              isFinal: isChainTerminal,
              finalOutcome: isChainTerminal ? "FAILED" : null,
              latencyMs,
              endToEndLatencyMs,
              backoffMs: 0,
              status: response.status,
              error: `NON_RETRYABLE_${response.status}`,
              billingTier: options.billingTier,
              billingMode: options.billingMode,
            });

            if (modelIndex === 0) {
              primaryLatencyMs = Date.now() - overallStartTime;
            }
            break;
          }
        } catch (fetchErr: unknown) {
          clearTimeout(timerId);
          const latencyMs = Date.now() - attemptStartTime;
          const isAbort =
            fetchErr instanceof Error && fetchErr.name === "AbortError";
          const errName = isAbort ? "TIMEOUT" : "NETWORK_ERROR";
          lastError = isAbort
            ? `Request timed out after ${resolvedTimeout}ms`
            : String(fetchErr);

          const hasNextRetry = !isAbort && attempt < MAX_RETRIES_PER_MODEL;
          const hasNextModel = modelIndex < candidateChain.length - 1;
          const isChainTerminal = !hasNextRetry && !hasNextModel;
          const endToEndLatencyMs = Date.now() - overallStartTime;

          logAiTelemetry({
            timestamp: new Date().toISOString(),
            requestId,
            service,
            studentId: studentId || "anonymous",
            model: currentModel,
            attempt: requestAttemptCounter,
            attemptRole,
            isFinal: isChainTerminal,
            finalOutcome: isChainTerminal ? "FAILED" : null,
            latencyMs,
            endToEndLatencyMs,
            backoffMs: 0,
            status: isAbort ? 408 : 500,
            error: errName,
            billingTier: options.billingTier,
            billingMode: options.billingMode,
          });

          // If timeout, don't retry same model immediately; move to fallback
          if (isAbort) {
            if (modelIndex === 0) {
              primaryLatencyMs = Date.now() - overallStartTime;
            }
            break;
          }

          if (hasNextRetry) {
            const backoffMs = calculateBackoffWithJitter(attempt);
            totalBackoffMs += backoffMs;
            await sleep(backoffMs);
            continue;
          } else {
            if (modelIndex === 0) {
              primaryLatencyMs = Date.now() - overallStartTime;
            }
            break;
          }
        }
      }
    }

    const endToEndLatencyMs = Date.now() - overallStartTime;
    if (fallbackStartTime) {
      fallbackLatencyMs = Date.now() - fallbackStartTime;
    }

    return {
      success: false,
      status: lastStatus,
      error: lastError,
      latencyMs: endToEndLatencyMs,
      endToEndLatencyMs,
      primaryLatencyMs: primaryLatencyMs ?? undefined,
      fallbackLatencyMs: fallbackLatencyMs ?? undefined,
      requestId,
    };
  } finally {
    releaseConcurrencySlot();
    if (distributedLeaseId) {
      await releaseDistributedConcurrency(distributedLeaseId);
    }
  }
}
