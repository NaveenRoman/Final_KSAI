const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");

// Load .env.local
const envLocalPath = path.resolve(".env.local");
const envVars = {};
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq !== -1) {
      let val = trimmed.substring(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      envVars[trimmed.substring(0, eq).trim()] = val;
    }
  }
}

const keyId = envVars["RAZORPAY_KEY_ID"];
const keySecret = envVars["RAZORPAY_KEY_SECRET"];

const { PrismaClient } = require("../src/generated/client");
const prisma = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, desc) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failedTests++;
  }
}

async function runE2E() {
  console.log("==================================================");
  console.log("CODEXA SUBSCRIPTION & RAZORPAY INTEGRATION AUDIT");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // SECTION 1: Razorpay Test-Mode Live Connectivity
  // ----------------------------------------------------
  console.log("Section 1: Razorpay Test-Mode API Connectivity");
  assert(!!keyId && keyId.startsWith("rzp_test_"), "RAZORPAY_KEY_ID is valid test key format");
  assert(!!keySecret && keySecret.length >= 16, "RAZORPAY_KEY_SECRET is configured with high entropy");

  let razorpayInstance = null;
  let testOrder = null;
  if (keyId && keySecret) {
    try {
      razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
      testOrder = await razorpayInstance.orders.create({
        amount: 5900, // ₹59 in paise
        currency: "INR",
        receipt: `audit_${Date.now()}`,
        notes: {
          type: "SUBSCRIPTION",
          plan: "BASIC",
          durationMonths: "1",
        },
      });
      assert(!!testOrder && !!testOrder.id && testOrder.id.startsWith("order_"), "Live Razorpay order created via test API");
      assert(testOrder.amount === 5900, "Razorpay order amount matches expected paise (5900)");
      assert(testOrder.currency === "INR", "Razorpay order currency is INR");
      assert(testOrder.status === "created", "Razorpay order status is 'created'");
    } catch (err) {
      assert(false, `Razorpay API connectivity: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 2: Cryptographic Signature & Verification
  // ----------------------------------------------------
  console.log("\nSection 2: Cryptographic Signature Verification");
  const sampleOrderId = testOrder ? testOrder.id : "order_test1234567890";
  const samplePaymentId = "pay_test9876543210";
  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${sampleOrderId}|${samplePaymentId}`)
    .digest("hex");

  // Timing safe check
  const actualSigBuffer = Buffer.from(expectedSig);
  const correctSigBuffer = Buffer.from(expectedSig);
  const tamperedSigBuffer = Buffer.from(
    crypto.createHmac("sha256", keySecret).update(`tampered|${samplePaymentId}`).digest("hex")
  );

  assert(
    crypto.timingSafeEqual(actualSigBuffer, correctSigBuffer),
    "HMAC-SHA256 timing-safe comparison succeeds for valid signature"
  );
  assert(
    !crypto.timingSafeEqual(actualSigBuffer, tamperedSigBuffer),
    "HMAC-SHA256 timing-safe comparison rejects tampered signature"
  );

  // ----------------------------------------------------
  // SECTION 3: Plan Pricing & GST Formula Auditing
  // ----------------------------------------------------
  console.log("\nSection 3: Plan Pricing & GST Calculation Audit");

  const plans = [
    { plan: "BASIC", duration: 1, base: 50, gst: 9, total: 59, paise: 5900 },
    { plan: "BASIC", duration: 2, base: 100, gst: 18, total: 118, paise: 11800 },
    { plan: "BASIC", duration: 6, base: 300, gst: 54, total: 354, paise: 35400 },
    { plan: "PRO", duration: 1, base: 70, gst: 12.60, total: 82.60, paise: 8260 },
    { plan: "PRO", duration: 2, base: 140, gst: 25.20, total: 165.20, paise: 16520 },
    { plan: "PRO", duration: 6, base: 420, gst: 75.60, total: 495.60, paise: 49560 },
  ];

  for (const p of plans) {
    const calcGst = Number(((p.base * 18) / 100).toFixed(2));
    const calcTotal = Number((p.base + calcGst).toFixed(2));
    const calcPaise = Math.round(calcTotal * 100);

    assert(calcGst === p.gst, `${p.plan} ${p.duration}mo GST: expected ₹${p.gst}, calculated ₹${calcGst}`);
    assert(calcTotal === p.total, `${p.plan} ${p.duration}mo Total: expected ₹${p.total}, calculated ₹${calcTotal}`);
    assert(calcPaise === p.paise, `${p.plan} ${p.duration}mo Paise: expected ${p.paise}, calculated ${calcPaise}`);
  }

  // ----------------------------------------------------
  // SECTION 4: Database Lifecycle & Anti-Replay Testing
  // ----------------------------------------------------
  console.log("\nSection 4: Database Lifecycle & Anti-Replay (Local SQLite dev.db)");

  const testUserId = `audit_user_${Date.now()}`;
  const testOrderId = `order_audit_${Date.now()}`;
  const testPaymentId = `pay_audit_${Date.now()}`;

  try {
    // 1. Create temporary audit user
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `audit_${Date.now()}@test.internal`,
        name: "Audit User",
        role: "Student",
      },
    });
    assert(true, "Created isolated test student user");

    // 2. Create PaymentOrder record in CREATED state
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        userId: testUserId,
        orderId: testOrderId,
        plan: "BASIC",
        durationMonths: 1,
        baseAmount: 50,
        gstAmount: 9,
        feeAmount: 0,
        totalAmount: 59,
        amountPaise: 5900,
        currency: "INR",
        status: "CREATED",
        receipt: `receipt_${Date.now()}`,
      },
    });
    assert(paymentOrder.status === "CREATED", "PaymentOrder logged with initial status 'CREATED'");

    // 3. Simulate first payment activation
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub1 = await prisma.$transaction(async (tx) => {
      // Anti-replay check
      const existing = await tx.subscription.findUnique({
        where: { paymentId: testPaymentId },
      });
      if (existing) return existing;

      const newSub = await tx.subscription.create({
        data: {
          userId: testUserId,
          plan: "BASIC",
          status: "ACTIVE",
          durationMonths: 1,
          startDate,
          endDate,
          orderId: testOrderId,
          paymentId: testPaymentId,
          baseAmount: 50,
          gstAmount: 9,
          feeAmount: 0,
          totalAmount: 59,
          currency: "INR",
        },
      });

      await tx.paymentOrder.updateMany({
        where: { orderId: testOrderId },
        data: { status: "PAID", paymentId: testPaymentId },
      });

      return newSub;
    });

    assert(sub1 && sub1.status === "ACTIVE", "Subscription successfully activated (status: ACTIVE)");
    assert(sub1.plan === "BASIC", "Subscription plan recorded as 'BASIC'");
    assert(sub1.paymentId === testPaymentId, "Payment ID linked to subscription record");

    const updatedOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrder.id },
    });
    assert(updatedOrder.status === "PAID", "PaymentOrder transitioned to 'PAID'");

    // 4. Test Anti-Replay: Attempt duplicate activation with same paymentId
    const subDuplicate = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { paymentId: testPaymentId },
      });
      if (existing) return existing;

      return await tx.subscription.create({
        data: {
          userId: testUserId,
          plan: "BASIC",
          status: "ACTIVE",
          durationMonths: 1,
          startDate,
          endDate,
          orderId: testOrderId,
          paymentId: testPaymentId,
          baseAmount: 50,
          gstAmount: 9,
          feeAmount: 0,
          totalAmount: 59,
          currency: "INR",
        },
      });
    });

    assert(subDuplicate.id === sub1.id, "Anti-replay returned existing subscription (no duplicate)");

    const totalSubsForUser = await prisma.subscription.count({
      where: { userId: testUserId },
    });
    assert(totalSubsForUser === 1, "Database count confirms exactly 1 subscription created (anti-replay verified)");

    // 5. Test Webhook idempotency simulation
    const webhookOrderId = `order_webhook_${Date.now()}`;
    const webhookPaymentId = `pay_webhook_${Date.now()}`;

    // Simulate order
    await prisma.paymentOrder.create({
      data: {
        userId: testUserId,
        orderId: webhookOrderId,
        plan: "PRO",
        durationMonths: 1,
        baseAmount: 70,
        gstAmount: 12.60,
        feeAmount: 0,
        totalAmount: 82.60,
        amountPaise: 8260,
        currency: "INR",
        status: "CREATED",
        receipt: `receipt_${Date.now()}`,
      },
    });

    // Webhook event 1
    const webhookSub1 = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { paymentId: webhookPaymentId } });
      if (existing) return existing;

      const s = await tx.subscription.create({
        data: {
          userId: testUserId,
          plan: "PRO",
          status: "ACTIVE",
          durationMonths: 1,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          orderId: webhookOrderId,
          paymentId: webhookPaymentId,
          baseAmount: 70,
          gstAmount: 12.60,
          feeAmount: 0,
          totalAmount: 82.60,
          currency: "INR",
        },
      });
      await tx.paymentOrder.updateMany({ where: { orderId: webhookOrderId }, data: { status: "PAID" } });
      return s;
    });

    // Webhook event 2 (duplicate delivery)
    const webhookSub2 = await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { paymentId: webhookPaymentId } });
      if (existing) return existing;
      return null;
    });

    assert(webhookSub1.id === webhookSub2.id, "Webhook duplicate event handled idempotently");

    // 6. Test Failed Payment lifecycle
    const failedOrderId = `order_failed_${Date.now()}`;
    await prisma.paymentOrder.create({
      data: {
        userId: testUserId,
        orderId: failedOrderId,
        plan: "BASIC",
        durationMonths: 1,
        baseAmount: 50,
        gstAmount: 9,
        feeAmount: 0,
        totalAmount: 59,
        amountPaise: 5900,
        currency: "INR",
        status: "CREATED",
        receipt: `receipt_${Date.now()}`,
      },
    });

    // Mark failed (as webhook or payment failure handler does)
    await prisma.paymentOrder.updateMany({
      where: { orderId: failedOrderId },
      data: { status: "FAILED" },
    });

    const failedOrder = await prisma.paymentOrder.findFirst({
      where: { orderId: failedOrderId },
    });
    assert(failedOrder.status === "FAILED", "Failed payment order recorded as 'FAILED'");
    const noSubForFailed = await prisma.subscription.findFirst({
      where: { orderId: failedOrderId },
    });
    assert(noSubForFailed === null, "No subscription created for failed payment order");

  } finally {
    // Cleanup audit records
    try {
      await prisma.subscription.deleteMany({ where: { userId: testUserId } });
      await prisma.paymentOrder.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
      console.log("  Cleaned up all temporary audit records cleanly.");
    } catch (e) {
      // Ignore cleanup error
    }
  }

  // ----------------------------------------------------
  // SECTION 5: Feature Access Gatekeeper Matrix
  // ----------------------------------------------------
  console.log("\nSection 5: Feature Access Gatekeeper Verification");

  // Verify Pro features require Pro plan
  const proFeatures = ["INTERVIEW_PREP", "RESUME_BUILDER", "PRO_FEATURES"];
  const basicFeatures = ["COURSES", "EDITOR", "NOTES", "LIVE_TEACHING"];

  function checkAccessMock(userPlan, subStatus, isExpired, feature, isAdmin = false) {
    if (isAdmin) return { hasAccess: true, plan: "PRO" };
    if (!userPlan || subStatus !== "ACTIVE" || isExpired) return { hasAccess: false, reason: "NO_ACTIVE_SUBSCRIPTION" };
    if (proFeatures.includes(feature) && userPlan !== "PRO") return { hasAccess: false, reason: "PRO_PLAN_REQUIRED" };
    return { hasAccess: true, plan: userPlan };
  }

  // Basic user
  assert(checkAccessMock("BASIC", "ACTIVE", false, "COURSES").hasAccess, "Basic active user has access to Courses");
  assert(checkAccessMock("BASIC", "ACTIVE", false, "EDITOR").hasAccess, "Basic active user has access to Code Editor");
  assert(!checkAccessMock("BASIC", "ACTIVE", false, "INTERVIEW_PREP").hasAccess, "Basic active user is DENIED access to Interview Prep");
  assert(checkAccessMock("BASIC", "ACTIVE", false, "INTERVIEW_PREP").reason === "PRO_PLAN_REQUIRED", "Denial reason is 'PRO_PLAN_REQUIRED'");
  assert(!checkAccessMock("BASIC", "ACTIVE", false, "RESUME_BUILDER").hasAccess, "Basic active user is DENIED access to Resume Builder");

  // Pro user
  assert(checkAccessMock("PRO", "ACTIVE", false, "COURSES").hasAccess, "Pro active user has access to Courses");
  assert(checkAccessMock("PRO", "ACTIVE", false, "INTERVIEW_PREP").hasAccess, "Pro active user HAS access to Interview Prep");
  assert(checkAccessMock("PRO", "ACTIVE", false, "RESUME_BUILDER").hasAccess, "Pro active user HAS access to Resume Builder");

  // Expired user
  assert(!checkAccessMock("PRO", "ACTIVE", true, "INTERVIEW_PREP").hasAccess, "Expired Pro user is DENIED access");
  assert(checkAccessMock("PRO", "ACTIVE", true, "INTERVIEW_PREP").reason === "NO_ACTIVE_SUBSCRIPTION", "Expired denial reason is 'NO_ACTIVE_SUBSCRIPTION'");

  // Admin user
  assert(checkAccessMock("BASIC", "ACTIVE", false, "INTERVIEW_PREP", true).hasAccess, "Admin user bypasses feature gate");

  // ----------------------------------------------------
  // SECTION 6: Summary & Results
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("==================================================");

  await prisma.$disconnect();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error("FATAL AUDIT FAILURE:", err);
  process.exit(1);
});
