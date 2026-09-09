import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { getSuperAdminDashboardData } from "@/lib/admin/admin-service";

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
    const timeframeParam = searchParams.get("timeframe") || "30d";
    const validTimeframes = ["today", "7d", "30d", "3m", "1y"] as const;
    const timeframe = validTimeframes.includes(timeframeParam as any)
      ? (timeframeParam as "today" | "7d" | "30d" | "3m" | "1y")
      : "30d";

    const dashboardData = await getSuperAdminDashboardData(timeframe);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/dashboard Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
