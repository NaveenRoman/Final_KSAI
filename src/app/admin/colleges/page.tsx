import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { getDetailedCollegesList } from "@/lib/admin/admin-service";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { CollegeManagementClient } from "@/components/admin/CollegeManagementClient";

export const dynamic = "force-dynamic";

export default async function AdminCollegesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; highlight?: string }>;
}) {
  const admin = await requireAdminPage();
  const { action, highlight } = await searchParams;
  const collegesData = await getDetailedCollegesList();

  return (
    <AdminPageLayout
      title="College & Institutional Management"
      subtitle="Institutional affiliations, engineering departments, and campus configurations"
      adminUser={admin}
    >
      <CollegeManagementClient
        initialData={collegesData}
        highlightId={highlight}
        autoOpenCreate={action === "create"}
      />
    </AdminPageLayout>
  );
}
