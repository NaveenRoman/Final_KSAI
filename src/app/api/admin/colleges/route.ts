import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { getDetailedCollegesList, createCollegeRecord } from "@/lib/admin/admin-service";

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

    const data = await getDetailedCollegesList();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/admin/colleges Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, code, location, status } = body;

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "College name must be at least 3 characters long" },
        { status: 400 }
      );
    }

    const newCollege = await createCollegeRecord({
      name,
      code,
      location,
      status: status === "ACTIVE" ? "ACTIVE" : "PENDING",
    });

    return NextResponse.json({
      success: true,
      college: newCollege,
      message: `Institution "${newCollege.name}" has been successfully onboarded.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/colleges Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create college" },
      { status: 400 }
    );
  }
}
