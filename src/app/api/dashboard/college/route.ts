import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles-server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authResult = await requireRole(["COLLEGE_ADMIN", "SUPER_ADMIN"], req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const requestedCollege = url.searchParams.get("college");

    let college: any = null;

    if (user.role === "SUPER_ADMIN") {
      if (requestedCollege) {
        college = await db.college.findFirst({
          where: {
            OR: [
              { id: requestedCollege },
              { code: requestedCollege.toUpperCase() },
              { name: { contains: requestedCollege } },
            ],
          },
          include: {
            departments: {
              include: { classes: true },
            },
            announcements: {
              orderBy: { date: "desc" },
              take: 5,
            },
            placements: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
      } else if (user.collegeId) {
        college = await db.college.findUnique({
          where: { id: user.collegeId },
          include: {
            departments: { include: { classes: true } },
            announcements: { orderBy: { date: "desc" }, take: 5 },
            placements: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
      } else {
        // Super admin without specified college defaults to first active college
        college = await db.college.findFirst({
          where: { status: "ACTIVE" },
          include: {
            departments: { include: { classes: true } },
            announcements: { orderBy: { date: "desc" }, take: 5 },
            placements: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
      }
    } else {
      // Regular COLLEGE_ADMIN: STRICT MULTI-TENANT ISOLATION
      if (user.collegeId) {
        college = await db.college.findUnique({
          where: { id: user.collegeId },
          include: {
            departments: { include: { classes: true } },
            announcements: { orderBy: { date: "desc" }, take: 5 },
            placements: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
      } else if (user.college) {
        college = await db.college.findFirst({
          where: {
            name: { contains: user.college },
          },
          include: {
            departments: { include: { classes: true } },
            announcements: { orderBy: { date: "desc" }, take: 5 },
            placements: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
      }

      // If no college is found for this admin, NEVER fall back to another college!
      if (!college) {
        return NextResponse.json({
          success: true,
          unassigned: true,
          message: "Your administrator account is not linked to any registered institution.",
          college: null,
          authenticatedUser: {
            name: user.name,
            email: user.email,
            role: user.role,
            college: user.college,
          },
        });
      }
    }

    // If still no college found (e.g. database has 0 colleges)
    if (!college) {
      return NextResponse.json({
        success: true,
        unassigned: true,
        message: "No colleges registered in the platform database.",
        college: null,
        authenticatedUser: {
          name: user.name,
          email: user.email,
          role: user.role,
          college: user.college,
        },
      });
    }

    // Scoped query filter strictly for this college
    const collegeUserFilter = {
      OR: [
        { collegeId: college.id },
        { college: { equals: college.name } },
      ],
    };

    // 1. Total Students Count
    const totalStudents = await db.user.count({
      where: {
        AND: [
          collegeUserFilter,
          { role: { in: ["STUDENT", "Student", "User"] } },
        ],
      },
    });

    // 2. Active Learners in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const active7dStudents = await db.user.count({
      where: {
        AND: [
          collegeUserFilter,
          { role: { in: ["STUDENT", "Student", "User"] } },
          {
            OR: [
              { lastActiveDate: { gte: sevenDaysAgo } },
              { updatedAt: { gte: sevenDaysAgo } },
            ],
          },
        ],
      },
    });

    const engagementPercent = totalStudents > 0
      ? Math.round((active7dStudents / totalStudents) * 100)
      : 0;

    // 3. Faculty Members Count
    const facultyCount = await db.user.count({
      where: {
        AND: [
          collegeUserFilter,
          { role: { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] } },
        ],
      },
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeFacultyToday = await db.user.count({
      where: {
        AND: [
          collegeUserFilter,
          { role: { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] } },
          {
            OR: [
              { lastActiveDate: { gte: oneDayAgo } },
              { updatedAt: { gte: oneDayAgo } },
            ],
          },
        ],
      },
    });

    // 4. Departments Breakdown
    const departmentsList = college.departments || [];
    const departmentPerformance = await Promise.all(
      departmentsList.map(async (dept: any) => {
        const [deptStudents, deptFaculty] = await Promise.all([
          db.user.count({
            where: {
              AND: [
                collegeUserFilter,
                {
                  OR: [
                    { departmentId: dept.id },
                    { department: { contains: dept.name } },
                    { department: { contains: dept.code } },
                  ],
                },
                { role: { in: ["STUDENT", "Student", "User"] } },
              ],
            },
          }),
          db.user.count({
            where: {
              AND: [
                collegeUserFilter,
                {
                  OR: [
                    { departmentId: dept.id },
                    { department: { contains: dept.name } },
                    { department: { contains: dept.code } },
                  ],
                },
                { role: { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] } },
              ],
            },
          }),
        ]);

        const classes = dept.classes || [];
        const avgScore = classes.length > 0
          ? Math.round(classes.reduce((acc: number, c: any) => acc + (c.avgScore || 0), 0) / classes.length)
          : 0;

        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          studentsCount: deptStudents,
          facultyCount: deptFaculty,
          classesCount: classes.length,
          avgScore,
        };
      })
    );

    // 5. Placement Batch Statistics (Real from DB or null)
    const placementRecord = college.placements?.[0] || null;
    const placementStatistics = placementRecord
      ? {
          hasData: true,
          batchYear: placementRecord.batchYear,
          totalEligible: placementRecord.totalEligible,
          placed: placementRecord.placedCount,
          inProgress: placementRecord.inProcessCount,
          preparing: placementRecord.preparingCount,
          notEligible: placementRecord.notEligibleCount,
          placedPercent: placementRecord.totalEligible > 0
            ? Math.round((placementRecord.placedCount / placementRecord.totalEligible) * 100)
            : 0,
          inProgressPercent: placementRecord.totalEligible > 0
            ? Math.round((placementRecord.inProcessCount / placementRecord.totalEligible) * 100)
            : 0,
          preparingPercent: placementRecord.totalEligible > 0
            ? Math.round((placementRecord.preparingCount / placementRecord.totalEligible) * 100)
            : 0,
          averagePackage: `${placementRecord.averagePackage} LPA`,
          highestPackage: `${placementRecord.highestPackage} LPA`,
        }
      : null;

    // 6. Real Top Students
    const topStudentUsers = await db.user.findMany({
      where: {
        ...collegeUserFilter,
        role: { in: ["STUDENT", "Student", "User"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        currentYear: true,
        xp: true,
        level: true,
        progresses: {
          where: { isCompleted: true },
          select: { id: true, quizScore: true },
        },
        submissions: {
          where: { status: "PASSED" },
          select: { id: true },
        },
      },
      orderBy: [
        { xp: "desc" },
        { level: "desc" },
      ],
      take: 10,
    });

    const topStudents = topStudentUsers.map((s, idx) => {
      const completedLessons = s.progresses.length;
      const passedChallenges = s.submissions.length;
      const avgQuiz = s.progresses.length > 0
        ? Math.round(s.progresses.reduce((acc, p) => acc + (p.quizScore || 0), 0) / s.progresses.length)
        : 0;

      return {
        rank: idx + 1,
        id: s.id,
        name: s.name,
        email: s.email,
        department: s.department || "General",
        year: s.currentYear || "Enrolled",
        xp: s.xp,
        level: s.level,
        completedLessons,
        passedChallenges,
        avgQuizScore: avgQuiz > 0 ? `${avgQuiz}%` : "—",
        status: s.xp >= 3000 ? "Advanced Learner" : s.xp >= 1000 ? "Active Learner" : "Beginner",
      };
    });

    // 7. Assessment Average across all college students
    const collegeStudentIds = topStudentUsers.map((u) => u.id);
    const progressStats = collegeStudentIds.length > 0
      ? await db.chapterProgress.aggregate({
          where: {
            userId: { in: collegeStudentIds },
            quizScore: { gt: 0 },
          },
          _avg: { quizScore: true },
          _count: { id: true },
        })
      : { _avg: { quizScore: null }, _count: { id: 0 } };

    const avgAssessmentScore = progressStats._avg.quizScore
      ? `${Math.round(progressStats._avg.quizScore)}%`
      : null;

    // 8. Real Activity Feed from ActivityLog
    const rawActivities = await db.activityLog.findMany({
      where: {
        user: collegeUserFilter,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const recentActivities = rawActivities.map((act) => {
      let actionLabel = "interacted with KnowledgeStream AI";
      let type: "success" | "info" | "warning" | "neutral" = "info";

      if (act.actionType === "CHAPTER_COMPLETE") {
        actionLabel = "completed a curriculum chapter";
        type = "success";
      } else if (act.actionType === "QUIZ_SUBMIT") {
        actionLabel = "submitted an assessment quiz";
        type = "warning";
      } else if (act.actionType === "HEARTBEAT") {
        actionLabel = "active in AI coding practice";
        type = "neutral";
      } else if (act.actionType === "CONTEST_SUBMIT") {
        actionLabel = "submitted a competitive challenge";
        type = "success";
      }

      const diffMs = Date.now() - new Date(act.createdAt).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      let timeStr = "just now";
      if (diffDays > 0) timeStr = `${diffDays}d ago`;
      else if (diffHours > 0) timeStr = `${diffHours}h ago`;
      else if (diffMins > 0) timeStr = `${diffMins}m ago`;

      return {
        id: act.id,
        user: act.user?.name || "Student",
        role: act.user?.role
          ? `${act.user.role}${act.user.department ? ` (${act.user.department})` : ""}`
          : "Student",
        action: actionLabel,
        time: timeStr,
        type,
      };
    });

    // 9. Official College Announcements
    const announcements = (college.announcements || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.category,
      date: new Date(a.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

    // 10. Dynamic Institutional Intelligence Insights (Fact-driven)
    const aiInsights: Array<{
      id: string;
      type: "success" | "warning" | "info";
      category: string;
      title: string;
      description: string;
      impact: string;
      action: string;
    }> = [];

    if (placementStatistics) {
      aiInsights.push({
        id: "ai-placement",
        type: placementStatistics.placedPercent >= 50 ? "success" : "info",
        category: "Placement Performance",
        title: `${placementStatistics.batchYear}: ${placementStatistics.placedPercent}% Placed`,
        description: `${placementStatistics.placed} of ${placementStatistics.totalEligible} eligible candidates placed. Avg: ${placementStatistics.averagePackage}, Peak: ${placementStatistics.highestPackage}.`,
        impact: placementStatistics.placedPercent >= 50 ? "Institutional Milestone" : "Monitoring Required",
        action: `${placementStatistics.inProgress} candidates currently in technical review stages.`,
      });
    }

    if (topStudents.length > 0) {
      const topStudent = topStudents[0];
      aiInsights.push({
        id: "ai-leader",
        type: "success",
        category: "Learning Mastery",
        title: `Campus Leader: ${topStudent.name} (${topStudent.xp} XP)`,
        description: `Top student in ${topStudent.department} with ${topStudent.completedLessons} completed lessons and Level ${topStudent.level} proficiency.`,
        impact: "High Student Consistency",
        action: "Nominate student cohort for advanced enterprise challenges.",
      });
    }

    if (departmentsList.length === 0) {
      aiInsights.push({
        id: "ai-dept-notice",
        type: "warning",
        category: "Configuration",
        title: "No Departments Configured",
        description: "Configure engineering departments to enable academic performance metrics and branch comparisons.",
        impact: "Action Required",
        action: "Navigate to Department Console to register departments.",
      });
    }

    if (totalStudents === 0) {
      aiInsights.push({
        id: "ai-student-notice",
        type: "info",
        category: "Onboarding",
        title: "Awaiting Student Enrollment",
        description: "No student records are linked to this college. Metrics will visualize as students register.",
        impact: "Initial State",
        action: "Share the institutional registration link with your student body.",
      });
    }

    // 11. All Colleges for Super Admin Switcher
    let allColleges: any[] | undefined = undefined;
    if (user.role === "SUPER_ADMIN") {
      allColleges = await db.college.findMany({
        select: { id: true, name: true, code: true, status: true },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      college: {
        id: college.id,
        name: college.name,
        code: college.code || "",
        location: college.location || "",
        status: college.status || "ACTIVE",
        academicYear: "2024 - 2025",
      },
      overviewStats: {
        totalStudents: {
          value: totalStudents,
          active7d: active7dStudents,
          status: totalStudents > 0 ? "healthy" : "empty",
        },
        facultyCount: {
          value: facultyCount,
          activeToday: activeFacultyToday,
          status: facultyCount > 0 ? "healthy" : "empty",
        },
        departmentsCount: {
          value: departmentsList.length,
          label: departmentsList.length > 0 ? `${departmentsList.length} Registered Departments` : "No departments",
        },
        placementRate: {
          hasData: !!placementStatistics,
          value: placementStatistics ? `${placementStatistics.placedPercent}%` : null,
          eligible: placementStatistics?.totalEligible || 0,
          placed: placementStatistics?.placed || 0,
          averagePackage: placementStatistics?.averagePackage || null,
          highestPackage: placementStatistics?.highestPackage || null,
        },
        engagementRate: {
          value: `${engagementPercent}%`,
          activeStudents: active7dStudents,
          totalStudents,
          status: engagementPercent >= 50 ? "High" : engagementPercent > 0 ? "Moderate" : "None",
        },
        assessmentIndex: {
          hasData: !!avgAssessmentScore,
          score: avgAssessmentScore,
          completedChapters: progressStats._count.id,
          status: avgAssessmentScore ? "Active" : "No assessments yet",
        },
      },
      placementStatistics,
      departmentPerformance,
      topStudents,
      aiInsights,
      recentActivities,
      announcements,
      authenticatedUser: {
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
      },
      allColleges,
    });
  } catch (error: any) {
    console.error("College Dashboard API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load college dashboard metrics" },
      { status: 500 }
    );
  }
}
