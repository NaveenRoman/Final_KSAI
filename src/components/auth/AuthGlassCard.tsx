"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { AuthLoadingOverlay } from "./AuthLoadingOverlay";

interface AuthGlassCardProps {
  onAuthSuccess: (user: { name?: string; email?: string; role?: string }) => void;
}

const PORTALS = [
  {
    id: "STUDENT",
    label: "Student",
    icon: "🎓",
    badge: "Student Workspace",
    target: "/dashboard",
    demoEmail: "student.csm@kgrcet.edu",
    demoPass: "Password@1234",
  },
  {
    id: "FACULTY",
    label: "Faculty",
    icon: "👨‍🏫",
    badge: "Faculty Portal",
    target: "/dashboard/faculty",
    demoEmail: "faculty.csm@kgrcet.edu",
    demoPass: "Password@1234",
  },
  {
    id: "COLLEGE_ADMIN",
    label: "College Admin",
    icon: "🏫",
    badge: "College Admin",
    target: "/dashboard/college",
    demoEmail: "collegeadmin@kgrcet.edu",
    demoPass: "Password@1234",
  },
  {
    id: "DEPARTMENT_ADMIN",
    label: "Dept Admin",
    icon: "🏢",
    badge: "Dept Admin",
    target: "/dashboard/department",
    demoEmail: "hod.csm@kgrcet.edu",
    demoPass: "Password@1234",
  },
  {
    id: "SUPER_ADMIN",
    label: "Super Admin",
    icon: "👑",
    badge: "Super Admin",
    target: "/admin/dashboard",
    demoEmail: "admin@ksai.local",
    demoPass: "Admin@12345",
  },
];

export function AuthGlassCard({ onAuthSuccess }: AuthGlassCardProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [selectedPortalId, setSelectedPortalId] = useState<string>("STUDENT");
  const [prefillEmail, setPrefillEmail] = useState<string>("");
  const [prefillPassword, setPrefillPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const isSignupActive = activeTab === "signup";
  const [authenticatedUser, setAuthenticatedUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [googlePrefill, setGooglePrefill] = useState<{
    name: string;
    email: string;
    googleId?: string;
    emailVerified?: boolean;
  } | null>(null);

  const currentPortal = PORTALS.find((p) => p.id === selectedPortalId) || PORTALS[0];

  const handlePortalSelect = (portal: typeof PORTALS[0]) => {
    setSelectedPortalId(portal.id);
  };

  const handleQuickFill = () => {
    setPrefillEmail(currentPortal.demoEmail);
    setPrefillPassword(currentPortal.demoPass);
  };

  const handleStartAuth = (user: { name?: string; email?: string; role?: string }) => {
    setAuthenticatedUser(user);
    setIsLoading(true);
  };

  const handleCompleteAuth = () => {
    setIsLoading(false);
    if (authenticatedUser) {
      onAuthSuccess(authenticatedUser);
    }
  };

  const handleGooglePrefill = (data: {
    name: string;
    email: string;
    googleId?: string;
    emailVerified?: boolean;
  }) => {
    setGooglePrefill(data);
    setActiveTab("signup");
  };

  return (
    <div className={`w-full mx-auto transition-all duration-300 ${isSignupActive ? "max-w-xl sm:max-w-2xl" : "max-w-md sm:max-w-lg"}`}>
      {/* Floating Glassmorphic Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl relative bg-[#0C0C14]/90 backdrop-blur-2xl glow-border-blue w-full flex flex-col"
      >
        {/* Top Radial Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        {activeTab === "login" && (
          <div className="text-center mb-4 space-y-1">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome Back 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Select your portal and continue into your workspace.
            </p>
          </div>
        )}

        {/* Tab Switcher Pills */}
        <div className="relative p-1.5 rounded-2xl bg-white/5 border border-white/15 flex items-center mb-4 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative z-10 ${
              activeTab === "login" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signup")}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative z-10 ${
              activeTab === "signup" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>

          {/* Animated Pill Background */}
          <motion.div
            className="absolute inset-y-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg"
            initial={false}
            animate={{
              left: activeTab === "login" ? "6px" : "50%",
              width: "calc(50% - 6px)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Portal Options Switcher (when login is active) */}
        {activeTab === "login" && (
          <div className="mb-4 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Select Portal / Role
            </div>

            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
              {PORTALS.map((portal) => {
                const isSelected = selectedPortalId === portal.id;
                return (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => handlePortalSelect(portal)}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? "bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.03] border border-blue-400/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base">{portal.icon}</span>
                    <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate max-w-full">
                      {portal.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Portal description & demo credential prefill button */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm">{currentPortal.icon}</span>
                <span className="font-semibold text-slate-200 truncate">{currentPortal.badge}</span>
                <span className="text-[10px] text-blue-400 font-mono hidden sm:inline">({currentPortal.target})</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-[10px] font-bold transition-all shrink-0"
              >
                ⚡ Fill Demo
              </button>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {activeTab === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginForm
                  onSubmitSuccess={handleStartAuth}
                  onSwitchToSignUp={() => setActiveTab("signup")}
                  onGooglePrefill={handleGooglePrefill}
                  prefillEmail={prefillEmail}
                  prefillPassword={prefillPassword}
                />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SignUpForm
                  onSubmitSuccess={handleStartAuth}
                  onSwitchToLogin={() => setActiveTab("login")}
                  googlePrefill={googlePrefill}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Simulated Multi-step Loading Overlay */}
      {isLoading && <AuthLoadingOverlay onComplete={handleCompleteAuth} />}
    </div>
  );
}
