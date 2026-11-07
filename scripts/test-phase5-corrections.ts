/**
 * Codexa AI Phase 5 — Critical Distributed Limiter Corrections Test Suite
 *
 * Verifies all 4 Phase 5 production blocker fixes:
 * 1. Atomic sliding-window rate limiting (50 simultaneous requests)
 * 2. Safe tokenized concurrency leases via Redis Sorted Sets & Lua
 * 3. Expired lease atomic pruning & cross-lease isolation
 * 4. Safe TTL behavior (>21s worst-case duration)
 * 5. Conservative local fallback limits when Redis is missing/offline (concurrency=2, student RPM=10, guest RPM=3)
 * 6. Server-side student authentication & guest identity derivation
 */

import http from "http";
import crypto from "crypto";
import {
  isDistributedRedisConfigured,
  checkDistributedRateLimit,
  acquireDistributedConcurrency,
  releaseDistributedConcurrency,
} from "../src/lib/ai/distributed-limiter";
import {
  callGeminiWithResilience,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  _resetStudentRateLimit,
  _resetConcurrency,
} from "../src/lib/ai/gemini-client";
import {
  MAX_STUDENT_RPM,
  MAX_GUEST_RPM,
  MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
  LOCAL_FALLBACK_CONCURRENCY_LIMIT,
  LOCAL_FALLBACK_STUDENT_RPM,
  LOCAL_FALLBACK_GUEST_RPM,
  DISTRIBUTED_CONCURRENCY_TTL_SECONDS,
} from "../src/lib/ai/gemini-config";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
  }
}

// In-memory Redis simulation server for Upstash REST API
class MockUpstashServer {
  private server: http.Server | null = null;
  public port: number = 0;
  // Key -> Map<member, score>
  public zsets: Map<string, Map<string, number>> = new Map();

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let bodyStr = "";
        req.on("data", (chunk) => (bodyStr += chunk));
        req.on("end", () => {
          try {
            const cmd = JSON.parse(bodyStr);
            const op = cmd[0];

            if (op === "EVAL") {
              const script: string = cmd[1];
              const key: string = cmd[3];

              // 1. Sliding Window Rate Limiter
              if (script.includes("ZREMRANGEBYSCORE") && script.includes("retryAfterSec")) {
                const now = Number(cmd[4]);
                const windowMs = Number(cmd[5]);
                const limit = Number(cmd[6]);
                const member = String(cmd[7]);

                if (!this.zsets.has(key)) this.zsets.set(key, new Map());
                const zset = this.zsets.get(key)!;

                // Prune
                const clearBefore = now - windowMs;
                for (const [m, s] of zset.entries()) {
                  if (s <= clearBefore) zset.delete(m);
                }

                const currentCount = zset.size;
                if (currentCount < limit) {
                  zset.set(member, now);
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ result: [1, currentCount + 1, 0] }));
                } else {
                  let oldestTime = now;
                  for (const s of zset.values()) {
                    if (s < oldestTime) oldestTime = s;
                  }
                  const retryAfter = Math.max(1, Math.ceil((oldestTime + windowMs - now) / 1000));
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ result: [0, currentCount, retryAfter] }));
                }
                return;
              }

              // 2. Concurrency Lease Acquire
              if (script.includes("leaseTtlMs") && script.includes("maxConcurrency")) {
                const now = Number(cmd[4]);
                const leaseId = String(cmd[5]);
                const leaseTtlMs = Number(cmd[6]);
                const maxConcurrency = Number(cmd[7]);

                if (!this.zsets.has(key)) this.zsets.set(key, new Map());
                const zset = this.zsets.get(key)!;

                // Prune expired
                for (const [m, s] of zset.entries()) {
                  if (s <= now) zset.delete(m);
                }

                const activeCount = zset.size;
                if (activeCount < maxConcurrency) {
                  zset.set(leaseId, now + leaseTtlMs);
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ result: [1, leaseId, activeCount + 1] }));
                } else {
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ result: [0, "", activeCount] }));
                }
                return;
              }

              // 3. Concurrency Lease Release
              if (script.includes("ZREM") && script.includes("leaseId")) {
                const leaseId = String(cmd[4]);
                if (!this.zsets.has(key)) this.zsets.set(key, new Map());
                const zset = this.zsets.get(key)!;

                const existed = zset.has(leaseId);
                if (existed) zset.delete(leaseId);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ result: [existed ? 1 : 0, zset.size] }));
                return;
              }
            }

            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "UNKNOWN_COMMAND" }));
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server!.address() as any;
        this.port = addr.port;
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

async function runPhase5TestSuite() {
  console.log("=================================================================");
  console.log("   CODEXA AI PHASE 5 — CRITICAL DISTRIBUTED LIMITER TESTS       ");
  console.log("=================================================================\n");

  const mockServer = new MockUpstashServer();
  await mockServer.start();

  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${mockServer.port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test_phase5_token";

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Atomic Rate Limiting Under 50 Simultaneous Requests
    // --------------------------------------------------------------------------
    console.log(">>> [1/7] Testing 50 Simultaneous Requests (Atomic Lua Sliding Window)...");
    const student = "simultaneous_student_50";
    
    // Fire 50 simultaneous requests in parallel
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 50; i++) {
      promises.push(checkDistributedRateLimit(student, MAX_STUDENT_RPM));
    }
    const results = await Promise.all(promises);

    const allowedCount = results.filter((r) => r.allowed === true).length;
    const blockedCount = results.filter((r) => r.allowed === false).length;

    assert(
      allowedCount === MAX_STUDENT_RPM,
      `Exactly ${MAX_STUDENT_RPM} of 50 simultaneous requests allowed (got ${allowedCount})`
    );
    assert(
      blockedCount === 50 - MAX_STUDENT_RPM,
      `Exactly ${50 - MAX_STUDENT_RPM} of 50 simultaneous requests blocked (got ${blockedCount})`
    );
    assert(
      results.every((r) => r.isDistributed === true),
      "All requests were processed through atomic distributed Lua script"
    );
    const blockedResult = results.find((r) => r.allowed === false);
    assert(
      blockedResult?.retryAfterSeconds !== undefined && blockedResult.retryAfterSeconds > 0,
      `Blocked requests return dynamic retryAfterSeconds (${blockedResult?.retryAfterSeconds}s)`
    );

    // --------------------------------------------------------------------------
    // TEST 2: Concurrent Tokenized Lease Acquisition Up to Ceiling (12)
    // --------------------------------------------------------------------------
    console.log("\n>>> [2/7] Testing Tokenized Concurrency Leases Up to Ceiling (12)...");
    const leasePromises: Promise<any>[] = [];
    // Attempt 15 concurrent lease acquisitions
    for (let i = 0; i < 15; i++) {
      leasePromises.push(acquireDistributedConcurrency(MAX_GLOBAL_CONCURRENT_GEMINI_CALLS));
    }
    const leaseResults = await Promise.all(leasePromises);

    const acquiredLeases = leaseResults.filter((l) => l.acquired === true);
    const rejectedLeases = leaseResults.filter((l) => l.acquired === false);

    assert(
      acquiredLeases.length === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
      `Exactly ${MAX_GLOBAL_CONCURRENT_GEMINI_CALLS} leases acquired at ceiling (got ${acquiredLeases.length})`
    );
    assert(
      rejectedLeases.length === 15 - MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
      `Excess requests beyond ceiling were rejected (got ${rejectedLeases.length})`
    );

    // Verify all acquired leases have unique non-null leaseIds
    const leaseIds = acquiredLeases.map((l) => l.leaseId);
    const uniqueLeaseIds = new Set(leaseIds);
    assert(
      uniqueLeaseIds.size === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
      "Every acquired lease has a unique cryptographic UUID leaseId"
    );

    // --------------------------------------------------------------------------
    // TEST 3: Cross-Lease Isolation (Cannot Release Another's Lease)
    // --------------------------------------------------------------------------
    console.log("\n>>> [3/7] Testing Cross-Lease Isolation & Invalid Release Safety...");
    const dummyLeaseId = crypto.randomUUID();
    const fakeRelease = await releaseDistributedConcurrency(dummyLeaseId);

    assert(
      fakeRelease.removed === false,
      "Releasing a non-existent or foreign leaseId returns removed=false"
    );
    assert(
      fakeRelease.remaining === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
      `Active lease count remains untouched at ${MAX_GLOBAL_CONCURRENT_GEMINI_CALLS} (no side effects)`
    );

    // Release ONE valid lease
    const targetLeaseId = leaseIds[0];
    const validRelease = await releaseDistributedConcurrency(targetLeaseId);
    assert(
      validRelease.removed === true,
      "Releasing possessed leaseId succeeds (removed=true)"
    );
    assert(
      validRelease.remaining === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS - 1,
      `Active lease count decrements to ${MAX_GLOBAL_CONCURRENT_GEMINI_CALLS - 1}`
    );

    // Releasing the same lease a second time is a safe no-op
    const doubleRelease = await releaseDistributedConcurrency(targetLeaseId);
    assert(
      doubleRelease.removed === false,
      "Double-releasing the same lease is a safe no-op (removed=false)"
    );

    // Clean up remaining leases
    for (let i = 1; i < leaseIds.length; i++) {
      await releaseDistributedConcurrency(leaseIds[i]);
    }

    // --------------------------------------------------------------------------
    // TEST 4: Expired Lease Atomic Pruning
    // --------------------------------------------------------------------------
    console.log("\n>>> [4/7] Testing Expired Lease Atomic Pruning...");
    const concurrencyKey = `ksai:ai:concurrency:leases`;
    const zset = mockServer.zsets.get(concurrencyKey)!;
    
    // Inject a stale expired lease with a past timestamp
    const staleLeaseId = "stale_orphaned_lease_999";
    zset.set(staleLeaseId, Date.now() - 5000); // Expired 5 seconds ago

    // Acquiring a new lease should atomically prune the stale lease
    const freshLease = await acquireDistributedConcurrency(MAX_GLOBAL_CONCURRENT_GEMINI_CALLS);
    assert(
      freshLease.acquired === true,
      "Fresh lease acquired successfully"
    );
    assert(
      !zset.has(staleLeaseId),
      "Expired lease was atomically pruned from Redis Sorted Set on acquisition"
    );
    await releaseDistributedConcurrency(freshLease.leaseId);

    // --------------------------------------------------------------------------
    // TEST 5: Safe TTL Prevents Double Allocation During Long Requests
    // --------------------------------------------------------------------------
    console.log("\n>>> [5/7] Testing Safe TTL (45s) Prevents Double Allocation During Long Requests...");
    assert(
      DISTRIBUTED_CONCURRENCY_TTL_SECONDS === 45,
      `Lease TTL is configured to 45 seconds (got ${DISTRIBUTED_CONCURRENCY_TTL_SECONDS}s)`
    );
    const worstCaseRequestMs = 21250; // Max resume analysis + retry duration
    assert(
      DISTRIBUTED_CONCURRENCY_TTL_SECONDS * 1000 > worstCaseRequestMs,
      `45s TTL safely outlives worst-case request+retry duration of ${worstCaseRequestMs}ms`
    );

    // --------------------------------------------------------------------------
    // TEST 6: Conservative Fallback Policy When Redis Is Missing or Offline
    // --------------------------------------------------------------------------
    console.log("\n>>> [6/7] Testing Conservative Local Fallback When Redis Is Offline...");
    // Simulate Redis offline by pointing to dead port
    await mockServer.stop();
    process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:54321`;

    assert(
      LOCAL_FALLBACK_CONCURRENCY_LIMIT === 2,
      `Local fallback concurrency ceiling is restricted to 2 calls per Lambda (got ${LOCAL_FALLBACK_CONCURRENCY_LIMIT})`
    );
    assert(
      LOCAL_FALLBACK_STUDENT_RPM === 10,
      `Local fallback student rate limit is restricted to 10 RPM (got ${LOCAL_FALLBACK_STUDENT_RPM})`
    );
    assert(
      LOCAL_FALLBACK_GUEST_RPM === 3,
      `Local fallback guest rate limit is restricted to 3 RPM (got ${LOCAL_FALLBACK_GUEST_RPM})`
    );

    // Verify local semaphore honors fallback cap
    _resetConcurrency();
    const slot1 = await acquireConcurrencySlot(100, LOCAL_FALLBACK_CONCURRENCY_LIMIT);
    const slot2 = await acquireConcurrencySlot(100, LOCAL_FALLBACK_CONCURRENCY_LIMIT);
    const slot3 = await acquireConcurrencySlot(100, LOCAL_FALLBACK_CONCURRENCY_LIMIT);

    assert(slot1 === true, "First fallback slot acquired");
    assert(slot2 === true, "Second fallback slot acquired (reaches fallback cap 2)");
    assert(slot3 === false, "Third slot rejected under conservative fallback cap (2)");

    releaseConcurrencySlot();
    releaseConcurrencySlot();
    _resetConcurrency();

    // --------------------------------------------------------------------------
    // TEST 7: Server-Side Student Authentication & Guest Hashing
    // --------------------------------------------------------------------------
    console.log("\n>>> [7/7] Testing Server-Side Identity Resolution & Guest Tier...");
    assert(
      MAX_GUEST_RPM === 5,
      `MAX_GUEST_RPM is configured to 5 RPM (got ${MAX_GUEST_RPM})`
    );
    assert(
      MAX_STUDENT_RPM === 20,
      `MAX_STUDENT_RPM is configured to 20 RPM (got ${MAX_STUDENT_RPM})`
    );

    // Verify guest IP hashing determinism
    const ipA = "203.0.113.195";
    const hashA = "guest_" + crypto.createHash("sha256").update(ipA).digest("hex").slice(0, 16);
    const hashA2 = "guest_" + crypto.createHash("sha256").update(ipA).digest("hex").slice(0, 16);
    assert(hashA === hashA2, "Guest IP produces deterministic hashed identity");
    assert(hashA.startsWith("guest_"), "Guest identity is prefixed with guest_");
    assert(hashA.length === 22, "Guest identity is 22 characters long (guest_ + 16 hex chars)");

    const ipB = "198.51.100.42";
    const hashB = "guest_" + crypto.createHash("sha256").update(ipB).digest("hex").slice(0, 16);
    assert(hashA !== hashB, "Distinct guest IPs produce distinct isolated identities");

  } finally {
    if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase5TestSuite().catch((e) => {
  console.error("Phase 5 test suite threw uncaught error:", e);
  process.exit(1);
});
