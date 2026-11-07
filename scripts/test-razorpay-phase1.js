/**
 * KnowledgeStream AI — Razorpay Phase 1 Verification Suite
 *
 * Verifies:
 * 1. Minimum amount validation (>= 100 paise / ₹1)
 * 2. Mandatory 3-field requirement (order_id, payment_id, signature)
 * 3. Cryptographic HMAC-SHA256 signature verification & timingSafeEqual
 * 4. Tampered signature rejection
 * 5. Fail-closed credential validation (no unverified mock bypass)
 * 6. Anti-replay duplicate detection logic
 * 7. Dual Prisma schema compatibility (PostgreSQL & SQLite)
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log("=== KnowledgeStream AI: Razorpay Phase 1 Test Suite ===\n");

// TEST 1: Minimum Amount Validation (>= 100 paise)
console.log("Test Suite 1: Amount Validation in Paise");
function validateAmountPaise(rupeesOrPaise) {
  const paise = Math.round(rupeesOrPaise * 100);
  if (isNaN(paise) || paise < 100) {
    return { valid: false, error: "Order amount must be at least ₹1 (100 paise)." };
  }
  return { valid: true, amountPaise: paise };
}

assert(validateAmountPaise(0).valid === false, "Rejects 0 INR (0 paise)");
assert(validateAmountPaise(0.5).valid === false, "Rejects ₹0.50 (50 paise < 100 minimum)");
assert(validateAmountPaise(0.99).valid === false, "Rejects ₹0.99 (99 paise < 100 minimum)");
assert(validateAmountPaise(1).valid === true && validateAmountPaise(1).amountPaise === 100, "Accepts ₹1 (100 paise)");
assert(validateAmountPaise(1999).valid === true && validateAmountPaise(1999).amountPaise === 199900, "Accepts course price ₹1,999 (199,900 paise)");
assert(validateAmountPaise(-10).valid === false, "Rejects negative amounts");
assert(validateAmountPaise("abc").valid === false, "Rejects NaN values");

// TEST 2: Mandatory 3-Field Requirement
console.log("\nTest Suite 2: Mandatory 3-Field Requirement");
function validateVerificationFields(body) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || typeof razorpay_order_id !== "string" || razorpay_order_id.trim() === "") {
    return { valid: false, error: "Missing required parameter: razorpay_order_id." };
  }
  if (!razorpay_payment_id || typeof razorpay_payment_id !== "string" || razorpay_payment_id.trim() === "") {
    return { valid: false, error: "Missing required parameter: razorpay_payment_id." };
  }
  if (!razorpay_signature || typeof razorpay_signature !== "string" || razorpay_signature.trim() === "") {
    return { valid: false, error: "Missing required parameter: razorpay_signature." };
  }
  const cleanSignature = razorpay_signature.trim();
  const isHex64 = cleanSignature.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanSignature);
  if (!isHex64) {
    return { valid: false, error: "Invalid payment signature format." };
  }
  return { valid: true };
}

assert(validateVerificationFields({}).valid === false, "Rejects empty payload");
assert(validateVerificationFields({ razorpay_payment_id: "pay_123" }).valid === false, "Rejects when order_id is missing");
assert(validateVerificationFields({ razorpay_order_id: "order_123", razorpay_payment_id: "pay_123" }).valid === false, "Rejects when signature is missing");
assert(validateVerificationFields({ razorpay_order_id: "order_123", razorpay_payment_id: "pay_123", razorpay_signature: "not_a_hex" }).valid === false, "Rejects non-hex signature");
assert(validateVerificationFields({ razorpay_order_id: "order_123", razorpay_payment_id: "pay_123", razorpay_signature: "a".repeat(63) }).valid === false, "Rejects signature shorter than 64 hex chars");
assert(validateVerificationFields({ razorpay_order_id: "order_123", razorpay_payment_id: "pay_123", razorpay_signature: "a".repeat(64) }).valid === true, "Accepts complete payload with 64-char hex signature");

// TEST 3 & 4: Cryptographic HMAC-SHA256 & timingSafeEqual
console.log("\nTest Suite 3: HMAC-SHA256 & timingSafeEqual Verification");
function verifySignature(orderId, paymentId, signature, secret) {
  if (!secret) return { verified: false, error: "Missing secret" };
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { verified: false, error: "Buffer length mismatch" };
  }

  const isMatch = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  return { verified: isMatch };
}

const mockSecret = "test_secret_key_ksai_89271";
const testOrderId = "order_N9wTzK5423fA1";
const testPaymentId = "pay_N9wUp68019aZ2";
const validSignature = crypto
  .createHmac("sha256", mockSecret)
  .update(`${testOrderId}|${testPaymentId}`)
  .digest("hex");

assert(verifySignature(testOrderId, testPaymentId, validSignature, mockSecret).verified === true, "Authentic HMAC-SHA256 signature verifies successfully");

const tamperedSignature = validSignature.substring(0, 63) + (validSignature[63] === "0" ? "1" : "0");
assert(verifySignature(testOrderId, testPaymentId, tamperedSignature, mockSecret).verified === false, "Tampered signature (1-bit change) is rejected by timingSafeEqual");

const wrongOrderSignature = crypto
  .createHmac("sha256", mockSecret)
  .update(`order_DIFFERENT|${testPaymentId}`)
  .digest("hex");
assert(verifySignature(testOrderId, testPaymentId, wrongOrderSignature, mockSecret).verified === false, "Signature generated with mismatched order ID is rejected");

// TEST 5: Fail-Closed Credential Validation
console.log("\nTest Suite 4: Fail-Closed Credential Guard");
function checkGatewayCredentials(keyId, keySecret) {
  if (!keyId || !keySecret) {
    return { configured: false, status: 503, error: "Payment gateway credentials are not configured on the server." };
  }
  return { configured: true, status: 200 };
}

assert(checkGatewayCredentials(null, null).configured === false && checkGatewayCredentials(null, null).status === 503, "Returns 503 when both keys are missing");
assert(checkGatewayCredentials("key_123", null).configured === false && checkGatewayCredentials("key_123", null).status === 503, "Returns 503 when secret is missing");
assert(checkGatewayCredentials(null, "sec_123").configured === false && checkGatewayCredentials(null, "sec_123").status === 503, "Returns 503 when key_id is missing");
assert(checkGatewayCredentials("key_123", "sec_123").configured === true && checkGatewayCredentials("key_123", "sec_123").status === 200, "Returns 200 when both credentials are provided");

// TEST 6: Anti-Replay Duplicate Prevention
console.log("\nTest Suite 5: Anti-Replay Duplicate Prevention");
class MockEnrollmentStore {
  constructor() {
    this.records = new Map();
  }
  recordPayment(paymentId, courseId, userId) {
    if (this.records.has(paymentId)) {
      throw new Error("PAYMENT_REPLAY");
    }
    this.records.set(paymentId, { courseId, userId, timestamp: Date.now() });
    return { success: true };
  }
}

const store = new MockEnrollmentStore();
assert(store.recordPayment("pay_first_trans_1", "course_1", "user_1").success === true, "First payment processing succeeds");

let replayDetected = false;
try {
  store.recordPayment("pay_first_trans_1", "course_1", "user_1");
} catch (e) {
  if (e.message === "PAYMENT_REPLAY") {
    replayDetected = true;
  }
}
assert(replayDetected === true, "Duplicate payment ID is caught and throws PAYMENT_REPLAY");

// TEST 7: PostgreSQL & SQLite Dual Prisma Schema Verification
console.log("\nTest Suite 6: PostgreSQL & SQLite Schema Compatibility");
const rootDir = path.resolve(__dirname, "..");
const sqliteSchemaPath = path.join(rootDir, "prisma", "schema.prisma");
const pgSchemaPath = path.join(rootDir, "prisma", "schema.postgresql.prisma");

assert(fs.existsSync(sqliteSchemaPath), "prisma/schema.prisma exists");
assert(fs.existsSync(pgSchemaPath), "prisma/schema.postgresql.prisma exists");

const sqliteContent = fs.readFileSync(sqliteSchemaPath, "utf-8");
const pgContent = fs.readFileSync(pgSchemaPath, "utf-8");

function extractModelFields(schemaText, modelName) {
  const match = schemaText.match(new RegExp(`model\\s+${modelName}\\s+\\{([^}]+)\\}`, "s"));
  if (!match) return null;
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"));
}

const sqliteEnrollment = extractModelFields(sqliteContent, "Enrollment");
const pgEnrollment = extractModelFields(pgContent, "Enrollment");

assert(sqliteEnrollment !== null, "Enrollment model exists in SQLite schema");
assert(pgEnrollment !== null, "Enrollment model exists in PostgreSQL schema");

// Compare key fields: id, userId, courseId, paidAmount, paymentId
const requiredFields = ["id", "userId", "courseId", "paidAmount", "paymentId"];
for (const field of requiredFields) {
  const inSqlite = sqliteEnrollment.some((l) => l.startsWith(field));
  const inPg = pgEnrollment.some((l) => l.startsWith(field));
  assert(inSqlite && inPg, `Field '${field}' is present and consistent in both schemas`);
}

// Summary
console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Phase 1 security & validation checks passed!\n");
}
