import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: process.env.DATABASE_URL?.startsWith("postgres")
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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
      enabled: true,
      maxAge: 7 * 24 * 60 * 60,
    },
  },
  account: {
    storeStateStrategy: "database",
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
});
