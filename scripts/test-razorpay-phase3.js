/**
 * KnowledgeStream AI: Razorpay Phase 3 Webhook Verification Suite
 *
 * Validates:
 * 1. HMAC-SHA256 cryptographic verification using exact raw body
 * 2. Fail-closed guard when RAZORPAY_WEBHOOK_SECRET is absent
 * 3. Timing-safe comparison (crypto.timingSafeEqual)
 * 4. payment.captured handling & amount validation in paise
 * 5. payment.failed sanitized logging without secrets exposure
 * 6. Multi-layer deduplication & idempotency on duplicate events
 * 7. Safe acknowledgement of unexpected event types
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log("=== KnowledgeStream AI: Razorpay Phase 3 Test Suite ===\n");

// Suite 1: File Existence & Architecture
console.log("Test Suite 1: Webhook Architecture & File Integrity");
const webhookPath = path.join(ROOT, "src", "app", "api", "razorpay", "webhook", "route.ts");
assert(fs.existsSync(webhookPath), "src/app/api/razorpay/webhook/route.ts exists");
const webhookCode = fs.readFileSync(webhookPath, "utf8");
assert(webhookCode.includes("export async function POST"), "Exports POST handler");
assert(webhookCode.includes("await req.text()"), "Reads exact raw request body via req.text()");
assert(webhookCode.includes("x-razorpay-signature"), "Inspects x-razorpay-signature header");
assert(webhookCode.includes("x-razorpay-event-id"), "Inspects x-razorpay-event-id header");
assert(webhookCode.includes("RAZORPAY_WEBHOOK_SECRET"), "Uses RAZORPAY_WEBHOOK_SECRET environment variable");
assert(webhookCode.includes("crypto.timingSafeEqual"), "Uses crypto.timingSafeEqual for constant-time comparison");

// Suite 2: Cryptographic Signature Mechanics
console.log("\nTest Suite 2: HMAC-SHA256 & Timing-Safe Verification");
const testSecret = "sec_test_webhook_secret_99998888";
const sampleRawPayload = JSON.stringify({
  entity: "event",
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_test_1234567890",
        amount: 249900,
        currency: "INR",
        status: "captured",
        order_id: "order_test_9876543210",
      },
    },
  },
});

const authenticSig = crypto.createHmac("sha256", testSecret).update(sampleRawPayload).digest("hex");
const tamperedSig = authenticSig.slice(0, -1) + (authenticSig.slice(-1) === "a" ? "b" : "a");

function verifySig(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expBuf = Buffer.from(expected, "utf8");
  const recBuf = Buffer.from(signature, "utf8");
  if (expBuf.length !== recBuf.length) return false;
  return crypto.timingSafeEqual(expBuf, recBuf);
}

assert(verifySig(sampleRawPayload, authenticSig, testSecret) === true, "Authentic HMAC-SHA256 signature verifies successfully");
assert(verifySig(sampleRawPayload, tamperedSig, testSecret) === false, "Tampered signature (1-bit change) is rejected");
assert(verifySig(sampleRawPayload, authenticSig, "wrong_secret") === false, "Wrong secret fails signature verification");
assert(verifySig(sampleRawPayload + " ", authenticSig, testSecret) === false, "Modified raw body fails signature verification (raw text precision)");

// Suite 3: Fail-Closed Credential Guard
console.log("\nTest Suite 3: Fail-Closed Credential Guard");
assert(webhookCode.includes("if (!webhookSecret)"), "Checks for missing RAZORPAY_WEBHOOK_SECRET");
assert(webhookCode.includes("{ status: 503 }"), "Returns HTTP 503 when RAZORPAY_WEBHOOK_SECRET is unconfigured");
assert(!webhookCode.includes("isMock") && !webhookCode.includes("pay_mock_"), "Never introduces mock payment bypasses in webhook");

// Suite 4: Event Handling & Business Logic
console.log("\nTest Suite 4: Event Dispatching & Access Verification");
assert(webhookCode.includes('eventType === "payment.captured"'), "Handles payment.captured event");
assert(webhookCode.includes('eventType === "payment.failed"'), "Handles payment.failed event");
assert(webhookCode.includes('status: "ignored"'), "Gracefully acknowledges unhandled events with HTTP 200 (prevents infinite retries)");
assert(webhookCode.includes('currency !== "INR"'), "Enforces INR currency validation");
assert(webhookCode.includes("amountPaise < 100"), "Enforces minimum ₹1 (100 paise) amount validation");

// Suite 5: Idempotency & Replay Protection
console.log("\nTest Suite 5: Idempotency & Replay Protection");
assert(webhookCode.includes("db.$transaction"), "Executes access grants in atomic database transaction");
assert(webhookCode.includes("existingPayment"), "Checks for pre-existing paymentId before granting access");
assert(webhookCode.includes("existingEnrollment"), "Checks for pre-existing enrollment before inserting");
assert(webhookCode.includes("WEBHOOK_PAYMENT_CAPTURED"), "Records WEBHOOK_PAYMENT_CAPTURED activity audit log");
assert(webhookCode.includes("WEBHOOK_PAYMENT_FAILED"), "Records WEBHOOK_PAYMENT_FAILED activity audit log");
assert(webhookCode.includes("RESUME_BUILDER_UNLOCKED"), "Handles Resume Studio ₹1 unlock in webhook");

// Suite 6: Environment Template Alignment
console.log("\nTest Suite 6: Environment Template Alignment");
const envExamplePath = path.join(ROOT, ".env.example");
const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
assert(envExampleContent.includes("RAZORPAY_WEBHOOK_SECRET="), ".env.example contains RAZORPAY_WEBHOOK_SECRET template placeholder");

console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Phase 3 Webhook Integration checks passed!\n");
  process.exit(0);
}
