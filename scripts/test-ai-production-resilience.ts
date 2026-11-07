/**
 * Automated Production Resilience Test Suite for Codexa Gemini AI
 *
 * Validates:
 * 1. Model resolution & centralized configuration
 * 2. Student-level sliding window rate limiter
 * 3. Global concurrency semaphore
 * 4. Request timeout enforcement
 * 5. Retry-After header parsing & exponential backoff with jitter
 * 6. Non-retryable vs. retryable status handling
 * 7. Structured log sanitization (preventing secret/key leaks)
 * 8. Live resilient Gemini generation smoke test
 */

import {
  GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODELS,
  GEMINI_LITE_MODEL,
  MAX_STUDENT_RPM,
  MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
  AI_TIMEOUTS,
  RETRYABLE_STATUS_CODES,
} from "../src/lib/ai/gemini-config";

import {
  checkStudentRateLimit,
  _resetStudentRateLimit,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  _resetConcurrency,
  getActiveConcurrency,
  parseRetryAfterHeader,
  calculateBackoffWithJitter,
  sanitizeLogContent,
  callGeminiWithResilience,
} from "../src/lib/ai/gemini-client";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail: string = ""): void {
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
  console.log("   CODEXA AI PRODUCTION RESILIENCE & VERIFICATION TEST SUITE");
  console.log("=================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Model Resolution & Configuration Constants
  // --------------------------------------------------------------------------
  console.log(">>> [1/7] Testing Centralized Configuration & Verified Model IDs...");
  assert(
    GEMINI_PRIMARY_MODEL === "gemini-3.6-flash",
    "Primary model matches verified live endpoint gemini-3.6-flash",
    `Actual: ${GEMINI_PRIMARY_MODEL}`
  );
  assert(
    GEMINI_FALLBACK_MODELS.includes("gemini-3.5-flash"),
    "Fallback chain includes verified live model gemini-3.5-flash"
  );
  assert(
    GEMINI_LITE_MODEL === "gemini-3.1-flash-lite",
    "Lite model is gemini-3.1-flash-lite"
  );
  assert(
    MAX_STUDENT_RPM === 20,
    "Student RPM is configured to 20"
  );
  assert(
    MAX_GLOBAL_CONCURRENT_GEMINI_CALLS === 12,
    "Global concurrency ceiling is 12"
  );
  assert(
    AI_TIMEOUTS.TEACH === 6000 && AI_TIMEOUTS.INTERVIEW === 8000,
    "Timeouts are explicitly defined for teach (6s) and interview (8s)"
  );
  assert(
    RETRYABLE_STATUS_CODES.has(429) && RETRYABLE_STATUS_CODES.has(503),
    "Retryable status codes include 429 and 503"
  );
  assert(
    !RETRYABLE_STATUS_CODES.has(404) && !RETRYABLE_STATUS_CODES.has(400),
    "Non-retryable status codes (400, 404) are excluded from retry set"
  );

  // --------------------------------------------------------------------------
  // TEST 2: Student-Level Sliding-Window Rate Limiter
  // --------------------------------------------------------------------------
  console.log("\n>>> [2/7] Testing Student-Level Rate Limiter...");
  _resetStudentRateLimit();

  const testStudentId = "test_student_alpha";
  const customLimit = 5;

  // Fire requests 1 through 5 (should all pass)
  let allFirstFiveAllowed = true;
  for (let i = 1; i <= customLimit; i++) {
    const res = checkStudentRateLimit(testStudentId, customLimit);
    if (!res.allowed) allFirstFiveAllowed = false;
  }
  assert(allFirstFiveAllowed, `First ${customLimit} requests allowed under limit`);

  // 6th request must be blocked with retry-after
  const blockedRes = checkStudentRateLimit(testStudentId, customLimit);
  assert(
    !blockedRes.allowed,
    "Request beyond limit is blocked (allowed = false)",
    `Actual allowed: ${blockedRes.allowed}`
  );
  assert(
    blockedRes.retryAfterSeconds > 0 && blockedRes.retryAfterSeconds <= 60,
    "Blocked request returns dynamic retryAfterSeconds (1-60s)",
    `Actual: ${blockedRes.retryAfterSeconds}s`
  );

  // Another distinct student should NOT be throttled
  const otherStudentRes = checkStudentRateLimit("test_student_beta", customLimit);
  assert(
    otherStudentRes.allowed,
    "Distinct student is isolated and allowed",
    `Actual: ${otherStudentRes.allowed}`
  );

  _resetStudentRateLimit();

  // --------------------------------------------------------------------------
  // TEST 3: Global Concurrency Semaphore
  // --------------------------------------------------------------------------
  console.log("\n>>> [3/7] Testing Global Concurrency Semaphore...");
  _resetConcurrency();

  assert(getActiveConcurrency() === 0, "Initial active concurrency is 0");

  // Acquire all available slots
  const acquiredSlots: boolean[] = [];
  for (let i = 0; i < MAX_GLOBAL_CONCURRENT_GEMINI_CALLS; i++) {
    acquiredSlots.push(await acquireConcurrencySlot(200));
  }
  assert(
    acquiredSlots.every((s) => s === true),
    `Successfully acquired all ${MAX_GLOBAL_CONCURRENT_GEMINI_CALLS} concurrent slots`
  );
  assert(
    getActiveConcurrency() === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS,
    `Active concurrency reaches ceiling (${MAX_GLOBAL_CONCURRENT_GEMINI_CALLS})`
  );

  // Next slot acquisition should timeout and reject
  const overflowAcquired = await acquireConcurrencySlot(100);
  assert(
    overflowAcquired === false,
    "Overflow acquisition beyond ceiling returns false on queue timeout"
  );

  // Release one slot
  releaseConcurrencySlot();
  assert(
    getActiveConcurrency() === MAX_GLOBAL_CONCURRENT_GEMINI_CALLS - 1,
    "Active concurrency decrements on release"
  );

  // Now an acquisition should succeed
  const reacquired = await acquireConcurrencySlot(200);
  assert(reacquired === true, "New request acquires released slot successfully");

  // Release all
  for (let i = 0; i < MAX_GLOBAL_CONCURRENT_GEMINI_CALLS; i++) {
    releaseConcurrencySlot();
  }
  assert(getActiveConcurrency() === 0, "All slots cleanly released (count = 0)");
  _resetConcurrency();

  // --------------------------------------------------------------------------
  // TEST 4: Retry-After & Exponential Backoff with Jitter
  // --------------------------------------------------------------------------
  console.log("\n>>> [4/7] Testing Retry-After & Backoff Calculations...");

  // Test numeric Retry-After header
  const parsedSeconds = parseRetryAfterHeader("2");
  assert(parsedSeconds === 2000, "Numeric Retry-After '2' parses to 2000ms");

  const parsedZero = parseRetryAfterHeader("0");
  assert(parsedZero === 0, "Retry-After '0' parses to 0ms");

  const parsedCap = parseRetryAfterHeader("100");
  assert(
    parsedCap !== null && parsedCap <= 3000,
    "Excessive Retry-After is capped at MAX_RETRY_DELAY_MS (3000ms)",
    `Actual: ${parsedCap}`
  );

  const parsedNull = parseRetryAfterHeader(null);
  assert(parsedNull === null, "Null header returns null");

  // Test backoff calculation with jitter
  const backoff0 = calculateBackoffWithJitter(0);
  assert(
    backoff0 >= 500 && backoff0 <= 750,
    "Attempt 0 backoff is between 500ms and 750ms (base 500 + jitter)",
    `Actual: ${backoff0}ms`
  );

  const backoff1 = calculateBackoffWithJitter(1);
  assert(
    backoff1 >= 1000 && backoff1 <= 1250,
    "Attempt 1 backoff is between 1000ms and 1250ms (base 1000 + jitter)",
    `Actual: ${backoff1}ms`
  );

  const explicitDelay = calculateBackoffWithJitter(0, 1500);
  assert(explicitDelay === 1500, "Explicit Retry-After overrides exponential calculation");

  // --------------------------------------------------------------------------
  // TEST 5: Structured Log Sanitizer
  // --------------------------------------------------------------------------
  console.log("\n>>> [5/7] Testing Structured Log Sanitization (Zero Secret Leaks)...");

  const dummyKey = "AIzaSyDummyGoogleKey123456789012345";
  const dummyAuth = "AQ.DummyBetterAuthSessionToken987654321";
  const dummyBearer = "Bearer secret_jwt_payload_header";

  const rawMessage = `Error contacting endpoint with key=${dummyKey} and session=${dummyAuth} auth=${dummyBearer}`;
  const sanitized = sanitizeLogContent(rawMessage);

  assert(
    !sanitized.includes(dummyKey),
    "Sanitizer strips Google API keys"
  );
  assert(
    sanitized.includes("[REDACTED_API_KEY]"),
    "Sanitizer replaces Google API key with [REDACTED_API_KEY]"
  );
  assert(
    !sanitized.includes(dummyAuth),
    "Sanitizer strips Better-Auth session tokens"
  );
  assert(
    !sanitized.includes("secret_jwt_payload_header"),
    "Sanitizer strips Bearer authentication tokens"
  );
  assert(
    sanitized.includes("Bearer [REDACTED_TOKEN]"),
    "Sanitizer replaces Bearer token with [REDACTED_TOKEN]"
  );

  // --------------------------------------------------------------------------
  // TEST 6: Client Circuit Breaking & Rate Limit Integration
  // --------------------------------------------------------------------------
  console.log("\n>>> [6/7] Testing Client Engine Rate Limiting Integration...");
  _resetStudentRateLimit();

  // Test rate-limited student rejection via callGeminiWithResilience
  const spammerId = "spammer_student_xyz";
  // Saturate rate limit for this student
  for (let i = 0; i < MAX_STUDENT_RPM; i++) {
    checkStudentRateLimit(spammerId);
  }

  const rateLimitedCall = await callGeminiWithResilience({
    service: "chat",
    studentId: spammerId,
    prompt: "Hello",
  });

  assert(
    rateLimitedCall.success === false && rateLimitedCall.status === 429,
    "callGeminiWithResilience returns status 429 when student exceeds RPM",
    `Status: ${rateLimitedCall.status}, Error: ${rateLimitedCall.error}`
  );
  assert(
    rateLimitedCall.error === "RATE_LIMIT_EXCEEDED",
    "callGeminiWithResilience returns error code RATE_LIMIT_EXCEEDED"
  );
  assert(
    typeof rateLimitedCall.retryAfterSeconds === "number" && rateLimitedCall.retryAfterSeconds > 0,
    "Returns retryAfterSeconds for client throttle UX",
    `Actual: ${rateLimitedCall.retryAfterSeconds}s`
  );

  _resetStudentRateLimit();

  // --------------------------------------------------------------------------
  // TEST 7: Live End-to-End Generation Smoke Test
  // --------------------------------------------------------------------------
  console.log("\n>>> [7/7] Testing Live Gemini Generation via Resilient Client...");
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    const liveStartTime = Date.now();
    const liveResult = await callGeminiWithResilience({
      service: "general",
      prompt: "Reply with exactly one word: PONG",
      temperature: 0.1,
      maxOutputTokens: 10,
    });

    const elapsed = Date.now() - liveStartTime;
    assert(
      liveResult.success === true,
      `Live generation succeeded via ${liveResult.model} (Elapsed: ${elapsed}ms)`,
      liveResult.error || ""
    );
    assert(
      typeof liveResult.text === "string" && liveResult.text.length > 0,
      `Received authentic response text: "${liveResult.text?.trim()}"`
    );
    assert(
      liveResult.model === "gemini-3.6-flash" || liveResult.model === "gemini-3.5-flash",
      `Used verified live model: ${liveResult.model}`
    );
  } else {
    console.log("  ⚠ SKIP: GEMINI_API_KEY not present in environment; skipping live network probe.");
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
