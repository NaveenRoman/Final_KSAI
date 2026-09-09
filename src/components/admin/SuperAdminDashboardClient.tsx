"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { QuickActionsBar } from "./QuickActionsBar";
import { ImportantAlertsBanner } from "./ImportantAlertsBanner";
import { TodayAtKSAI } from "./TodayAtKSAI";
import { OverviewStatCards } from "./OverviewStatCards";
import { PlatformUsageChart } from "./PlatformUsageChart";
import { UserDistributionDonut } from "./UserDistributionDonut";
import { AIPerformancePanel } from "./AIPerformancePanel";
import { RecentCollegesTable } from "./RecentCollegesTable";
import { TopPerformingBranches } from "./TopPerformingBranches";
import { AIActivityInsights } from "./AIActivityInsights";
import { PlacementOverviewWidget } from "./PlacementOverviewWidget";
import { SystemHealthWidget } from "./SystemHealthWidget";
import { RecentNotificationsWidget } from "./RecentNotificationsWidget";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface SuperAdminDashboardClientProps {
  initialData: SuperAdminDashboardData;
  adminUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function SuperAdminDashboardClient({
  initialData,
  adminUser,
}: SuperAdminDashboardClientProps) {
  const [data, setData] = useState<SuperAdminDashboardData>(initialData);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadingTimeframe, setLoadingTimeframe] = useState(false);

  // Timeframe change handler
  const handleSelectTimeframe = async (tf: "today" | "7d" | "30d" | "3m" | "1y") => {
    setLoadingTimeframe(true);
    try {
      const res = await fetch(`/api/admin/dashboard?timeframe=${tf}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData((prev) => ({
          ...prev,
          usageTrend: json.data.usageTrend,
        }));
      }
    } catch (err) {
      console.error("Failed to load timeframe data:", err);
    } finally {
      setLoadingTimeframe(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
      {/* 1. Left Fixed Dark Navy Sidebar */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* 2. Main Content Wrapper (Pushed right by sidebar width on desktop) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Top Sticky Header */}
        <AdminHeader
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setIsMobileSidebarOpen(true);
            } else {
              setIsCollapsed((prev) => !prev);
            }
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          adminUser={adminUser}
          unreadCount={data.recentNotifications.length}
        />

        {/* Dashboard Main Content Body */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Important Alert System */}
          <ImportantAlertsBanner alerts={data.actionableAlerts} />

          {/* Today at KnowledgeStream AI KPI Summary */}
          <TodayAtKSAI stats={data.todayStats} />

          {/* Quick Actions Bar */}
          <QuickActionsBar
            onAddCollege={() => (window.location.href = "/admin/colleges?action=create")}
            onAddCourse={() => (window.location.href = "/admin/courses?action=create")}
            onAddUser={() => (window.location.href = "/admin/users?action=create")}
            onBroadcast={() => (window.location.href = "/admin/notifications?action=compose")}
          />

          {/* SECTION 1 — Platform Overview Cards (6 Stat Cards) */}
          <section>
            <OverviewStatCards stats={data.overviewStats} />
          </section>

          {/* SECTION 2, 3, 4 — Platform Usage Trend, User Distribution, AI Performance */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Section 2: Platform Usage Trend (Chart) */}
            <div className="lg:col-span-5">
              <PlatformUsageChart
                trend={data.usageTrend}
                onSelectTimeframe={handleSelectTimeframe}
              />
            </div>

            {/* Section 3: User Distribution (Donut) */}
            <div className="lg:col-span-4">
              <UserDistributionDonut distribution={data.userDistribution} />
            </div>

            {/* Section 4: AI Performance Panel */}
            <div className="lg:col-span-3">
              <AIPerformancePanel performance={data.aiPerformance} />
            </div>
          </section>

          {/* SECTION 5, 6, 7 — Recent Colleges, Top Performing Branches, AI Activity */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Section 5: Recent Colleges */}
            <div className="lg:col-span-4">
              <RecentCollegesTable colleges={data.recentColleges} />
            </div>

            {/* Section 6: Top Performing Branches */}
            <div className="lg:col-span-4">
              <TopPerformingBranches branches={data.topPerformingBranches} />
            </div>

            {/* Section 7: AI Activity Insights */}
            <div className="lg:col-span-4">
              <AIActivityInsights insights={data.aiActivityInsights} />
            </div>
          </section>

          {/* SECTION 8, 9, 10 — Placement Overview, System Health, Notifications & Live Feed */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Section 8: Placement Overview */}
            <div className="lg:col-span-4">
              <PlacementOverviewWidget placement={data.placementOverview} />
            </div>

            {/* Section 9: System Health */}
            <div className="lg:col-span-4">
              <SystemHealthWidget initialHealth={data.systemHealth} />
            </div>

            {/* Section 10: Recent Notifications & Live Feed */}
            <div className="lg:col-span-4">
              <RecentNotificationsWidget
                notifications={data.recentNotifications}
                liveActivity={data.liveActivity}
              />
            </div>
          </section>
        </main>
      </div>

      {/* Global Command Palette / Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
