import React from "react";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side Super Admin authorization for all admin subroutes
  await requireAdminPage();

  return <>{children}</>;
}
