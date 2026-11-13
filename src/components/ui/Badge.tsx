"use client";

import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "cyan" | "purple" | "success" | "warning" | "error" | "neutral";
}

export function Badge({
  variant = "brand",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantClasses = {
    brand: "ks-badge",
    cyan: "ks-badge-cyan",
    purple: "ks-badge-purple",
    success: "ks-badge-success",
    warning:
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400",
    error:
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400",
    neutral:
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/5 border border-[var(--border-subtle)] text-[var(--text-secondary)]",
  }[variant];

  return (
    <span className={`${variantClasses} ${className}`} {...props}>
      {children}
    </span>
  );
}
