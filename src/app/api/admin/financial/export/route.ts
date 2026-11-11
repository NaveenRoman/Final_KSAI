import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { exportTransactionsCsv } from "@/lib/financial-service";

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

    const { searchParams } = new URL(req.url);
    const timeframeParam = searchParams.get("timeframe") || "all";
    const statusParam = (searchParams.get("status") || "ALL").toUpperCase();
    const provenanceParam = (searchParams.get("provenance") || "ALL").toUpperCase();
    const search = searchParams.get("search") || "";

    const validTimeframes = ["today", "7d", "30d", "3m", "1y", "all"] as const;
    const timeframe = validTimeframes.includes(timeframeParam as any)
      ? (timeframeParam as "today" | "7d" | "30d" | "3m" | "1y" | "all")
      : "all";

    const validStatuses = ["ALL", "PAID", "REFUNDED", "FAILED", "CREATED"] as const;
    const status = validStatuses.includes(statusParam as any)
      ? (statusParam as "ALL" | "PAID" | "REFUNDED" | "FAILED" | "CREATED")
      : "ALL";

    const validProvenances = ["ALL", "LIVE", "TEST", "UNKNOWN"] as const;
    const provenance = validProvenances.includes(provenanceParam as any)
      ? (provenanceParam as "ALL" | "LIVE" | "TEST" | "UNKNOWN")
      : "ALL";

    const csvContent = await exportTransactionsCsv({
      timeframe,
      status,
      provenance,
      search,
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `ksai_financial_ledger_${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/financial/export Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export transactions CSV" },
      { status: 500 }
    );
  }
}
