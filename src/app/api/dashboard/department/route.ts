import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles-server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Enforce strict role authorization
    const authResult = await requireRole(
      ["DEPARTMENT_ADMIN", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"],
      req
    );
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const requestedDept = url.searchParams.get("dept");

    // 2. Strict Tenant Scoping:
    // DEPARTMENT_ADMIN and FACULTY are strictly locked to their assigned department.
    // Query parameter tampering is strictly ignored.
    let department: any = null;

    if (user.role === "DEPARTMENT_ADMIN" || user.role === "FACULTY") {
      if (user.departmentId) {
        department = await db.department.findUnique({
          where: { id: user.departmentId },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
      if (!department && user.department) {
        department = await db.department.findFirst({
          where: {
            collegeId: user.collegeId || undefined,
            OR: [
              { code: user.department.trim().toUpperCase() },
              { name: { contains: user.department.trim() } },
            ],
          },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
    } else if (user.role === "COLLEGE_ADMIN") {
      // College Admin can only inspect departments within their own college
      const userCollegeId = user.collegeId;
      if (requestedDept && userCollegeId) {
        department = await db.department.findFirst({
          where: {
            collegeId: userCollegeId,
            OR: [
              { id: requestedDept },
              { code: requestedDept.toUpperCase() },
              { name: { contains: requestedDept } },
            ],
          },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
      if (!department && userCollegeId) {
        department = await db.department.findFirst({
          where: { collegeId: userCollegeId },
          orderBy: { code: "asc" },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
    } else if (user.role === "SUPER_ADMIN") {
      // Super Admin can inspect any department
      if (requestedDept) {
        department = await db.department.findFirst({
          where: {
            OR: [
              { id: requestedDept },
              { code: requestedDept.toUpperCase() },
              { name: { contains: requestedDept } },
            ],
          },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
      if (!department) {
        department = await db.department.findFirst({
          where: { code: "CSM" },
          include: {
            college: true,
            classes: { orderBy: { name: "asc" } },
            announcements: { orderBy: { date: "desc" }, take: 10 },
          },
        });
      }
    }

    // 3. Honest Empty State if no department found
    if (!department) {
      return NextResponse.json({
        success: true,
        department: null,
        message: "No department assigned to current user",
        overviewStats: {
          totalStudents: { value: 0, subtitle: "No department assigned" },
          activeStudents7d: { value: 0, subtitle: "Last 7 days" },
          facultyCount: { value: 0, subtitle: "No faculty registered" },
          activeClassesCount: { value: 0, subtitle: "No classes scheduled" },
          learningEngagement: { value: "0.0%", subtitle: "Platform adoption" },
          aiLearningActivity: { value: 0, subtitle: "Tracked AI events" },
        },
        facultyOverview: [],
        classes: [],
        performanceDistribution: {
          excellent: { count: 0, percent: "0.0", label: "Advanced (>4,000 XP)" },
          good: { count: 0, percent: "0.0", label: "Good (2,500 - 3,999 XP)" },
          needsAttention: { count: 0, percent: "0.0", label: "Needs Attention (1,000 - 2,499 XP)" },
          atRisk: { count: 0, percent: "0.0", label: "At Risk (<1,000 XP)" },
        },
        studentsNeedingAttention: [],
        aiInsights: {
          insights: [],
          hasData: false,
          emptyMessage: "AI insights will appear as department learning activity grows.",
        },
        announcements: [],
        recentActivity: [],
        authenticatedUser: {
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      });
    }

    // 4. Also fetch available sibling departments for College Admin / Super Admin switchers
    let availableDepartments: { id: string; name: string; code: string }[] = [];
    if (user.role === "COLLEGE_ADMIN" || user.role === "SUPER_ADMIN") {
      availableDepartments = await db.department.findMany({
        where: department.collegeId ? { collegeId: department.collegeId } : {},
        select: { id: true, name: true, code: true },
        orderBy: { code: "asc" },
      });
    }

    // 5. Query Department Students (Exact Count & Records)
    const departmentStudents = await db.user.findMany({
      where: {
        departmentId: department.id,
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        lastActiveDate: true,
      },
      orderBy: { xp: "desc" },
    });

    const totalStudents = departmentStudents.length;
    const studentUserIds = departmentStudents.map((s) => s.id);

    // 6. Active Students in last 7 days (Strict Genuine Activity Check)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActiveStudentIds = new Set<string>();

    if (studentUserIds.length > 0) {
      const recentLogs = await db.activityLog.findMany({
        where: {
          userId: { in: studentUserIds },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { userId: true },
      });
      recentLogs.forEach((l) => recentActiveStudentIds.add(l.userId));
    }

    departmentStudents.forEach((s) => {
      if (s.lastActiveDate && new Date(s.lastActiveDate) >= sevenDaysAgo) {
        recentActiveStudentIds.add(s.id);
      }
    });

    const activeStudents7d = recentActiveStudentIds.size;

    // 7. Active Classes & Total Section Capacity (Not Enrolled Students)
    const activeClasses = (department.classes || []).filter((c: any) => c.active);
    const totalSectionCapacity = activeClasses.reduce((acc: number, c: any) => acc + (c.totalStudents || 0), 0);
    const avgClassScore = activeClasses.length > 0
      ? Number((activeClasses.reduce((acc: number, c: any) => acc + (c.avgScore || 0), 0) / activeClasses.length).toFixed(1))
      : 0;

    // 8. Department Faculty Members
    const facultyUsers = await db.user.findMany({
      where: {
        departmentId: department.id,
        role: { in: ["FACULTY", "DEPARTMENT_ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastActiveDate: true,
      },
      orderBy: { role: "asc" }, // DEPARTMENT_ADMIN first
    });

    // 9. Faculty Teaching Overview Breakdown (Capacity Coverage)
    const facultyOverview = facultyUsers.map((f) => {
      const assigned = activeClasses.filter((c: any) => c.facultyEmail === f.email);
      const capacityCovered = assigned.reduce((sum: number, c: any) => sum + (c.totalStudents || 0), 0);
      return {
        id: f.id,
        name: f.name,
        email: f.email,
        role: f.role === "DEPARTMENT_ADMIN" ? "Head of Department" : "Assistant Professor",
        assignedClassesCount: assigned.length,
        assignedClasses: assigned.map((c: any) => c.name),
        studentsCovered: capacityCovered,
        status: "Active",
      };
    });

    // 10. Learning Engagement %
    const learningEngagement = totalStudents > 0
      ? Number(((activeStudents7d / totalStudents) * 100).toFixed(1))
      : 0;

    // 11. Student Performance Distribution (Exact XP bands)
    let excellentCount = 0;
    let goodCount = 0;
    let needsAttentionCount = 0;
    let atRiskCount = 0;

    for (const s of departmentStudents) {
      if (s.xp >= 4000) excellentCount++;
      else if (s.xp >= 2500) goodCount++;
      else if (s.xp >= 1000) needsAttentionCount++;
      else atRiskCount++;
    }

    const calcPercent = (count: number) =>
      totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) : "0.0";

    const performanceDistribution = {
      excellent: {
        count: excellentCount,
        percent: calcPercent(excellentCount),
        label: "Advanced (>4,000 XP)",
      },
      good: {
        count: goodCount,
        percent: calcPercent(goodCount),
        label: "Good Progress (2,500 - 3,999 XP)",
      },
      needsAttention: {
        count: needsAttentionCount,
        percent: calcPercent(needsAttentionCount),
        label: "Needs Attention (1,000 - 2,499 XP)",
      },
      atRisk: {
        count: atRiskCount,
        percent: calcPercent(atRiskCount),
        label: "At Risk (<1,000 XP)",
      },
    };

    // 12. Students Needing Attention (Intervention Radar)
    const studentsNeedingAttention = departmentStudents
      .filter((s) => s.xp < 1000 || (s.lastActiveDate && new Date(s.lastActiveDate) < sevenDaysAgo))
      .map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        xp: s.xp,
        level: s.level,
        reason: s.xp < 1000 ? "Low learning XP / practice deficit" : "Inactive on platform for 7+ days",
        lastActive: s.lastActiveDate
          ? new Date(s.lastActiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "No recent activity",
      }));

    // 13. Real AI Diagnostics from LearningMemory for Department Students
    let departmentMemories: any[] = [];
    if (studentUserIds.length > 0) {
      departmentMemories = await db.learningMemory.findMany({
        where: { userId: { in: studentUserIds } },
        orderBy: { createdAt: "desc" },
      });
    }

    let aiInsights: any = {
      insights: [],
      hasData: false,
      emptyMessage: "AI insights will appear as department learning activity grows.",
    };

    if (departmentMemories.length > 0) {
      const struggleMemories = departmentMemories.filter((m) => m.memoryType === "STRUGGLE");
      const strengthMemories = departmentMemories.filter((m) => m.memoryType === "STRENGTH");
      const reviewMemories = departmentMemories.filter((m) => m.memoryType === "REVIEW");

      const generatedInsights = [];

      if (struggleMemories.length > 0) {
        generatedInsights.push({
          id: "dept-ai-struggle",
          type: "warning",
          category: "Curriculum Intervention",
          title: `Challenging Concept: ${struggleMemories[0].topic}`,
          description: `Identified by automated AI learning telemetry across ${struggleMemories.length} student submission(s).`,
          impact: "Requires Review",
          action: "Recommend targeted practice tutorial or live doubt-clearing session.",
        });
      }

      if (strengthMemories.length > 0) {
        generatedInsights.push({
          id: "dept-ai-strength",
          type: "success",
          category: "Technical Mastery",
          title: `Core Proficiency: ${strengthMemories[0].topic}`,
          description: `Consistently solved with high test-pass confidence across ${strengthMemories.length} department learning session(s).`,
          impact: "Curriculum Milestone Met",
          action: "Cohort ready for competitive programming problem sets.",
        });
      }

      if (reviewMemories.length > 0) {
        generatedInsights.push({
          id: "dept-ai-review",
          type: "info",
          category: "Revision Radar",
          title: `Concept for Refresh: ${reviewMemories[0].topic}`,
          description: `Flagged for reinforcement to ensure long-term retention prior to examinations.`,
          impact: "Revision Needed",
          action: "Queue interactive revision checkpoint quiz in next week's syllabus.",
        });
      }

      if (generatedInsights.length > 0) {
        aiInsights = {
          insights: generatedInsights,
          hasData: true,
          emptyMessage: "",
        };
      }
    }

    // 14. Combined Announcements (Department Notices + College Notices)
    const collegeAnnouncements = department.collegeId
      ? await db.collegeAnnouncement.findMany({
          where: { collegeId: department.collegeId },
          orderBy: { date: "desc" },
          take: 3,
        })
      : [];

    const formattedDeptAnnouncements = (department.announcements || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      source: "Department Notice",
      date: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }));

    const formattedCollegeAnnouncements = collegeAnnouncements.map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      source: "College Notice",
      date: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }));

    const allAnnouncements = [...formattedDeptAnnouncements, ...formattedCollegeAnnouncements];

    // 15. Real Activity Feed (ActivityLog entries for department members)
    const allDepartmentUserIds = [...studentUserIds, ...facultyUsers.map((f) => f.id)];
    let recentActivities: any[] = [];
    if (allDepartmentUserIds.length > 0) {
      const logs = await db.activityLog.findMany({
        where: { userId: { in: allDepartmentUserIds } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      });

      recentActivities = logs.map((l) => ({
        id: l.id,
        action: l.actionType || "Learning Session",
        user: l.user?.name || "Department Scholar",
        role: l.user?.role || "STUDENT",
        time: new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date(l.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      }));
    }

    // Determine HOD name
    const hodUser = facultyUsers.find((f) => f.role === "DEPARTMENT_ADMIN") || {
      name: user.role === "DEPARTMENT_ADMIN" ? user.name : "Dr. K. Srinivas",
      email: user.role === "DEPARTMENT_ADMIN" ? user.email : "hod.csm@kgrcet.edu",
    };

    return NextResponse.json({
      success: true,
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        collegeId: department.collegeId,
        collegeName: department.college?.name || user.college || "KG Reddy College of Engineering & Technology",
        hodName: hodUser.name,
        hodEmail: hodUser.email,
        academicYear: "2024 - 2025",
        semester: "Semester V",
      },
      overviewStats: {
        totalStudents: {
          value: totalStudents,
          sectionCapacity: totalSectionCapacity,
          subtitle: `${totalStudents} registered accounts (${totalSectionCapacity} total section capacity)`,
        },
        activeStudents7d: {
          value: activeStudents7d,
          subtitle: activeStudents7d > 0 ? `${activeStudents7d} active in last 7 days` : "0 active in last 7 days",
        },
        facultyCount: {
          value: facultyUsers.length,
          subtitle: `${facultyUsers.length} active faculty (${facultyOverview.filter((f) => f.assignedClassesCount > 0).length} class in-charges)`,
        },
        activeClassesCount: {
          value: activeClasses.length,
          avgScore: avgClassScore,
          subtitle: `${activeClasses.length} cohorts (${avgClassScore}% curriculum target benchmark)`,
        },
        learningEngagement: {
          value: `${learningEngagement}%`,
          subtitle: activeStudents7d > 0 ? "Weekly active learning rate" : "Awaiting student platform activity",
        },
        aiLearningActivity: {
          value: departmentMemories.length,
          subtitle: `${departmentMemories.length} tracked AI diagnostic events`,
        },
      },
      performanceDistribution,
      studentsNeedingAttention: {
        count: studentsNeedingAttention.length,
        students: studentsNeedingAttention,
        emptyMessage: "No students currently require intervention. All registered department learners are meeting engagement benchmarks.",
      },
      facultyOverview,
      classes: activeClasses.map((c: any) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        facultyName: c.facultyName || "Department Faculty",
        facultyEmail: c.facultyEmail,
        totalStudents: c.totalStudents,
        avgScore: c.avgScore,
        active: c.active,
        status: c.avgScore >= 80 ? "On Track" : "Needs Review",
      })),
      aiInsights,
      announcements: allAnnouncements,
      recentActivity: recentActivities,
      availableDepartments,
      authenticatedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        college: user.college,
      },
    });
  } catch (error: any) {
    console.error("Department Dashboard API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load department dashboard metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Allowed to post announcement: DEPARTMENT_ADMIN, COLLEGE_ADMIN, SUPER_ADMIN
    const authResult = await requireRole(
      ["DEPARTMENT_ADMIN", "COLLEGE_ADMIN", "SUPER_ADMIN"],
      req
    );
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, departmentId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Announcement title is required" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Announcement content is required" }, { status: 400 });
    }

    // Determine target department
    let targetDeptId = user.departmentId;
    if (user.role === "COLLEGE_ADMIN" || user.role === "SUPER_ADMIN") {
      targetDeptId = departmentId || user.departmentId;
    }

    if (!targetDeptId && user.department) {
      const dept = await db.department.findFirst({
        where: {
          collegeId: user.collegeId || undefined,
          OR: [
            { code: user.department.trim().toUpperCase() },
            { name: { contains: user.department.trim() } },
          ],
        },
      });
      targetDeptId = dept?.id;
    }

    if (!targetDeptId) {
      return NextResponse.json(
        { success: false, error: "No target department found to attach announcement" },
        { status: 400 }
      );
    }

    const newAnnouncement = await db.departmentAnnouncement.create({
      data: {
        departmentId: targetDeptId,
        title: title.trim(),
        content: content.trim(),
        date: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      announcement: {
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        source: "Department Notice",
        date: new Date(newAnnouncement.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      },
    });
  } catch (error: any) {
    console.error("Department Announcement Creation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create department announcement" },
      { status: 500 }
    );
  }
}
