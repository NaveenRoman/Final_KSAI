/**
 * KnowledgeStream AI: Razorpay Phase 2 Verification Suite
 */

const fs = require("fs");
const path = require("path");

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

console.log("=== KnowledgeStream AI: Razorpay Phase 2 Test Suite ===\n");

// Suite 1: Utility Module
console.log("Test Suite 1: Centralized Utility Module (src/lib/razorpay-checkout.ts)");
const utilityPath = path.join(ROOT, "src", "lib", "razorpay-checkout.ts");
assert(fs.existsSync(utilityPath), "razorpay-checkout.ts exists");
const utilityCode = fs.readFileSync(utilityPath, "utf8");
assert(utilityCode.includes("export async function openRazorpayCheckout"), "Exports openRazorpayCheckout function");
assert(utilityCode.includes("export function loadRazorpayScript"), "Exports loadRazorpayScript function");
assert(utilityCode.includes("https://checkout.razorpay.com/v1/checkout.js"), "Loads official Razorpay Checkout.js script");
assert(utilityCode.includes("isCheckoutActive"), "Includes concurrency lock to prevent duplicate clicks");
assert(utilityCode.includes("/api/create-order") || utilityCode.includes("/api/razorpay/create-order"), "Calls secure server-side order creation");
assert(utilityCode.includes("/api/verify-payment") || utilityCode.includes("/api/razorpay/verify-payment"), "Calls secure server-side payment verification");
assert(utilityCode.includes("razorpay_payment_id") && utilityCode.includes("razorpay_order_id") && utilityCode.includes("razorpay_signature"), "Transmits all 3 cryptographic verification fields");
assert(utilityCode.includes("payment.failed"), "Handles payment.failed event");
assert(utilityCode.includes("ondismiss"), "Handles modal.ondismiss event");

// Suite 2: Caller Migrations
console.log("\nTest Suite 2: All 10 Callers Migrated to Centralized Checkout");
const callers = [
  { name: "CourseDetailsModal", file: "src/components/courses/CourseDetailsModal.tsx" },
  { name: "Course Catalog", file: "src/app/courses/catalog/page.tsx" },
  { name: "Java Chapter Page", file: "src/app/courses/java/chapter/[id]/page.tsx" },
  { name: "Python Chapter Page", file: "src/app/courses/python/chapter/[id]/page.tsx" },
  { name: "Python Curriculum Page", file: "src/app/courses/python/curriculum/page.tsx" },
  { name: "Dynamic [courseSlug] Chapter Page", file: "src/app/courses/[courseSlug]/chapter/[id]/page.tsx" },
  { name: "Dynamic [courseSlug] Curriculum Page", file: "src/app/courses/[courseSlug]/curriculum/page.tsx" },
  { name: "C Curriculum Page", file: "src/app/courses/c/curriculum/page.tsx" },
  { name: "C++ Curriculum Page", file: "src/app/courses/cpp/curriculum/page.tsx" },
  { name: "Resume Builder", file: "src/app/resume-builder/page.tsx" },
];

for (const caller of callers) {
  const filePath = path.join(ROOT, caller.file);
  const exists = fs.existsSync(filePath);
  assert(exists, `${caller.name} file exists (${caller.file})`);
  if (!exists) continue;

  const content = fs.readFileSync(filePath, "utf8");
  assert(
    content.includes("openRazorpayCheckout"),
    `${caller.name} imports and uses openRazorpayCheckout`
  );
  assert(
    !content.includes("pay_mock_"),
    `${caller.name} does not generate mock payment IDs (pay_mock_)`
  );
  assert(
    !content.includes("Simulating Razorpay Payment Gateway"),
    `${caller.name} does not contain simulated Razorpay payment alert bypasses`
  );
}

// Suite 3: Backend Security & Verification Endpoint
console.log("\nTest Suite 3: Backend Verification & Resume Builder Support");
const verifyPath = path.join(ROOT, "src", "app", "api", "razorpay", "verify-payment", "route.ts");
assert(fs.existsSync(verifyPath), "verify-payment route exists");
const verifyContent = fs.readFileSync(verifyPath, "utf8");
assert(verifyContent.includes("RESUME_BUILDER_UNLOCKED"), "Verify endpoint tracks RESUME_BUILDER_UNLOCKED");
assert(verifyContent.includes("PAYMENT_REPLAY"), "Anti-replay protection enforced on all payments");
assert(verifyContent.includes("timingSafeEqual"), "Cryptographic timingSafeEqual verification enforced");

console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Phase 2 centralized frontend checkout checks passed!\n");
  process.exit(0);
}
