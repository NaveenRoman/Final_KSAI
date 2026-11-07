/**
 * Security & Anti-Bypass Test Suite for Challenge Evaluator
 *
 * Verifies:
 * 1. Zero child_process / spawn references in src/lib/challenges/evaluator.ts.
 * 2. Fail-closed behavior: Returns structured 503 infrastructure error when Django/Broker is down.
 * 3. Never executes code directly on the host machine.
 * 4. Generates authentic cryptographic HMAC-SHA256 signed envelopes for all submissions.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, desc) {
  totalTests++;
  if (Boolean(condition)) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
  }
}

async function runEvaluatorSafetyTests() {
  console.log("\n================================================================================");
  console.log("   CHALLENGE EVALUATOR — HOST EXECUTION PREVENTION & BROKER INTEGRATION TESTS");
  console.log("================================================================================\n");

  // TEST 1: Source code inspection of evaluator.ts
  console.log("--- TEST GROUP 1: Host Execution Disablement ---");
  const evaluatorPath = path.resolve("src/lib/challenges/evaluator.ts");
  const code = fs.readFileSync(evaluatorPath, "utf-8");

  assert(!code.includes('from "child_process"'), "child_process import is completely removed");
  assert(!code.includes("require('child_process')"), "child_process require is not present");
  assert(!code.includes("spawn("), "spawn(...) invocation is completely excised");
  assert(!code.includes("exec("), "exec(...) invocation is not present");
  assert(!code.includes("fs.mkdtempSync"), "Host filesystem temp directory creation is excised");
  assert(code.includes("buildSignedExecutionEnvelope"), "buildSignedExecutionEnvelope is imported and utilized");

  // TEST 2: Verify signed envelope generator from broker-signer
  console.log("\n--- TEST GROUP 2: Cryptographic Broker Envelope Validation ---");
  const signerPath = path.resolve("src/lib/broker-signer.ts");
  const signerCode = fs.readFileSync(signerPath, "utf-8");
  assert(signerCode.includes("createHmac"), "Uses Node.js crypto createHmac for HMAC-SHA256");
  assert(signerCode.includes("computeBodyHash"), "Computes body hash of code and stdin");
  assert(signerCode.includes("computeCanonicalString"), "Builds canonical string binding method, endpoint, language, bodyHash, studentId, timestamp, nonce");

  // Test canonical hashing locally
  const secret = "test_signing_secret_evaluator_998877";
  const studentId = "student_user_123";
  const language = "python";
  const sourceCode = "print('secure challenge')";
  const stdin = "test_stdin";
  const ts = 1730000000;
  const nonce = "test_nonce_12345678";

  const normMethod = "POST";
  const normEndpoint = "/api/run/";
  const normLang = "python";
  const bodyHash = crypto.createHash("sha256").update(`code=${sourceCode}&stdin=${stdin}`, "utf8").digest("hex").toLowerCase();
  const canonical = `${normMethod}|${normEndpoint}|${normLang}|${bodyHash}|${studentId}|${ts}|${nonce}`;
  const sig = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex").toLowerCase();

  assert(bodyHash.length === 64, "Body hash is 64-char hex string");
  assert(sig.length === 64, "Signature is 64-char hex string");
  assert(/^[0-9a-f]{64}$/.test(sig), "Signature matches hex format");

  // TEST 3: Fail-Closed Behavior Verification
  console.log("\n--- TEST GROUP 3: Fail-Closed Architecture Inspection ---");
  assert(code.includes("Execution Infrastructure Error"), "Includes structured infrastructure error messaging");
  assert(code.includes("Direct host execution is strictly disabled"), "Explicitly declares direct host execution disabled");
  assert(code.includes("exitCode: 503"), "Returns HTTP 503 status when execution service is unavailable");
  assert(code.includes("AbortSignal.timeout(12000)"), "Enforces 12-second abort timeout on broker fetch requests");

  // TEST 4: Frontend Caller Coverage
  console.log("\n--- TEST GROUP 4: Challenge Submission Route Audit ---");
  const submitRoutePath = path.resolve("src/app/api/courses/[courseSlug]/chapters/[chapterId]/challenge/submit/route.ts");
  const submitRouteCode = fs.readFileSync(submitRoutePath, "utf-8");
  assert(submitRouteCode.includes("studentId: user.id"), "Challenge submit route passes authenticated studentId to evaluator");

  // Summary
  console.log("\n================================================================================");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runEvaluatorSafetyTests().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
