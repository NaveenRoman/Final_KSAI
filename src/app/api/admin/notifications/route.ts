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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30", 10)));
    const search = (searchParams.get("search") || "").trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const [totalCount, notifications] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, college: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve notifications" },
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
    const { title, message, targetAudience = "ALL", specificUserId } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Notification title must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Notification message must be at least 5 characters" },
        { status: 400 }
      );
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    // Determine target recipient IDs
    let userWhere: any = {};
    const audienceUpper = String(targetAudience).toUpperCase();

    if (audienceUpper === "STUDENTS" || audienceUpper === "STUDENT") {
      userWhere.role = { in: ["Student", "STUDENT", "User"] };
    } else if (audienceUpper === "FACULTY") {
      userWhere.role = { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] };
    } else if (audienceUpper === "COLLEGE_ADMIN" || audienceUpper === "COLLEGES") {
      userWhere.role = { in: ["COLLEGE_ADMIN", "CollegeAdmin", "PRINCIPAL", "DIRECTOR"] };
    } else if (audienceUpper === "SPECIFIC" || specificUserId) {
      if (!specificUserId) {
        return NextResponse.json(
          { success: false, error: "specificUserId is required when targeting single user" },
          { status: 400 }
        );
      }
      userWhere.id = specificUserId;
    } else {
      // ALL users
      userWhere = {};
    }

    const targetUsers = await db.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No target users found matching the audience criteria" },
        { status: 404 }
      );
    }

    // Insert notifications for all target users
    // Chunk in batches of 50 for SQLite parameter limits safety
    const chunkSize = 50;
    let createdCount = 0;

    for (let i = 0; i < targetUsers.length; i += chunkSize) {
      const chunk = targetUsers.slice(i, i + chunkSize);
      await db.$transaction(
        chunk.map((u) =>
          db.notification.create({
            data: {
              userId: u.id,
              title: cleanTitle,
              message: cleanMessage,
            },
          })
        )
      );
      createdCount += chunk.length;
    }

    // Record audit log
    await db.activityLog.create({
      data: {
        userId: admin.id,
        actionType: "ADMIN_BROADCAST_NOTIFICATION",
        metadata: JSON.stringify({
          title: cleanTitle,
          targetAudience: audienceUpper,
          recipientsCount: createdCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast delivered to ${createdCount} users successfully`,
      recipientsCount: createdCount,
      targetAudience: audienceUpper,
    });
  } catch (error: any) {
    console.error("[ADMIN_NOTIFICATIONS_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to broadcast notification" },
      { status: 500 }
    );
  }
}
