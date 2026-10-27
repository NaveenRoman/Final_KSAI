import { PrismaClient } from "@/generated/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (process.env.NODE_ENV === "production") {
    if (!url || (!url.startsWith("postgres://") && !url.startsWith("postgresql://"))) {
      throw new Error(
        "FATAL: Production database misconfigured. DATABASE_URL environment variable must be set and start with 'postgresql://' or 'postgres://'."
      );
    }
    return url;
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
