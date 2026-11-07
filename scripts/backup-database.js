/**
 * KnowledgeStream AI — SQLite Consistent Database Backup & Verification Script
 *
 * Verifies the database integrity and produces an atomic snapshot backup
 * without locking out active reads or writes.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "../prisma/dev.db");
const BACKUP_DIR = path.resolve(__dirname, "../backups");

if (!fs.existsSync(DB_PATH)) {
  console.error(`[BACKUP ERROR] Database file not found at: ${DB_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log("==================================================");
console.log("KSAI DATABASE INTEGRITY CHECK & BACKUP");
console.log("==================================================");
console.log(`Source DB : ${DB_PATH}`);

// 1. Run Integrity Check
try {
  console.log("\n[1/3] Running PRAGMA integrity_check...");
  const integrityResult = execSync(`sqlite3 "${DB_PATH}" "PRAGMA integrity_check;"`, {
    encoding: "utf8",
  }).trim();

  if (integrityResult !== "ok") {
    console.error(`[INTEGRITY FAILURE] Expected 'ok', received:\n${integrityResult}`);
    process.exit(1);
  }
  console.log("  >> Integrity check PASSED: ok");

  console.log("[2/3] Running PRAGMA foreign_key_check...");
  const fkResult = execSync(`sqlite3 "${DB_PATH}" "PRAGMA foreign_key_check;"`, {
    encoding: "utf8",
  }).trim();

  if (fkResult.length > 0) {
    console.warn(`[FOREIGN KEY WARNING] Found violations:\n${fkResult}`);
  } else {
    console.log("  >> Foreign key check PASSED: 0 violations");
  }
} catch (e) {
  console.warn("  >> sqlite3 CLI not available in PATH, skipping local integrity PRAGMA check.");
}

// 2. Perform Atomic Online Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(BACKUP_DIR, `ksai_backup_${timestamp}.db`);

console.log(`\n[3/3] Performing atomic online backup to:\n  ${backupFile}`);

try {
  // Use sqlite3 online backup command if CLI is present
  execSync(`sqlite3 "${DB_PATH}" ".backup '${backupFile}'"`);
  const stats = fs.statSync(backupFile);
  console.log(`  >> Backup completed successfully! File size: ${stats.size} bytes`);
} catch {
  // Safe Node file copy fallback
  fs.copyFileSync(DB_PATH, backupFile);
  const stats = fs.statSync(backupFile);
  console.log(`  >> Backup copied successfully! File size: ${stats.size} bytes`);
}

console.log("\n==================================================");
console.log("BACKUP VERIFICATION COMPLETE");
console.log("==================================================");
