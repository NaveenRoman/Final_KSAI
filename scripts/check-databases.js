const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("../src/generated/client");

async function checkDatabases() {
  console.log("=== Checking Database Schema Application ===\n");

  // 1. Check local SQLite dev.db
  console.log("1. Checking SQLite dev.db...");
  const sqlitePrisma = new PrismaClient({
    datasources: { db: { url: "file:./dev.db" } },
  });

  try {
    const subCount = await sqlitePrisma.subscription.count();
    const orderCount = await sqlitePrisma.paymentOrder.count();
    console.log(`  ✅ SQLite dev.db: Subscription table exists (records: ${subCount})`);
    console.log(`  ✅ SQLite dev.db: PaymentOrder table exists (records: ${orderCount})`);
  } catch (err) {
    console.error(`  ❌ SQLite dev.db check failed:`, err.message);
  } finally {
    await sqlitePrisma.$disconnect();
  }

  // 2. Check remote PostgreSQL from .env.local
  console.log("\n2. Checking PostgreSQL database from .env.local...");
  const envLocalPath = path.resolve(".env.local");
  let pgUrl = null;
  let directUrl = null;

  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        pgUrl = trimmed.substring("DATABASE_URL=".length).replace(/["']/g, "").trim();
      } else if (trimmed.startsWith("DIRECT_URL=")) {
        directUrl = trimmed.substring("DIRECT_URL=".length).replace(/["']/g, "").trim();
      }
    }
  }

  if (!pgUrl || !pgUrl.startsWith("postgres")) {
    console.log("  ⚠️ No PostgreSQL DATABASE_URL found in .env.local");
    return;
  }

  // Safely display host and database name without exposing credentials
  try {
    const urlObj = new URL(pgUrl);
    console.log(`  Target PG Host: ${urlObj.hostname}:${urlObj.port || 5432}, Database: ${urlObj.pathname.slice(1)}`);
  } catch (e) {
    console.log("  Target PG URL configured (format valid).");
  }

  // Note: generated client in src/generated/client is compiled for the current provider (sqlite or postgresql)
  // Let's use pg client directly to inspect PostgreSQL information_schema
  try {
    const { Client } = require("pg");
    const client = new Client({ connectionString: directUrl || pgUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log("  Connected to PostgreSQL target database.");

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('Subscription', 'PaymentOrder', 'subscription', 'paymentorder', 'User', 'user')
    `);

    const foundTables = res.rows.map(r => r.table_name);
    console.log("  Found tables in PostgreSQL:", foundTables);

    const hasSub = foundTables.some(t => t.toLowerCase() === "subscription");
    const hasOrder = foundTables.some(t => t.toLowerCase() === "paymentorder");

    if (hasSub && hasOrder) {
      console.log("  ✅ PostgreSQL: Subscription and PaymentOrder tables are present!");
    } else {
      console.log(`  ⚠️ PostgreSQL: Tables status: Subscription=${hasSub ? "YES" : "MISSING"}, PaymentOrder=${hasOrder ? "YES" : "MISSING"}`);
      console.log("     Prisma schema for PostgreSQL (prisma/schema.postgresql.prisma) has NOT been applied to production database yet.");
      console.log("     A confirmed migration / db push will be needed when ready to deploy.");
    }

    await client.end();
  } catch (err) {
    console.log(`  ℹ️ PostgreSQL direct query note: ${err.message}`);
    console.log("     (If pg package is not installed or network is isolated, inspect schemas manually).");
  }
}

checkDatabases();
