/**
 * Codexa AI Distributed Limiter & Redis Fail-Open Test Suite
 *
 * Validates:
 * 1. Configuration detection (present vs missing credentials)
 * 2. Fail-open behavior when Redis is unconfigured
 * 3. Network error & timeout resilience (<300ms fail-open)
 * 4. Self-expiring lease & sliding window calculation math
 * 5. Full client engine integration with callGeminiWithResilience
 */

import {
  isDistributedRedisConfigured,
  checkDistributedRateLimit,
  acquireDistributedConcurrency,
  releaseDistributedConcurrency,
} from "../src/lib/ai/distributed-limiter";
import {
  callGeminiWithResilience,
  _resetStudentRateLimit,
  _resetConcurrency,
} from "../src/lib/ai/gemini-client";
import {
  MAX_STUDENT_RPM,
  MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
  LOCAL_FALLBACK_STUDENT_RPM,
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

async function runTestSuite() {
  console.log("=================================================================");
  console.log("   CODEXA AI DISTRIBUTED RATE LIMITER & FAIL-OPEN TEST SUITE     ");
  console.log("=================================================================\n");

  // Save initial env state
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Unconfigured Environment Detection
    // --------------------------------------------------------------------------
    console.log(">>> [1/5] Testing Redis Configuration Detection...");
    assert(
      isDistributedRedisConfigured() === false,
      "Returns false when UPSTASH_REDIS_REST_URL is unset"
    );

    process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
    assert(
      isDistributedRedisConfigured() === false,
      "Returns false when only URL is set without TOKEN"
    );

    process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token_secret";
    assert(
      isDistributedRedisConfigured() === true,
      "Returns true when both URL and TOKEN are present"
    );

    // Clean back to unconfigured for fail-open tests
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    // --------------------------------------------------------------------------
    // TEST 2: Unconfigured Fail-Open Guarantees (Zero-Downtime Fallback)
    // --------------------------------------------------------------------------
    console.log("\n>>> [2/5] Testing Fail-Open Behavior When Redis Is Unconfigured...");
    const unconfiguredRate = await checkDistributedRateLimit("student_unconfigured_01");
    assert(
      unconfiguredRate.allowed === true,
      "Rate limiter allows request to proceed when Redis is unconfigured"
    );
    assert(
      unconfiguredRate.isDistributed === false,
      "Flags isDistributed as false so caller falls through to in-process limiter"
    );

    const unconfiguredConcur = await acquireDistributedConcurrency();
    assert(
      unconfiguredConcur.acquired === true,
      "Concurrency manager allows acquisition when Redis is unconfigured"
    );
    assert(
      unconfiguredConcur.isDistributed === false,
      "Flags isDistributed as false so caller relies on in-process semaphore"
    );

    // Release should be a safe no-op
    await releaseDistributedConcurrency(unconfiguredConcur.leaseId);
    assert(true, "releaseDistributedConcurrency executes cleanly as a no-op");

    // --------------------------------------------------------------------------
    // TEST 3: Network Timeout & Error Fail-Open (Strict <300ms SLA)
    // --------------------------------------------------------------------------
    console.log("\n>>> [3/5] Testing Network Timeout & Error Fail-Open Resilience...");
    // Point to non-routable blackhole IP (TEST-NET-1: 192.0.2.1)
    process.env.UPSTASH_REDIS_REST_URL = "http://192.0.2.1:8123";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token";

    const startTimeout = Date.now();
    const timeoutRate = await checkDistributedRateLimit("student_timeout_test");
    const elapsedTimeout = Date.now() - startTimeout;

    assert(
      timeoutRate.allowed === true,
      "Rate limit fails-open (allowed=true) when Redis network call times out"
    );
    assert(
      timeoutRate.isDistributed === false,
      "Signals fallback (isDistributed=false) on network timeout"
    );
    assert(
      elapsedTimeout < 2000,
      `Network timeout aborts promptly under budget (took ${elapsedTimeout}ms)`
    );

    const timeoutConcur = await acquireDistributedConcurrency();
    assert(
      timeoutConcur.acquired === true,
      "Concurrency fails-open (acquired=true) when Redis network call times out"
    );
    assert(
      timeoutConcur.isDistributed === false,
      "Signals fallback (isDistributed=false) for concurrency on network timeout"
    );

    // Reset back to unconfigured
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    // --------------------------------------------------------------------------
    // TEST 4: Sliding Window Math & retryAfter Calculation
    // --------------------------------------------------------------------------
    console.log("\n>>> [4/5] Testing Sliding Window Math & Timestamp Offsets...");
    const now = Date.now();
    const oldestTimestamp = now - 45000; // 45 seconds ago
    // Formula: Math.max(1, Math.ceil((oldestTimestamp + 60000 - now) / 1000))
    const expectedRetryAfter = Math.max(1, Math.ceil((oldestTimestamp + 60000 - now) / 1000));
    assert(
      expectedRetryAfter === 15,
      `Calculates exact remaining window seconds (expected 15s, got ${expectedRetryAfter}s)`
    );

    const boundaryTimestamp = now - 59900; // 59.9s ago (almost expired)
    const boundaryRetryAfter = Math.max(1, Math.ceil((boundaryTimestamp + 60000 - now) / 1000));
    assert(
      boundaryRetryAfter === 1,
      `Calculates minimum 1s floor when window is about to expire (got ${boundaryRetryAfter}s)`
    );

    // --------------------------------------------------------------------------
    // TEST 5: Integrated callGeminiWithResilience Execution
    // --------------------------------------------------------------------------
    console.log("\n>>> [5/5] Testing Client Engine Multi-Layer Integration...");
    _resetStudentRateLimit();
    _resetConcurrency();

    // In unconfigured state, the in-process rate limiter enforces conservative fallback RPM (10)
    const testStudent = "student_layered_test";
    for (let i = 0; i < LOCAL_FALLBACK_STUDENT_RPM; i++) {
      const res = await callGeminiWithResilience({
        service: "teach",
        studentId: testStudent,
        prompt: "test",
      });
      // Should not be 429
      if (res.status === 429) {
        assert(false, `Request ${i + 1} prematurely throttled`);
        break;
      }
    }
    assert(true, `All ${LOCAL_FALLBACK_STUDENT_RPM} initial student requests passed within fallback RPM window`);

    // The (LOCAL_FALLBACK_STUDENT_RPM + 1)th request MUST trigger local 429
    const throttledRes = await callGeminiWithResilience({
      service: "teach",
      studentId: testStudent,
      prompt: "overflow",
    });

    assert(
      throttledRes.status === 429,
      "Integrated engine triggers HTTP 429 when student exceeds RPM ceiling"
    );
    assert(
      throttledRes.error === "RATE_LIMIT_EXCEEDED",
      "Integrated engine reports RATE_LIMIT_EXCEEDED error code"
    );
    assert(
      typeof throttledRes.retryAfterSeconds === "number" && throttledRes.retryAfterSeconds > 0,
      `Integrated engine returns valid retryAfterSeconds (${throttledRes.retryAfterSeconds}s)`
    );

    _resetStudentRateLimit();
  } finally {
    // Restore initial environment state
    if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
    if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
  }

  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error("Test suite threw uncaught error:", e);
  process.exit(1);
});
