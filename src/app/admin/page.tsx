import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { getSuperAdminDashboardData } from "@/lib/admin/admin-service";
import { SuperAdminDashboardClient } from "@/components/admin/SuperAdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = await requireAdminPage();
  const dashboardData = await getSuperAdminDashboardData("30d");

  return (
    <SuperAdminDashboardClient
      initialData={dashboardData}
      adminUser={{
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      }}
    />
  );
}
