import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { UserManagementClient } from "@/components/admin/UserManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string; action?: string }>;
}) {
  const admin = await requireAdminPage();
  const { role: roleFilter, q: searchFilter, page: pageParam, action } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const pageSize = 30;

  const whereClause: any = {};
  if (roleFilter && roleFilter !== "all") {
    if (roleFilter === "student") {
      whereClause.role = { in: ["Student", "STUDENT", "User"] };
    } else if (roleFilter === "faculty") {
      whereClause.role = { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] };
    } else if (roleFilter === "college") {
      whereClause.role = { in: ["COLLEGE_ADMIN", "CollegeAdmin", "PRINCIPAL", "DIRECTOR"] };
    } else if (roleFilter === "admin") {
      whereClause.role = { in: ["SUPER_ADMIN", "SuperAdmin", "Admin", "ADMIN"] };
    }
  }

  if (searchFilter) {
    whereClause.OR = [
      { name: { contains: searchFilter } },
      { email: { contains: searchFilter } },
      { college: { contains: searchFilter } },
    ];
  }

  const [
    users,
    totalCount,
    studentsCount,
    facultyCount,
    collegeCount,
    superAdminCount,
    colleges,
  ] = await Promise.all([
    db.user.findMany({
      where: whereClause,
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
        xp: true,
        level: true,
        createdAt: true,
      },
    }),
    db.user.count({ where: whereClause }),
    db.user.count({ where: { role: { in: ["Student", "STUDENT", "User"] } } }),
    db.user.count({ where: { role: { in: ["FACULTY", "Faculty", "Teacher", "HOD", "DEPARTMENT_ADMIN"] } } }),
    db.user.count({ where: { role: { in: ["COLLEGE_ADMIN", "CollegeAdmin", "PRINCIPAL", "DIRECTOR"] } } }),
    db.user.count({ where: { role: { in: ["SUPER_ADMIN", "SuperAdmin", "Admin", "ADMIN"] } } }),
    db.college.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminPageLayout
      title="User Management"
      subtitle="Directory of students, faculty instructors, and institutional administrators"
      adminUser={admin}
    >
      <UserManagementClient
        initialUsers={users}
        totalCount={totalCount}
        studentsCount={studentsCount}
        facultyCount={facultyCount}
        collegeCount={collegeCount}
        superAdminCount={superAdminCount}
        availableColleges={colleges}
        currentRoleFilter={roleFilter || "all"}
        currentSearch={searchFilter || ""}
        currentPage={page}
        pageSize={pageSize}
        autoOpenCreate={action === "create"}
      />
    </AdminPageLayout>
  );
}
