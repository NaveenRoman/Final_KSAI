const fs = require("fs");
const path = require("path");

console.log("=== PHASE 1: INFRASTRUCTURE INVENTORY AUDIT ===\n");

// 1. FRONTEND / VERCEL
console.log("--- 1. Frontend & Vercel Configuration ---");
if (fs.existsSync("vercel.json")) {
  console.log("vercel.json:", fs.readFileSync("vercel.json", "utf8").trim());
} else {
  console.log("vercel.json: missing");
}

if (fs.existsSync("next.config.ts")) {
  console.log("next.config.ts present.");
}

// 2. DATABASE & POOLING
console.log("\n--- 2. Database & Neon PostgreSQL ---");
if (fs.existsSync("prisma/schema.postgresql.prisma")) {
  const schema = fs.readFileSync("prisma/schema.postgresql.prisma", "utf8");
  const datasourceMatch = schema.match(/datasource\s+db\s+\{[\s\S]*?\}/);
  if (datasourceMatch) console.log("Postgres datasource:\n" + datasourceMatch[0]);
}

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
for (const line of envLocal.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("DATABASE_URL=") || trimmed.startsWith("DIRECT_URL=")) {
    const eqIdx = trimmed.indexOf("=");
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1).replace(/["']/g, "").trim();
    try {
      const u = new URL(val);
      console.log(`${key}: protocol=${u.protocol}, host=${u.hostname}, port=${u.port || 5432}, db=${u.pathname.slice(1)}, queryParams=${u.search}`);
    } catch (e) {
      console.log(`${key}: unparseable URL`);
    }
  }
}

// 3. AI SERVICES INVENTORY
console.log("\n--- 3. AI Services & Models Inventory ---");
const aiServices = [];
function scanForAi(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !["node_modules", ".git", ".next"].includes(item.name)) {
      scanForAi(full);
    } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".js") || item.name.endsWith(".py"))) {
      const content = fs.readFileSync(full, "utf8");
      const models = [];
      // Google Generative AI / Gemini
      const geminiMatch = content.match(/gemini-[a-zA-Z0-9.-]+/g);
      if (geminiMatch) models.push(...geminiMatch);
      // OpenAI
      const openaiMatch = content.match(/gpt-[a-zA-Z0-9.-]+/g);
      if (openaiMatch) models.push(...openaiMatch);
      // Groq / Ollama / Qwen
      const qwenMatch = content.match(/qwen[a-zA-Z0-9.:_-]*/gi);
      if (qwenMatch) models.push(...qwenMatch);
      const llamaMatch = content.match(/llama[a-zA-Z0-9.:_-]*/gi);
      if (llamaMatch) models.push(...llamaMatch);

      if (models.length > 0 || content.includes("@google/generative-ai") || content.includes("openai") || content.includes("GROQ")) {
        aiServices.push({ file: full, models: [...new Set(models)], hasGemini: content.includes("@google/generative-ai") || content.includes("GEMINI"), hasOpenAI: content.includes("OpenAI") || content.includes("OPENAI"), hasGroq: content.includes("GROQ") });
      }
    }
  }
}

scanForAi("src");
scanForAi("backend");

console.log(`Found ${aiServices.length} files referencing AI services.`);
const uniqueModels = new Set();
aiServices.forEach(s => {
  s.models.forEach(m => uniqueModels.add(m));
});
console.log("Distinct AI Models detected in codebase:", Array.from(uniqueModels));
console.log("\nSample AI route files:");
aiServices.slice(0, 15).forEach(s => {
  console.log(` - ${s.file} (models: ${s.models.join(", ") || "SDK configured via env"})`);
});

// 4. EMAIL SERVICE
console.log("\n--- 4. Email Service ---");
const envContent = (fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "") + "\n" + envLocal;
const emailKeys = envContent.split("\n").filter(l => l.includes("RESEND") || l.includes("SMTP") || l.includes("MAIL")).map(l => l.split("=")[0].trim());
console.log("Configured email keys:", [...new Set(emailKeys)]);

// 5. STORAGE SERVICE
console.log("\n--- 5. Storage / Media ---");
const storageKeys = envContent.split("\n").filter(l => l.includes("S3") || l.includes("BLOB") || l.includes("UPLOAD") || l.includes("CLOUDINARY")).map(l => l.split("=")[0].trim());
console.log("Configured storage keys:", [...new Set(storageKeys)]);

// 6. BACKEND SPECIFICATIONS FROM DEPLOY SCRIPTS
console.log("\n--- 6. Backend Deployment Specs ---");
if (fs.existsSync("deploy/codexa-backend.service")) {
  console.log("Backend Service:", fs.readFileSync("deploy/codexa-backend.service", "utf8").trim());
}
if (fs.existsSync("deploy/codexa-broker.service")) {
  console.log("Broker Service:", fs.readFileSync("deploy/codexa-broker.service", "utf8").trim());
}
