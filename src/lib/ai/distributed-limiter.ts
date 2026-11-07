/**
 * Codexa Distributed AI Rate Limiter & Concurrency Manager (Phase 5)
 *
 * Implements atomic Redis Lua scripts via Upstash Redis HTTPS REST API (EVAL).
 * Requires ZERO external npm dependencies (uses native fetch).
 *
 * Guarantees:
 * 1. Atomic Sliding-Window Rate Limiting: Check and record execute in a single Lua script.
 * 2. Safe Tokenized Concurrency Leases: Uses Redis Sorted Sets (ZSET) with unique cryptographic
 *    lease IDs. Expired leases are pruned atomically. Requests can ONLY release their own leaseId.
 * 3. Safe 45s TTL prevents double allocation during model retries (max duration 21s).
 * 4. Zero-Downtime Fail-Open: Falls back to process-local limits if Redis is unconfigured or times out (>300ms).
 */

import crypto from "crypto";
import {
  MAX_STUDENT_RPM,
  MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
  REDIS_REST_TIMEOUT_MS,
  DISTRIBUTED_CONCURRENCY_TTL_SECONDS,
  REDIS_KEY_PREFIX,
} from "./gemini-config";

export interface DistributedRateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds: number;
  isDistributed: boolean;
}

export interface DistributedConcurrencyResult {
  acquired: boolean;
  leaseId: string | null;
  activeCount: number;
  isDistributed: boolean;
}

// Check whether Upstash Redis REST credentials are configured
export function isDistributedRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && url.trim().length > 0 && token && token.trim().length > 0);
}

/**
 * Execute an atomic command or EVAL script against Upstash Redis REST API.
 */
async function executeUpstashCommand<T = any>(
  command: (string | number)[],
  timeoutMs: number = REDIS_REST_TIMEOUT_MS
): Promise<{ success: boolean; result?: T; error?: string }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { success: false, error: "REDIS_NOT_CONFIGURED" };
  }

  const endpoint = url.replace(/\/+$/, "");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP_${res.status}` };
    }

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true, result: data.result };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    return { success: false, error: isTimeout ? "TIMEOUT" : err?.message || "NETWORK_ERROR" };
  }
}

// ============================================================================
// 1. Atomic Lua Script: Sliding-Window Rate Limiter
// ============================================================================
const LUA_SLIDING_WINDOW_RATE_LIMIT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local clearBefore = now - window

-- 1. Remove expired timestamps
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

-- 2. Count active requests in current window
local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
  -- Allowed: Add current request and set TTL
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 10)
  return {1, currentCount + 1, 0}
else
  -- Blocked: Find oldest score to compute dynamic retry-after seconds
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestTimestamp = now
  if oldest and #oldest >= 2 then
    oldestTimestamp = tonumber(oldest[2])
  end
  local retryAfterMs = (oldestTimestamp + window) - now
  local retryAfterSec = math.ceil(retryAfterMs / 1000)
  if retryAfterSec < 1 then retryAfterSec = 1 end
  return {0, currentCount, retryAfterSec}
end
`.trim();

/**
 * Check and record a student's request in the shared distributed sliding window.
 * Executed as a single atomic Lua script to prevent check-then-act race conditions.
 */
export async function checkDistributedRateLimit(
  studentId: string,
  limitRpm: number = MAX_STUDENT_RPM
): Promise<DistributedRateLimitResult> {
  if (!isDistributedRedisConfigured()) {
    return {
      allowed: true,
      currentCount: 0,
      retryAfterSeconds: 0,
      isDistributed: false,
    };
  }

  const now = Date.now();
  const windowMs = 60000;
  const key = `${REDIS_KEY_PREFIX}ratelimit:${studentId}`;
  const uniqueMember = `${now}_${crypto.randomUUID()}`;

  try {
    const evalRes = await executeUpstashCommand<[number, number, number]>([
      "EVAL",
      LUA_SLIDING_WINDOW_RATE_LIMIT,
      1,
      key,
      now,
      windowMs,
      limitRpm,
      uniqueMember,
    ]);

    if (!evalRes.success || !Array.isArray(evalRes.result)) {
      // Fail-open to local in-process limiter
      return {
        allowed: true,
        currentCount: 0,
        retryAfterSeconds: 0,
        isDistributed: false,
      };
    }

    const [allowedFlag, currentCount, retryAfterSeconds] = evalRes.result;
    return {
      allowed: allowedFlag === 1,
      currentCount,
      retryAfterSeconds,
      isDistributed: true,
    };
  } catch {
    // Fail-open on unexpected errors
    return {
      allowed: true,
      currentCount: 0,
      retryAfterSeconds: 0,
      isDistributed: false,
    };
  }
}

// ============================================================================
// 2. Atomic Lua Scripts: Tokenized Concurrency Leases via Sorted Set (ZSET)
// ============================================================================
const LUA_ACQUIRE_CONCURRENCY_LEASE = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local leaseId = ARGV[2]
local leaseTtlMs = tonumber(ARGV[3])
local maxConcurrency = tonumber(ARGV[4])

-- 1. Atomically remove expired leases (score < now)
redis.call('ZREMRANGEBYSCORE', key, 0, now)

-- 2. Count active, unexpired leases
local activeCount = redis.call('ZCARD', key)

if activeCount < maxConcurrency then
  local expiresAt = now + leaseTtlMs
  redis.call('ZADD', key, expiresAt, leaseId)
  redis.call('EXPIRE', key, math.ceil(leaseTtlMs / 1000) + 15)
  return {1, leaseId, activeCount + 1}
else
  return {0, '', activeCount}
end
`.trim();

const LUA_RELEASE_CONCURRENCY_LEASE = `
local key = KEYS[1]
local leaseId = ARGV[1]

-- Atomically remove ONLY this specific leaseId token
local removed = redis.call('ZREM', key, leaseId)
local remaining = redis.call('ZCARD', key)

return {removed, remaining}
`.trim();

/**
 * Acquire a tokenized distributed concurrency lease.
 * Returns a unique leaseId that must be presented to release the slot.
 */
export async function acquireDistributedConcurrency(
  maxConcurrency: number = MAX_GLOBAL_CONCURRENT_GEMINI_CALLS
): Promise<DistributedConcurrencyResult> {
  if (!isDistributedRedisConfigured()) {
    return {
      acquired: true,
      leaseId: null,
      activeCount: 0,
      isDistributed: false,
    };
  }

  const now = Date.now();
  const leaseId = crypto.randomUUID();
  const leaseTtlMs = DISTRIBUTED_CONCURRENCY_TTL_SECONDS * 1000;
  const key = `${REDIS_KEY_PREFIX}concurrency:leases`;

  try {
    const evalRes = await executeUpstashCommand<[number, string, number]>([
      "EVAL",
      LUA_ACQUIRE_CONCURRENCY_LEASE,
      1,
      key,
      now,
      leaseId,
      leaseTtlMs,
      maxConcurrency,
    ]);

    if (!evalRes.success || !Array.isArray(evalRes.result)) {
      // Fail-open to local in-process limiter
      return {
        acquired: true,
        leaseId: null,
        activeCount: 0,
        isDistributed: false,
      };
    }

    const [acquiredFlag, returnedLeaseId, activeCount] = evalRes.result;
    const acquired = acquiredFlag === 1;

    return {
      acquired,
      leaseId: acquired ? returnedLeaseId || leaseId : null,
      activeCount,
      isDistributed: true,
    };
  } catch {
    // Fail-open on network errors
    return {
      acquired: true,
      leaseId: null,
      activeCount: 0,
      isDistributed: false,
    };
  }
}

/**
 * Release a tokenized distributed concurrency lease.
 * Guarantees that only the request possessing the specific leaseId can release it.
 * Invalid or foreign lease IDs result in a no-op (removed = 0).
 */
export async function releaseDistributedConcurrency(
  leaseId?: string | null
): Promise<{ removed: boolean; remaining: number }> {
  if (!isDistributedRedisConfigured() || !leaseId) {
    return { removed: false, remaining: 0 };
  }

  const key = `${REDIS_KEY_PREFIX}concurrency:leases`;

  try {
    const evalRes = await executeUpstashCommand<[number, number]>([
      "EVAL",
      LUA_RELEASE_CONCURRENCY_LEASE,
      1,
      key,
      leaseId,
    ]);

    if (evalRes.success && Array.isArray(evalRes.result)) {
      const [removedCount, remaining] = evalRes.result;
      return { removed: removedCount > 0, remaining };
    }
  } catch {
    // Non-blocking cleanup
  }

  return { removed: false, remaining: 0 };
}
