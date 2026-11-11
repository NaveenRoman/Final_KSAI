import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { CourseManagementClient } from "@/components/admin/CourseManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireAdminPage();
  const { action } = await searchParams;

  const courses = await db.course.findMany({
    include: {
      chapters: {
        select: { id: true, title: true, orderNumber: true },
        orderBy: { orderNumber: "asc" },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminPageLayout
      title="Course & Curriculum Management"
      subtitle="KnowledgeStream AI curriculum catalog, chapter syllabi, contests, and coding challenges"
      adminUser={admin}
    >
      <CourseManagementClient
        initialCourses={courses}
        autoOpenCreate={action === "create"}
      />
    </AdminPageLayout>
  );
}
