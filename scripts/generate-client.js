/**
 * KnowledgeStream AI — Dual Prisma Client Generator
 *
 * Dynamically selects prisma/schema.postgresql.prisma when deploying to Vercel
 * or when DATABASE_URL is configured for PostgreSQL, and defaults to
 * prisma/schema.prisma (SQLite) for local development.
 */

const { execSync } = require("child_process");
const path = require("path");

const isPostgres = Boolean(
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres")) ||
  process.env.VERCEL === "1"
);

const schemaFile = isPostgres
  ? "prisma/schema.postgresql.prisma"
  : "prisma/schema.prisma";

console.log(`[generate-client] Target schema: ${schemaFile} (isPostgres: ${isPostgres})`);

try {
  execSync(`npx prisma generate --schema=${schemaFile}`, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  });
} catch (error) {
  console.error(`[generate-client] Generation failed: ${error.message}`);
  process.exit(1);
}
