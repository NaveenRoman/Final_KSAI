import os from "os";
import { db } from "@/lib/db";

// State for CPU sampling differential
let lastCpuSample = process.cpuUsage();
let lastCpuTime = Date.now();

/**
 * Calculates CPU utilization percent using differential process.cpuUsage sampling.
 * Clamped between 0 and 100%. Safe and non-blocking.
 */
export function getCpuUsagePercent(): number {
  const now = Date.now();
  const elapsedMs = now - lastCpuTime;
  if (elapsedMs < 10) return 0;

  const diff = process.cpuUsage(lastCpuSample);
  lastCpuSample = process.cpuUsage();
  lastCpuTime = now;

  const totalMicros = diff.user + diff.system;
  const numCpus = os.cpus().length || 1;
  const percent = Math.min(
    100,
    Math.round((totalMicros / (elapsedMs * 1000 * numCpus)) * 100)
  );
  return percent;
}

/**
 * Formats seconds into human-readable uptime string.
 * Example: "45s", "2m 15s", "14h 32m", "3d 4h"
 */
export function formatUptime(uptimeSeconds: number): string {
  const s = Math.floor(uptimeSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) return `${m}m ${remS}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return `${h}h ${remM}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

/**
 * Returns memory utilization details in megabytes and percentage.
 */
export function getMemoryMetrics() {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const systemUsed = totalMem - freeMem;

  return {
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    systemTotalMb: Math.round(totalMem / 1024 / 1024),
    systemFreeMb: Math.round(freeMem / 1024 / 1024),
    systemUsedPercent: Math.round((systemUsed / totalMem) * 100),
  };
}

/**
 * Performs an isolated SELECT 1 database ping to measure true connection latency.
 * Does not measure or conflate application queries with ping roundtrip.
 */
export async function measureDatabasePing(): Promise<{
  status: "Healthy" | "Degraded" | "Offline";
  latencyMs: number;
  provider: string;
  error?: string;
}> {
  const dbUrl = process.env.DATABASE_URL || "";
  const provider = dbUrl.startsWith("postgres") || dbUrl.startsWith("postgresql")
    ? "PostgreSQL (Managed Cloud)"
    : "SQLite (Local High-Performance)";

  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - t0;
    return {
      status: latencyMs < 100 ? "Healthy" : "Degraded",
      latencyMs,
      provider,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    return {
      status: "Offline",
      latencyMs,
      provider,
      error: err?.message || "Failed to execute database ping",
    };
  }
}

/**
 * Performs a protected health check against the Django backend.
 * Uses a strict 2-second timeout (AbortSignal.timeout(2000)).
 * Reports genuine HTTP server availability and roundtrip latency.
 * Does not make false claims about Docker container execution or AI provider status.
 */
export async function measureDjangoPing(): Promise<{
  status: "Healthy" | "Degraded" | "Offline";
  latencyMs: number;
  service: string;
  sandbox?: {
    status: string;
    mode: string;
    dockerActive: boolean;
  };
  error?: string;
}> {
  const djangoHealthUrl =
    process.env.DJANGO_HEALTH_URL ||
    (process.env.DJANGO_RUN_URL
      ? process.env.DJANGO_RUN_URL.replace(/\/run\/?$/, "/health/")
      : "http://127.0.0.1:8000/api/health/");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const secret = process.env.INTERNAL_API_SECRET || process.env.STUDENT_SIGNING_SECRET || "";
  if (secret) {
    headers["X-Internal-Secret"] = secret;
  }

  const t0 = Date.now();
  try {
    const res = await fetch(djangoHealthUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(2000),
    });
    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      return {
        status: "Degraded",
        latencyMs,
        service: "Django Execution Backend",
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json().catch(() => null);

    return {
      status: latencyMs < 200 ? "Healthy" : "Degraded",
      latencyMs,
      service: "Django Execution Backend",
      sandbox: data?.sandbox,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      status: "Offline",
      latencyMs,
      service: "Django Execution Backend",
      error: isTimeout
        ? "Request timed out after 2000ms"
        : (err?.message || "Connection refused"),
    };
  }
}
