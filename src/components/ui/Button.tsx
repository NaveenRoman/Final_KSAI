"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg",
      md: "px-4 py-2 min-h-[44px] text-sm font-bold rounded-xl",
      lg: "px-6 py-3 min-h-[48px] text-base font-extrabold rounded-2xl",
    }[size];

    const variantClasses = {
      primary: "ks-btn-primary",
      secondary: "ks-btn-secondary",
      ghost: "ks-btn-ghost",
      danger:
        "inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl font-bold text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer",
      outline:
        "inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl font-semibold text-sm bg-transparent border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-cyan)] transition-all cursor-pointer",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${sizeClasses} ${variantClasses} ${
          isLoading || disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
