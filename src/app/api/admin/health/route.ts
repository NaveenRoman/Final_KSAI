import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import {
  formatUptime,
  getCpuUsagePercent,
  getMemoryMetrics,
  measureDatabasePing,
  measureDjangoPing,
} from "@/lib/server-monitoring";
import { getAiHealthSummary } from "@/lib/ai/ai-health";

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

    const uptimeSeconds = process.uptime();
    const formattedUptime = formatUptime(uptimeSeconds);
    const cpuUsagePercent = getCpuUsagePercent();
    const memoryMetrics = getMemoryMetrics();
    const [dbPing, djangoPing, aiHealth] = await Promise.all([
      measureDatabasePing(),
      measureDjangoPing(),
      getAiHealthSummary(),
    ]);

    const serverStatus =
      memoryMetrics.systemUsedPercent > 95 || cpuUsagePercent > 95
        ? "Degraded"
        : "Healthy";

    const hasBetterAuthSecret = Boolean(process.env.BETTER_AUTH_SECRET);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        server: {
          status: serverStatus,
          uptimeSeconds: Math.floor(uptimeSeconds),
          formattedUptime,
          cpuUsagePercent,
          memory: memoryMetrics,
          nodeVersion: process.version,
          processNote:
            "Process uptime measures continuous execution since current worker start; distinguishes process runtime from host infrastructure availability.",
        },
        database: {
          status: dbPing.status,
          latencyMs: dbPing.latencyMs,
          type: dbPing.provider,
          ...(dbPing.error ? { error: dbPing.error } : {}),
        },
        executionBackend: {
          status: djangoPing.status,
          latencyMs: djangoPing.latencyMs,
          service: djangoPing.service,
          sandbox: djangoPing.sandbox,
          ...(djangoPing.error ? { error: djangoPing.error } : {}),
          note: "Lightweight HTTP probe verifying Django execution service availability and sandbox runtime.",
        },
        aiService: {
          status: aiHealth.status,
          gateway: `${aiHealth.primaryModel} / DeepSeek Coder`,
          hasKey: aiHealth.hasKey,
          metrics: aiHealth.metrics,
          detail: aiHealth.detail,
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
    const memoryMetrics = getMemoryMetrics();
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Health check failed",
        health: {
          server: {
            status: "Degraded",
            uptimeSeconds: Math.floor(process.uptime()),
            formattedUptime: formatUptime(process.uptime()),
            memory: memoryMetrics,
          },
          database: { status: "Offline", error: error.message },
          aiService: { status: "Degraded" },
          authService: { status: "Degraded" },
        },
      },
      { status: 500 }
    );
  }
}
