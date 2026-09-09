"use client";

import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { GlobalSearchModal } from "./GlobalSearchModal";

interface AdminPageLayoutProps {
  title: string;
  subtitle?: string;
  adminUser?: {
    name?: string;
    email?: string;
    role?: string;
  };
  children: React.ReactNode;
}

export function AdminPageLayout({
  title,
  subtitle,
  adminUser,
  children,
}: AdminPageLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
      {/* Fixed Dark Navy Sidebar */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Top Header */}
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
        />

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
