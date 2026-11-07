"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeroCoreCanvas } from "../canvas/HeroCoreCanvas";
import { Sparkles, Play, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-28 pb-16 flex flex-col justify-center items-center overflow-x-hidden z-10">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Typography Column */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="lg:col-span-6 space-y-8 text-left z-20"
        >
          {/* Top Pill Badge */}
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:border-cyan-400/50 transition cursor-pointer group"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
              Codexa Showcase Edition
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-xs text-slate-300 flex items-center gap-1 group-hover:text-cyan-200 transition-colors">
              <Sparkles size={12} className="text-yellow-400" /> Click to Launch &rarr;
            </span>
          </Link>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            <span className="block text-white">Build Smarter.</span>
            <span className="block gradient-text-hero">Learn Faster.</span>
            <span className="block text-white">Work Together.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal max-w-xl">
            KnowledgeStream AI is an intelligent ecosystem for students, developers,
            companies, and educators that combines AI learning, coding assistance,
            workforce management, and productivity into one unified platform.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              href="/showcase"
              className="px-7 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 glow-btn flex items-center gap-2.5 group shadow-xl shadow-cyan-500/25 border border-cyan-400/40 hover:scale-105 transition-all"
            >
              <Sparkles size={18} className="text-cyan-300 animate-pulse" />
              <span>Launch Showcase</span>
              <ArrowRight size={17} className="group-hover:translate-x-1.5 transition-transform" />
            </Link>

            <a
              href="#pricing"
              className="px-6 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 flex items-center gap-2.5 group shadow-lg shadow-blue-500/15 transition-all"
            >
              Start Free
            </a>

            <a
              href="#demo"
              className="px-6 py-4 rounded-full text-base font-semibold text-slate-200 glass-panel hover:bg-white/10 hover:text-white border border-white/20 transition-all flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Play size={13} className="fill-cyan-400 ml-0.5" />
              </div>
              Watch Demo
            </a>
          </div>

          {/* Trust stats below buttons */}
          <div className="pt-6 border-t border-white/10 flex items-center gap-8 text-slate-400 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span>Instant AI Deployment</span>
            </div>
          </div>
        </motion.div>

        {/* Right 3D AI Core Column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="lg:col-span-6 h-[480px] sm:h-[580px] relative w-full flex items-center justify-center overflow-visible"
        >
          {/* Subtle Outer Frame Ring */}
          <div className="absolute inset-0 rounded-full border border-blue-500/10 animate-spin-slow pointer-events-none" />
          <HeroCoreCanvas />
        </motion.div>
      </div>
    </section>
  );
}
