import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NotificationComposerClient } from "@/components/admin/NotificationComposerClient";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const admin = await requireAdminPage();
  const { action } = await searchParams;

  const notifications = await db.notification.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true, role: true, college: true },
      },
    },
  });

  return (
    <AdminPageLayout
      title="Notification Center & Broadcasts"
      subtitle="Send high-priority announcements and inspect system event deliveries"
      adminUser={admin}
    >
      <NotificationComposerClient
        initialNotifications={notifications}
        autoOpenCompose={action === "compose"}
      />
    </AdminPageLayout>
  );
}
