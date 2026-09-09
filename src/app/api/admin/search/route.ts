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

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: {
          students: [],
          faculty: [],
          colleges: [],
          courses: [],
        },
      });
    }

    const [students, faculty, colleges, courses] = await Promise.all([
      // Search Students
      db.user.findMany({
        where: {
          role: { in: ["Student", "STUDENT", "User"] },
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { college: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          college: true,
          department: true,
          xp: true,
        },
      }),

      // Search Faculty
      db.user.findMany({
        where: {
          role: { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] },
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { college: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          college: true,
          department: true,
        },
      }),

      // Search Colleges
      db.college.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { code: { contains: query } },
            { location: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          code: true,
          location: true,
        },
      }),

      // Search Courses
      db.course.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { language: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          language: true,
          level: true,
          price: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      query,
      results: {
        students,
        faculty,
        colleges,
        courses,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/search Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search" },
      { status: 500 }
    );
  }
}
