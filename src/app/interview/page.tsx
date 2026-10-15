"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Code2,
  Flame,
  MessageSquare,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
  Zap,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ElementType } from "react";


const interviewTypes = [
  {
    id: "technical",
    title: "Technical Interview",
    description:
      "Test your programming knowledge, CS fundamentals, and technical concepts.",
    icon: Code2,
    level: "Beginner → Advanced",
    questions: "AI-generated questions",
  },
  {
    id: "coding",
    title: "Coding Interview",
    description:
      "Solve coding problems and demonstrate your problem-solving ability.",
    icon: Brain,
    level: "Easy → Hard",
    questions: "Live coding",
  },
  {
    id: "hr",
    title: "HR Interview",
    description:
      "Practice common HR and behavioral questions with an AI interviewer.",
    icon: Briefcase,
    level: "Beginner → Advanced",
    questions: "Behavioral questions",
  },
  {
    id: "mock",
    title: "AI Mock Interview",
    description:
      "Experience a complete interview simulation with technical and HR rounds.",
    icon: Video,
    level: "Real interview",
    questions: "Adaptive interview",
  },
];


const technologies = [
  "Java",
  "Python",
  "C",
  "C++",
  "JavaScript",
  "React",
  "Node.js",
  "SQL",
  "Data Structures",
  "Algorithms",
];


export default function InterviewPage() {
  const router = useRouter();

  const [stats, setStats] = useState<{
    totalInterviews: number;
    readinessScore: number | null;
    currentStreak: number;
    longestStreak: number;
    skills: {
      technical: number | null;
      coding: number | null;
      communication: number | null;
      hr: number | null;
    };
    recentInterviews: Array<{
      id: string;
      title: string;
      type: string;
      score: number;
      date: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/interview/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && isMounted) {
          setStats(json.data);
        }
      })
      .catch((err) => console.error("Failed to load interview stats:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07070A] text-white overflow-x-hidden">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">

        <div className="absolute top-[-180px] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px]" />

        <div className="absolute top-[20%] right-[-150px] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[140px]" />

        <div className="absolute bottom-[-200px] left-[35%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[140px]" />

      </div>


      {/* =====================================================
          TOP NAVIGATION
      ====================================================== */}

      <header className="relative z-10 h-16 border-b border-white/10 bg-[#09090B]/80 backdrop-blur-xl">

        <div className="h-full max-w-[1500px] mx-auto px-5 lg:px-8 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <ArrowLeft size={17} />
            </button>


            <div>

              <div className="flex items-center gap-2">

                <Sparkles
                  size={16}
                  className="text-cyan-400"
                />

                <span className="font-bold">
                  KnowledgeStream AI
                </span>

              </div>

              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Interview Center
              </p>

            </div>

          </div>


          <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">

            <span className="flex items-center gap-2">
              <Flame
                size={14}
                className="text-orange-400"
              />
              {stats?.currentStreak ?? 0} Day Streak
            </span>

            <span className="flex items-center gap-2">
              <Trophy
                size={14}
                className="text-yellow-400"
              />
              {stats?.totalInterviews ?? 0} Interviews
            </span>

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="relative z-10 max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        {/* ===================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-blue-950/50 via-purple-950/20 to-cyan-950/20 p-7 md:p-10 mb-8">

          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full" />

          <div className="relative max-w-3xl">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-[11px] font-bold mb-5">

              <Sparkles size={13} />

              CODENTHRA AI INTERVIEWER

            </div>


            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">

              Prepare for your

              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                {" "}next interview.
              </span>

            </h1>


            <p className="mt-4 text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl">

              Practice with an adaptive AI interviewer that asks questions,
              evaluates your answers, identifies weak areas, and helps you
              become interview-ready.

            </p>


            <div className="flex flex-wrap gap-3 mt-7">

              <button
                onClick={() => router.push("/interview/setup")}
                className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-blue-900/20 hover:scale-[1.02] transition"
              >

                <Play
                  size={17}
                  className="fill-current"
                />

                Start AI Mock Interview

                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition"
                />

              </button>


              <button
                onClick={() => {
                  document
                    .getElementById("interview-types")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm transition"
              >
                Explore Interviews
              </button>

            </div>

          </div>

        </section>


        {/* ===================================================
            READINESS OVERVIEW
        ==================================================== */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

          {/* Overall score */}

          <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Interview Readiness
                </p>

                <h2 className="text-4xl font-black mt-2">
                  {stats?.readinessScore !== null && stats?.readinessScore !== undefined
                    ? `${stats.readinessScore}%`
                    : "—"}
                </h2>

              </div>


              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">

                <Target
                  size={25}
                  className="text-cyan-400"
                />

              </div>

            </div>


            <div className="mt-5 h-2 rounded-full bg-white/5 overflow-hidden">

              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${stats?.readinessScore ?? 0}%`,
                }}
              />

            </div>


            <p className="text-xs text-slate-500 mt-3">
              {stats?.readinessScore !== null && stats?.readinessScore !== undefined
                ? "Based on your verified AI interview sessions. Keep practicing to reach interview-ready status."
                : "Complete your first AI mock interview to calculate your interview readiness rating."}
            </p>

          </div>


          {/* Skill cards */}

          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">

            <SkillCard
              title="Technical"
              score={stats?.skills?.technical ?? null}
              icon={Code2}
            />

            <SkillCard
              title="Coding"
              score={stats?.skills?.coding ?? null}
              icon={Brain}
            />

            <SkillCard
              title="Communication"
              score={stats?.skills?.communication ?? null}
              icon={MessageSquare}
            />

            <SkillCard
              title="HR"
              score={stats?.skills?.hr ?? null}
              icon={Users}
            />

          </div>

        </section>


        {/* ===================================================
            INTERVIEW TYPES
        ==================================================== */}

        <section
          id="interview-types"
          className="mb-10"
        >

          <div className="flex items-end justify-between mb-5">

            <div>

              <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
                Practice
              </p>

              <h2 className="text-2xl font-black mt-1">
                Choose your interview
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Practice the skills that matter for your next opportunity.
              </p>

            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

            {interviewTypes.map((item) => {

              const Icon = item.icon;

              return (

                <button
                  key={item.id}
                  onClick={() =>
                    router.push(
                      `/interview/setup?type=${item.id}`
                    )
                  }
                  className="group text-left rounded-3xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] hover:border-blue-500/40 p-5 transition-all hover:-translate-y-1"
                >

                  <div className="flex items-start justify-between">

                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">

                      <Icon
                        size={21}
                        className="text-cyan-400"
                      />

                    </div>


                    <ChevronRight
                      size={17}
                      className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition"
                    />

                  </div>


                  <h3 className="font-bold text-base mt-5">
                    {item.title}
                  </h3>


                  <p className="text-xs text-slate-500 leading-relaxed mt-2 min-h-[58px]">
                    {item.description}
                  </p>


                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">

                    <span className="text-[10px] text-slate-500">
                      {item.level}
                    </span>

                    <span className="text-[10px] text-cyan-400 font-semibold">
                      {item.questions}
                    </span>

                  </div>

                </button>

              );

            })}

          </div>

        </section>


        {/* ===================================================
            TECHNOLOGY PRACTICE
        ==================================================== */}

        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7 mb-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

            <div>

              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">
                Technical Preparation
              </p>

              <h2 className="text-xl font-black mt-1">
                Practice by technology
              </h2>

            </div>


            <button
              onClick={() =>
                router.push("/interview/setup?type=technical")
              }
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </button>

          </div>


          <div className="flex flex-wrap gap-2">

            {technologies.map((technology) => (

              <button
                key={technology}
                onClick={() =>
                  router.push(
                    `/interview/setup?type=technical&technology=${encodeURIComponent(
                      technology
                    )}`
                  )
                }
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/5 transition"
              >
                {technology}
              </button>

            ))}

          </div>

        </section>


        {/* ===================================================
            BOTTOM GRID
        ==================================================== */}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Recent interviews */}

          <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.025] overflow-hidden">

            <div className="p-6 border-b border-white/10 flex items-center justify-between">

              <div>

                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Practice History
                </p>

                <h2 className="text-xl font-black mt-1">
                  Recent interviews
                </h2>

              </div>


              <button className="text-xs text-cyan-400 font-bold">
                View history
              </button>

            </div>


            <div className="divide-y divide-white/5">

              {stats?.recentInterviews && stats.recentInterviews.length > 0 ? (
                stats.recentInterviews.map((interview) => (

                  <div
                    key={interview.id || interview.title}
                    className="p-5 flex items-center gap-4 hover:bg-white/[0.02] transition"
                  >

                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">

                      <BarChart3
                        size={18}
                        className="text-blue-400"
                      />

                    </div>


                    <div className="flex-1 min-w-0">

                      <h3 className="text-sm font-bold truncate">
                        {interview.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {interview.type} • {interview.date}
                      </p>

                    </div>


                    <div className="text-right">

                      <p className="text-lg font-black">
                        {interview.score}%
                      </p>

                      <p className="text-[10px] text-slate-500">
                        Score
                      </p>

                    </div>


                    <ChevronRight
                      size={16}
                      className="text-slate-600"
                    />

                  </div>

                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <BarChart3 size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-400">No interviews completed yet</p>
                  <p className="text-xs text-slate-500 mt-1">Start your first technical, coding, or HR mock interview above.</p>
                </div>
              )}

            </div>

          </div>


          {/* Recommended */}

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/30 to-blue-950/20 p-6">

            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">

              <Zap
                size={20}
                className="text-purple-400"
              />

            </div>


            <h2 className="text-xl font-black mt-5">
              Your next focus
            </h2>


            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Based on your recent performance, improving communication
              and technical follow-up answers can increase your interview score.
            </p>


            <div className="mt-5 space-y-3">

              <Recommendation
                text="Practice 5 Java interview questions"
              />

              <Recommendation
                text="Complete one coding challenge"
              />

              <Recommendation
                text="Take an AI mock interview"
              />

            </div>


            <button
              onClick={() =>
                router.push("/interview/setup?type=mock")
              }
              className="w-full mt-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold transition"
            >
              Continue Preparation
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}


/* =========================================================
   SKILL CARD
========================================================= */

function SkillCard({
  title,
  score,
  icon: Icon,
}: {
  title: string;
  score: number | null;
  // Icon components can have varying props (e.g., size, className). Use any to allow passing size:number
  icon: any;
}) {

  return (

    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">

      <div className="flex items-center justify-between">

        <Icon
          size ={18}
          className ="text-slate-500"
        />

        <span className="text-lg font-black">
          {score !== null && score !== undefined ? `${score}%` : "—"}
        </span>

      </div>


      <p className="text-xs text-slate-400 mt-5">
        {title}
      </p>


      <div className="h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">

        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{
            width: `${score ?? 0}%`,
          }}
        />

      </div>

    </div>

  );
}


/* =========================================================
   RECOMMENDATION
========================================================= */

function Recommendation({
  text,
}: {
  text: string;
}) {

  return (

    <div className="flex items-center gap-3">

      <CheckCircle2
        size={16}
        className="text-cyan-400 shrink-0"
      />

      <span className="text-xs text-slate-300">
        {text}
      </span>

    </div>

  );
}