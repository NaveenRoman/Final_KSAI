import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const totalStudents = await db.user.count({
      where: { role: { in: ["Student", "STUDENT", "User"] } },
    });
    const totalUsersCount = await db.user.count();
    const activeContests = await db.contest.count({
      where: { status: "PUBLISHED" },
    });
    const totalContests = await db.contest.count();
    const totalChallenges = await db.challenge.count();
    const totalSubmissions = await db.submission.count();

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalUsersCount,
        activeContests,
        totalContests,
        totalChallenges,
        totalSubmissions,
      },
    });
  } catch (error) {
    console.error("GET Admin Stats Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
