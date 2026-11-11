import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: (process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV) || (process.env.NODE_ENV === "production" && process.env.DATABASE_URL?.startsWith("postgres")))
      ? "postgresql"
      : "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID || "").trim().replace(/^["']|["']$/g, ""),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim().replace(/^["']|["']$/g, ""),
    },
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      college: { type: "string", required: false },
      department: { type: "string", required: false },
      currentYear: { type: "string", required: false },
      role: { type: "string", required: false, defaultValue: "Student" },
      country: { type: "string", required: false, defaultValue: "United States" },
      provider: { type: "string", required: false, defaultValue: "CREDENTIALS" },
      googleId: { type: "string", required: false },
      passwordHash: { type: "string", required: false },
    },
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    cookieCache: {
      enabled: false,
    },
  },
  account: {
    storeStateStrategy: "database",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  baseURL:
    (process.env.NODE_ENV === "production" || process.env.VERCEL === "1")
      ? "https://www.knowledgestreamai.com"
      : process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://knowledgestreamai.com",
    "https://www.knowledgestreamai.com",
    "https://final-ksai.vercel.app",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
});
