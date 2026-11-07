/**
 * Codexa AI Production Configuration
 * Centralized model IDs, quota limits, timeouts, and backoff settings.
 */

// ============================================================================
// 1. Verified Live Gemini Models
// ============================================================================
// Live empirical tests confirmed gemini-3.6-flash and gemini-3.5-flash return 200 OK.
// gemini-1.5-flash and gemini-2.5-flash return 404 ("no longer available to new users").
export const GEMINI_PRIMARY_MODEL = "gemini-3.6-flash";
export const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
] as const;

export const GEMINI_LITE_MODEL = "gemini-3.1-flash-lite";

// ============================================================================
// 2. Rate Limiting & Concurrency Ceilings
// ============================================================================
// Maximum requests per minute per authenticated student
export const MAX_STUDENT_RPM = 20;

// Maximum requests per minute for unauthenticated guests
export const MAX_GUEST_RPM = 5;

// Maximum concurrent in-flight requests across the entire application instance (when distributed Redis is active)
// Protects the shared GEMINI_API_KEY from exhausting Google Cloud project quotas
export const MAX_GLOBAL_CONCURRENT_GEMINI_CALLS = 12;

// Max queue wait time (ms) to acquire a concurrency slot before dropping to fallback
export const CONCURRENCY_QUEUE_TIMEOUT_MS = 1500;

// ============================================================================
// 3. Timeouts (Per-Request Ceilings)
// ============================================================================
export const AI_TIMEOUTS = {
  TEACH: 6000,          // 6.0s for lesson generation / evaluation
  CHAT: 8000,           // 8.0s for interactive mentor chat
  GUIDE: 8000,          // 8.0s for compiler diagnostics & debugging
  INTERVIEW: 8000,      // 8.0s for interview answer evaluation
  RESUME_JD: 10000,     // 10.0s for PDF & ATS JD alignment analysis
  RESUME_BULLET: 6000,  // 6.0s for single bullet / summary enhancement
  DICTATE_CHECK: 4000,  // 4.0s for code syntax verification
  DEFAULT: 8000,        // 8.0s fallback default
} as const;

// ============================================================================
// 4. Retry & Backoff Configuration
// ============================================================================
export const BASE_RETRY_DELAY_MS = 500;
export const MAX_RETRY_DELAY_MS = 3000;
export const MAX_JITTER_MS = 250;
export const MAX_RETRIES_PER_MODEL = 1; // 1 retry per model, then next model
export const MAX_TOTAL_MODEL_ATTEMPTS = 2; // Never try more than 2 distinct models per student request

// HTTP status codes that qualify for transient retry with backoff
export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

// ============================================================================
// 5. Distributed Limiter (Upstash Redis REST) Settings
// ============================================================================
export const REDIS_REST_TIMEOUT_MS = 300; // Fast 300ms fail-open timeout
// 45s lease TTL ensures tokenized leases outlive the worst-case 21s request + retry duration
export const DISTRIBUTED_CONCURRENCY_TTL_SECONDS = 45; 
export const REDIS_KEY_PREFIX = "ksai:ai:";

// ============================================================================
// 6. Conservative Local Fallback Limits (When Redis Is Missing or Offline)
// ============================================================================
// When distributed coordination is unavailable, multiple horizontal Vercel
// Lambdas run independently. To prevent multi-instance concurrency multiplication
// from exhausting Google Cloud project quotas, each container runs a conservative ceiling.
export const LOCAL_FALLBACK_CONCURRENCY_LIMIT = 2; // Max 2 concurrent calls per Lambda instance
export const LOCAL_FALLBACK_STUDENT_RPM = 10;        // Max 10 RPM per student in fallback mode
export const LOCAL_FALLBACK_GUEST_RPM = 3;          // Max 3 RPM for guests in fallback mode


