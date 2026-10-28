import { PrismaClient } from "@/generated/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  // Cloud deployment markers (Vercel, Railway, Render, Fly, Netlify, or CI)
  const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const isCloudDeployment =
    isVercel ||
    process.env.CI === "1" ||
    process.env.CI === "true" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.FLY_APP_NAME) ||
    process.env.NETLIFY === "true";

  const isPostgresUrl = Boolean(
    url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))
  );

  // Strictly require PostgreSQL in cloud deployments (especially Vercel), never allowing SQLite
  if (isCloudDeployment || (process.env.NODE_ENV === "production" && url && !url.startsWith("file:"))) {
    if (!isPostgresUrl) {
      throw new Error(
        "FATAL: Production database misconfigured. DATABASE_URL environment variable must be set and start with 'postgresql://' or 'postgres://'."
      );
    }
    return url!;
  }

  return url || "file:./dev.db";
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV !== "production"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
