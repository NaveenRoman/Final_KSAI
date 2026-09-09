"use client";

import React, { useState } from "react";
import { BackgroundParticles } from "@/components/canvas/BackgroundParticles";
import { AuthSceneCanvas } from "@/components/auth/AuthSceneCanvas";
import { AuthGlassCard } from "@/components/auth/AuthGlassCard";
import { ArrowLeft, CheckCircle2, UserCheck, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { normalizeUserRole, getRoleDashboardPath } from "@/lib/roles";

export default function AuthPage() {
  const [authUser, setAuthUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>("/dashboard");

  // If already authenticated, redirect to their role dashboard
  React.useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.role) {
            const dest = getRoleDashboardPath(data.user.role);
            window.location.href = dest;
          }
        }
      } catch {}
    }
    checkExistingSession();
  }, []);

  const handleAuthSuccess = async (user: { name?: string; email?: string; role?: string }) => {
    setAuthUser(user);
    const normalized = normalizeUserRole(user.role);
    const destination = getRoleDashboardPath(normalized);

    setRedirectPath(destination);
    window.location.href = destination;
  };

  return (
    <main className="relative min-h-screen bg-[#09090B] text-white overflow-hidden flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Background Particles & Grid */}
      <BackgroundParticles />

      {/* Top Floating Back Link */}
      <div className="absolute top-6 left-6 z-30">
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-400 transition-all shadow-lg"
        >
          <ArrowLeft size={14} />
          Back to Homepage
        </a>
      </div>

      {/* Main Responsive Layout */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen z-10">
        {/* Left Side (60% Desktop / Top on Tablet / Hidden on Mobile) */}
        <div className="hidden md:block lg:col-span-7 h-full border-r border-white/5 bg-gradient-to-b from-[#09090B] via-[#0D0D18] to-[#09090B] relative">
          <AuthSceneCanvas />
        </div>

        {/* Right Side (40% Desktop / Bottom on Tablet / Fullscreen Mobile) */}
        <div className="lg:col-span-5 w-full min-h-screen flex items-center justify-center p-4 sm:p-8 lg:p-12 py-6 relative z-20">
          <AnimatePresence mode="wait">
            {!authUser ? (
              <AuthGlassCard onAuthSuccess={handleAuthSuccess} />
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-10 rounded-3xl border border-emerald-500/50 text-center space-y-6 max-w-md w-full shadow-2xl bg-emerald-950/20"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30 animate-bounce">
                  <CheckCircle2 size={48} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-extrabold text-white">
                    Welcome, {authUser.name || "Explorer"}!
                  </h2>
                  <p className="text-slate-300 text-sm">
                    Authenticated into <span className="text-cyan-400 font-bold">{authUser.role || "Student"}</span> workspace.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Logged in as: {authUser.email}</span>
                </div>

                <a
                  href={redirectPath}
                  className="inline-block px-8 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 glow-btn"
                >
                  {normalizeUserRole(authUser.role) === "SUPER_ADMIN"
                    ? "Enter Super Admin Console →"
                    : normalizeUserRole(authUser.role) === "COLLEGE_ADMIN"
                    ? "Enter College Admin Dashboard →"
                    : normalizeUserRole(authUser.role) === "DEPARTMENT_ADMIN"
                    ? "Enter Department Admin Dashboard →"
                    : normalizeUserRole(authUser.role) === "FACULTY"
                    ? "Enter Faculty Portal →"
                    : redirectPath === "/courses/catalog"
                    ? "Explore Available Courses →"
                    : "Enter Student Dashboard →"}
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
