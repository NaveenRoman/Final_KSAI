import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCollegeAnalytics } from "@/lib/college/college-service";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userEmailParam = request.nextUrl.searchParams.get("userEmail");
    const collegeParam = request.nextUrl.searchParams.get("college");

    // 1. Resolve session from Better Auth or Session Token
    const sessionTokenRaw =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("sessionToken")?.value;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    let authUser = session?.user as any;

    if (!authUser && sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await prisma.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });
      if (dbSession && new Date() < dbSession.expiresAt) {
        authUser = dbSession.user;
      }
    }

    // 2. Identify effective target user
    let user = authUser;
    if (!user && userEmailParam) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "Authentication required to access college intelligence." },
          { status: 401 }
        );
      }
      user = await prisma.user.findUnique({
        where: { email: userEmailParam },
        select: { id: true, email: true, role: true, college: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found or unauthenticated." },
        { status: userEmailParam ? 404 : 401 }
      );
    }

    const isAdmin =
      user.role === "Admin" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "SuperAdmin";

    // 3. Multi-tenant access controls:
    // Non-admin users cannot query for a college different from their assigned college
    if (collegeParam && user.college && collegeParam !== user.college && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You are not authorized to view analytics for another institution.",
        },
        { status: 403 }
      );
    }

    const effectiveCollege = collegeParam && isAdmin ? collegeParam : user.college;

    if (!effectiveCollege) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            collegeName: "Unassigned Institution",
            totalStudents: 0,
            activeCoursesCount: 4,
            averageMasteryRate: 0,
            assessmentPassRate: 0,
            careerReadyPercentage: 0,
          },
          courseHealth: [],
          insights: [
            {
              id: "ins-unassigned",
              category: "STUDENT_SUPPORT",
              title: "Institution Profile Required",
              insight: "Your account is not linked to an enrolled college or university campus.",
              recommendedFacultyAction: "Update your profile or contact your campus administrator.",
              severity: "LOW",
            },
          ],
          skillDistribution: [],
          studentsNeedingSupportCount: 0,
        },
      });
    }

    const analytics = await getCollegeAnalytics(
      effectiveCollege,
      user.role || "Student",
      user.email
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("College Analytics GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load college analytics." },
      { status: 500 }
    );
  }
}
