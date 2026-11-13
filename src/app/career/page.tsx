"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Briefcase,
  Target,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
  Zap,
  BookOpen,
} from "lucide-react";
import { CareerAnalysisResult, CareerRoleDefinition } from "@/lib/career/types";

export default function CareerPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "student@ksai.edu";

  const [roles, setRoles] = useState<CareerRoleDefinition[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("python-backend-engineer");
  const [analysis, setAnalysis] = useState<CareerAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Roles
  useEffect(() => {
    fetch("/api/career/roles")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setRoles(json.data);
        }
      })
      .catch((e) => console.error("Failed to load career roles:", e));
  }, []);

  // Load Analysis for Selected Role
  useEffect(() => {
    if (!userEmail) return;

    let isMounted = true;
    setLoading(true);

    fetch(
      `/api/career/analysis?userEmail=${encodeURIComponent(userEmail)}&roleId=${encodeURIComponent(selectedRoleId)}`
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.success && isMounted) {
          setAnalysis(json.data);
        }
      })
      .catch((e) => console.error("Failed to load career analysis:", e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userEmail, selectedRoleId]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 md:p-10 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] flex items-center gap-3">
          <Briefcase className="text-[var(--brand-blue)]" size={32} />
          Career Intelligence Engine
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Evidence-backed career readiness analysis powered by your Knowledge Graph.
        </p>
      </div>

      {/* Target Role Selector */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRoleId(role.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedRoleId === role.id
                ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white shadow-xs"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            }`}
          >
            {role.title}
          </button>
        ))}
      </div>

      {loading || !analysis ? (
        <div className="p-12 text-center text-[var(--text-muted)] flex flex-col items-center gap-2">
          <Sparkles className="animate-spin text-[var(--brand-blue)]" size={24} />
          <span className="text-sm">Calculating grounded career readiness metrics...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Readiness Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Target Role
              </span>
              <h3 className="text-base font-black text-[var(--text-primary)] mt-1">{analysis.role.title}</h3>
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                {analysis.role.category}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Overall Preparation
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[var(--brand-blue)]">
                  {analysis.readiness.overallReadiness}%
                </span>
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  {analysis.readiness.readinessLevel.replace("_", " ")}
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-cyan)] rounded-full transition-all duration-500"
                  style={{ width: `${analysis.readiness.overallReadiness}%` }}
                />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Verified Skills Met
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-emerald-400">
                  {analysis.readiness.metSkillsCount}
                </span>
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  / {analysis.readiness.totalSkillsCount} Skills
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">Based on Knowledge Graph mastery $\ge 80\%$</p>
            </div>

            <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Critical Gaps
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-amber-400">
                  {analysis.readiness.criticalGapsCount}
                </span>
                <span className="text-xs font-bold text-[var(--text-muted)]">Areas to Prioritize</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">Directing targeted learning path</p>
            </div>
          </div>

          {/* Skill Gap Analysis & Roadmap Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Skill Gaps Breakdown */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Target size={16} className="text-[var(--brand-blue)]" />
                Required Skills & Evidence Gaps
              </h3>

              <div className="space-y-3">
                {analysis.skillGaps.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-amber-500/30 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{skill.skillName}</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                        {skill.currentScore}% / {skill.targetScore}%
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)]">{skill.recommendedAction}</p>
                  </div>
                ))}

                {analysis.strongSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-emerald-500/30 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{skill.skillName}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        {skill.currentScore}% (Met)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{skill.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Career Roadmap */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Layers size={16} className="text-[var(--brand-blue)]" />
                Evidence-Based Career Roadmap
              </h3>

              <div className="space-y-3">
                {analysis.roadmap.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--brand-blue)] to-[var(--brand-cyan)] text-white flex items-center justify-center text-xs font-bold">
                          {step.stepNumber}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{step.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                        ~{step.estimatedHours} hrs
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] pl-8 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
