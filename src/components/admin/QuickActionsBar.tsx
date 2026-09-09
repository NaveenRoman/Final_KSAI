"use client";

import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Building2,
  BookOpen,
  UserPlus,
  Send,
  BarChart3,
  Zap,
} from "lucide-react";

interface QuickActionsBarProps {
  onAddCollege?: () => void;
  onAddCourse?: () => void;
  onAddUser?: () => void;
  onBroadcast?: () => void;
}

export function QuickActionsBar({
  onAddCollege,
  onAddCourse,
  onAddUser,
  onBroadcast,
}: QuickActionsBarProps) {
  const actions = [
    {
      label: "Add College",
      icon: Building2,
      href: "/admin/colleges?action=create",
      onClick: onAddCollege,
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    },
    {
      label: "Add Course",
      icon: BookOpen,
      href: "/admin/courses?action=create",
      onClick: onAddCourse,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      label: "Add User",
      icon: UserPlus,
      href: "/admin/users?action=create",
      onClick: onAddUser,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
    },
    {
      label: "Send Notification",
      icon: Send,
      href: "/admin/notifications?action=compose",
      onClick: onBroadcast,
      color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
    },
    {
      label: "View Analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
        <Zap size={14} className="text-amber-500 fill-amber-400" />
        <span>Quick Actions:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              href={act.href}
              onClick={(e) => {
                if (act.onClick) {
                  e.preventDefault();
                  act.onClick();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${act.color}`}
            >
              <PlusCircle size={13} />
              <Icon size={13} />
              <span>{act.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
