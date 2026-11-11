import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    const roleParam = searchParams.get("role") || "all";
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const collegeId = searchParams.get("collegeId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: any = {};

    if (roleParam && roleParam !== "all") {
      const lowerRole = roleParam.toLowerCase();
      if (lowerRole === "student") {
        where.role = { in: ["Student", "STUDENT", "User"] };
      } else if (lowerRole === "faculty") {
        where.role = { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] };
      } else if (lowerRole === "college") {
        where.role = { in: ["COLLEGE_ADMIN", "CollegeAdmin", "PRINCIPAL", "DIRECTOR"] };
      } else if (lowerRole === "admin") {
        where.role = { in: ["SUPER_ADMIN", "SuperAdmin", "Admin", "ADMIN"] };
      }
    }

    if (collegeId) {
      where.collegeId = collegeId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { college: { contains: search } },
        { department: { contains: search } },
      ];
    }

    const [totalCount, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          college: true,
          department: true,
          collegeId: true,
          departmentId: true,
          xp: true,
          level: true,
          createdAt: true,
          updatedAt: true,
          lastActiveDate: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        totalCount,
        totalPages,
        page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load users" },
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
    const { name, email, password, role = "Student", college, department, collegeId, departmentId } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Full name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "A user with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash("Codexa@2026", 10); // Secure initial temporary hash

    const allowedRoles = ["Student", "Faculty", "College Admin", "Super Admin"];
    const normalizedRole = allowedRoles.find((r) => r.toLowerCase() === String(role).toLowerCase()) || "Student";

    const newUser = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        college: college ? String(college).trim() : null,
        department: department ? String(department).trim() : null,
        collegeId: collegeId ? String(collegeId).trim() : null,
        departmentId: departmentId ? String(departmentId).trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        department: true,
        createdAt: true,
      },
    });

    // Record audit trail
    await db.activityLog.create({
      data: {
        userId: admin.id,
        actionType: "ADMIN_USER_CREATED",
        metadata: JSON.stringify({
          createdUserId: newUser.id,
          createdEmail: newUser.email,
          role: newUser.role,
          adminEmail: admin.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `User ${newUser.name} created successfully with role ${newUser.role}`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/users Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminUser(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin access required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId, role, college, department, collegeId, departmentId, name } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "User ID is required for update" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name && typeof name === "string") updateData.name = name.trim();
    if (role && typeof role === "string") updateData.role = role.trim();
    if (college !== undefined) updateData.college = college ? String(college).trim() : null;
    if (department !== undefined) updateData.department = department ? String(department).trim() : null;
    if (collegeId !== undefined) updateData.collegeId = collegeId ? String(collegeId).trim() : null;
    if (departmentId !== undefined) updateData.departmentId = departmentId ? String(departmentId).trim() : null;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        department: true,
        updatedAt: true,
      },
    });

    // Record audit trail
    await db.activityLog.create({
      data: {
        userId: admin.id,
        actionType: "ADMIN_USER_UPDATED",
        metadata: JSON.stringify({
          targetUserId: updatedUser.id,
          targetEmail: updatedUser.email,
          previousRole: targetUser.role,
          newRole: updatedUser.role,
          adminEmail: admin.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/users Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
