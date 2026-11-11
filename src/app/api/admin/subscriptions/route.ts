import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { getAdminSubscriptionsData } from "@/lib/admin/subscription-admin-service";

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
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const timeframe = searchParams.get("timeframe") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    const result = await getAdminSubscriptionsData({
      search,
      plan,
      status,
      timeframe,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("GET /api/admin/subscriptions Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load subscriptions" },
      { status: 500 }
    );
  }
}
