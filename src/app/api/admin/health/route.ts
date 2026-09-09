import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - t0;

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
    const hasBetterAuthSecret = Boolean(process.env.BETTER_AUTH_SECRET);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        server: {
          status: "Healthy",
          uptimeSeconds: process.uptime(),
          nodeVersion: process.version,
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        database: {
          status: dbLatencyMs < 100 ? "Healthy" : "Degraded",
          latencyMs: dbLatencyMs,
          type: "SQLite (Local High-Performance)",
        },
        aiService: {
          status: hasGeminiKey ? "Operational" : "Degraded",
          gateway: "Google Gemini 2.5 / DeepSeek Coder",
          hasKey: hasGeminiKey,
        },
        authService: {
          status: hasBetterAuthSecret ? "Healthy" : "Degraded",
          provider: "Better-Auth Session Gateway",
        },
        courseService: {
          status: "Healthy",
          pipeline: "Dynamic Markdown & Chapter Parser",
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/health Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Health check failed",
        health: {
          server: { status: "Healthy" },
          database: { status: "Offline", error: error.message },
          aiService: { status: "Degraded" },
          authService: { status: "Degraded" },
        },
      },
      { status: 500 }
    );
  }
}
