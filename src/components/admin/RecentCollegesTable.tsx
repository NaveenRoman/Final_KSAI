"use client";

import React from "react";
import Link from "next/link";
import { Building2, ArrowRight, ExternalLink } from "lucide-react";
import { SuperAdminDashboardData } from "@/lib/admin/admin-service";

interface RecentCollegesTableProps {
  colleges: SuperAdminDashboardData["recentColleges"];
}

export function RecentCollegesTable({ colleges }: RecentCollegesTableProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Colleges
            </h3>
            <p className="text-[11px] text-slate-500">
              Affiliated campuses &amp; institutional status
            </p>
          </div>
        </div>
        <Link
          href="/admin/colleges"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-3 pr-4">College Name</th>
              <th className="pb-3 px-3">Students</th>
              <th className="pb-3 px-3">Active</th>
              <th className="pb-3 pl-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {colleges.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  <Building2 size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No colleges onboarded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Institutions added to the platform will appear here.</p>
                </td>
              </tr>
            ) : (
              colleges.map((col) => (
                <tr
                  key={col.id}
                  className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    <Link
                      href={`/admin/colleges?highlight=${col.id}`}
                      className="flex items-center gap-2.5 group-hover:text-blue-600 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 flex items-center justify-center shrink-0 transition-colors">
                        <Building2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600">
                          {col.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {col.location}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {col.studentsCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {col.activeCount.toLocaleString()}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        col.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : col.status === "Pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          col.status === "Active"
                            ? "bg-emerald-500"
                            : col.status === "Pending"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {col.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
