"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  icon,
  backHref,
  backLabel = "Back",
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] ${className}`}
    >
      <div className="space-y-1.5">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
          >
            <ChevronLeft size={14} />
            <span>{backLabel}</span>
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          {icon && <div className="text-[var(--brand-cyan)] shrink-0">{icon}</div>}
          <h1 className="ks-heading-page">{title}</h1>
          {badge && (
            <span className="ks-badge-cyan font-mono text-[10px]">{badge}</span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
