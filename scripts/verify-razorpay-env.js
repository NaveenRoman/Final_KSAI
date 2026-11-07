const fs = require("fs");
const path = require("path");

console.log("=== Razorpay Environment Variable Safety Audit ===\n");

const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) {
  console.error("FAIL: .env.local does not exist.");
  process.exit(1);
}

// Read lines without printing values
const content = fs.readFileSync(envPath, "utf8");
const envVars = {};
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  let val = trimmed.substring(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.substring(1, val.length - 1);
  }
  envVars[key] = val;
}

const keyId = envVars["RAZORPAY_KEY_ID"];
const pubKeyId = envVars["NEXT_PUBLIC_RAZORPAY_KEY_ID"];
const secret = envVars["RAZORPAY_KEY_SECRET"];

let allPassed = true;

function check(desc, pass) {
  if (pass) {
    console.log(`  ✅ PASS: ${desc}`);
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    allPassed = false;
  }
}

// 1. Presence
check("RAZORPAY_KEY_ID is defined and non-empty", !!keyId && keyId.length > 0);
check("NEXT_PUBLIC_RAZORPAY_KEY_ID is defined and non-empty", !!pubKeyId && pubKeyId.length > 0);
check("RAZORPAY_KEY_SECRET is defined and non-empty", !!secret && secret.length > 0);

// 2. Format
check("RAZORPAY_KEY_ID starts with 'rzp_test_'", keyId && keyId.startsWith("rzp_test_"));
check("NEXT_PUBLIC_RAZORPAY_KEY_ID starts with 'rzp_test_'", pubKeyId && pubKeyId.startsWith("rzp_test_"));
check("RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID are identical", keyId === pubKeyId);
check("RAZORPAY_KEY_SECRET has sufficient entropy (length >= 16)", secret && secret.length >= 16);

// 3. Security Checks (No secret leakage)
check("RAZORPAY_KEY_SECRET does NOT start with 'NEXT_PUBLIC_'", !Object.keys(envVars).some(k => k.includes("NEXT_PUBLIC") && k.includes("SECRET")));
check(".env.local is ignored in .gitignore", fs.readFileSync(".gitignore", "utf8").includes(".env.local"));

// 4. Client Bundle Audit (Ensure secret is never imported in client code)
const clientFiles = [
  "src/lib/razorpay-checkout.ts",
  "src/components/courses/CourseDetailsModal.tsx",
  "src/app/courses/catalog/page.tsx",
  "src/app/resume-builder/page.tsx"
];

let leakDetected = false;
for (const file of clientFiles) {
  const p = path.resolve(file);
  if (fs.existsSync(p)) {
    const src = fs.readFileSync(p, "utf8");
    if (src.includes("RAZORPAY_KEY_SECRET")) {
      leakDetected = true;
      console.error(`  ❌ SECURITY LEAK: RAZORPAY_KEY_SECRET referenced in ${file}`);
    }
  }
}
check("Zero client files reference RAZORPAY_KEY_SECRET", !leakDetected);

// 5. Existing Environment Variables Preserved
check("DATABASE_URL is preserved", !!envVars["DATABASE_URL"] && envVars["DATABASE_URL"].length > 0);
check("DIRECT_URL is preserved", !!envVars["DIRECT_URL"] && envVars["DIRECT_URL"].length > 0);

console.log("\n==================================================");
if (allPassed) {
  console.log("🎉 All Razorpay credential checks passed securely!\n");
} else {
  console.error("❌ Some checks failed. Please review above.\n");
  process.exit(1);
}
