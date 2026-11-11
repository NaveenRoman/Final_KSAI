import { db } from "@/lib/db";
import { GEMINI_PRIMARY_MODEL } from "@/lib/ai/gemini-config";

export type AiHealthStatus =
  | "Not Configured"
  | "Configured / Unprobed"
  | "Operational"
  | "Degraded"
  | "Unavailable";

export interface AiHealthMetrics {
  totalRecentRequests: number;
  successCount: number;
  timeout408Count: number;
  error503Count: number;
  otherErrorCount: number;
  errorRatePercent: number;
}

export interface AiHealthSummary {
  status: AiHealthStatus;
  primaryModel: string;
  hasKey: boolean;
  metrics: AiHealthMetrics;
  detail: string;
}

/**
 * Derives true AI health status without generating paid API calls.
 * Evaluates configured key existence and real recent AiTelemetry performance.
 */
export async function getAiHealthSummary(): Promise<AiHealthSummary> {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10
  );

  if (!hasKey) {
    return {
      status: "Not Configured",
      primaryModel: GEMINI_PRIMARY_MODEL,
      hasKey: false,
      metrics: {
        totalRecentRequests: 0,
        successCount: 0,
        timeout408Count: 0,
        error503Count: 0,
        otherErrorCount: 0,
        errorRatePercent: 0,
      },
      detail: "API key is not configured.",
    };
  }

  try {
    const recentTelemetry = await db.aiTelemetry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        status: true,
      },
    });

    if (recentTelemetry.length === 0) {
      return {
        status: "Configured / Unprobed",
        primaryModel: GEMINI_PRIMARY_MODEL,
        hasKey: true,
        metrics: {
          totalRecentRequests: 0,
          successCount: 0,
          timeout408Count: 0,
          error503Count: 0,
          otherErrorCount: 0,
          errorRatePercent: 0,
        },
        detail: "API key configured. No telemetry recorded yet.",
      };
    }

    let successCount = 0;
    let timeout408Count = 0;
    let error503Count = 0;
    let otherErrorCount = 0;

    for (const row of recentTelemetry) {
      if (row.status >= 200 && row.status < 300) {
        successCount++;
      } else if (row.status === 408) {
        timeout408Count++;
      } else if (row.status === 503) {
        error503Count++;
      } else {
        otherErrorCount++;
      }
    }

    const total = recentTelemetry.length;
    const failures = timeout408Count + error503Count + otherErrorCount;
    const errorRatePercent = Math.round((failures / total) * 100);

    let status: AiHealthStatus = "Operational";
    if (errorRatePercent >= 75) {
      status = "Unavailable";
    } else if (errorRatePercent > 10) {
      status = "Degraded";
    } else {
      status = "Operational";
    }

    const parts: string[] = [];
    if (successCount > 0) parts.push(`${successCount} OK`);
    if (timeout408Count > 0) parts.push(`${timeout408Count} Timeout (408)`);
    if (error503Count > 0) parts.push(`${error503Count} 503s`);
    if (otherErrorCount > 0) parts.push(`${otherErrorCount} Errors`);
    parts.push(`${errorRatePercent}% err rate`);

    return {
      status,
      primaryModel: GEMINI_PRIMARY_MODEL,
      hasKey: true,
      metrics: {
        totalRecentRequests: total,
        successCount,
        timeout408Count,
        error503Count,
        otherErrorCount,
        errorRatePercent,
      },
      detail: parts.join(", "),
    };
  } catch (err: any) {
    return {
      status: "Configured / Unprobed",
      primaryModel: GEMINI_PRIMARY_MODEL,
      hasKey: true,
      metrics: {
        totalRecentRequests: 0,
        successCount: 0,
        timeout408Count: 0,
        error503Count: 0,
        otherErrorCount: 0,
        errorRatePercent: 0,
      },
      detail: "API key configured. Telemetry query failed.",
    };
  }
}
