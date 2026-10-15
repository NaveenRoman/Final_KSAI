"use client";

import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Code2,
  Layers3,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  Video,
  Zap,
} from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
} from "react";

type InterviewType =
  | "technical"
  | "coding"
  | "hr"
  | "mock";

const interviewTypes = [
  {
    id: "technical" as InterviewType,
    title: "Technical Interview",
    description:
      "Test programming knowledge, computer science fundamentals, and technical concepts.",
    icon: Code2,
  },
  {
    id: "coding" as InterviewType,
    title: "Coding Interview",
    description:
      "Solve coding problems and demonstrate your problem-solving ability.",
    icon: Target,
  },
  {
    id: "hr" as InterviewType,
    title: "HR Interview",
    description:
      "Practice behavioral, communication, and common HR interview questions.",
    icon: Users,
  },
  {
    id: "mock" as InterviewType,
    title: "AI Mock Interview",
    description:
      "Experience a complete interview simulation with adaptive AI questions.",
    icon: Video,
  },
];

const roles = [
  "Software Engineer",
  "Java Developer",
  "Python Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Android Developer",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
];

const technologies = [
  "Java",
  "Python",
  "C",
  "C++",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "SQL",
  "Data Structures & Algorithms",
];

const experienceLevels = [
  {
    id: "fresher",
    title: "Fresher",
    description: "Preparing for your first job.",
  },
  {
    id: "junior",
    title: "0–1 Years",
    description: "Early career professional.",
  },
  {
    id: "mid",
    title: "1–3 Years",
    description: "Building professional experience.",
  },
  {
    id: "senior",
    title: "3+ Years",
    description: "Experienced professional.",
  },
];

const difficulties = [
  {
    id: "beginner",
    title: "Beginner",
    description:
      "Fundamental concepts and straightforward questions.",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description:
      "Practical concepts and moderate problem solving.",
  },
  {
    id: "advanced",
    title: "Advanced",
    description:
      "Deep technical reasoning and challenging problems.",
  },
];

const questionCounts = [
  {
    value: 5,
    title: "Quick",
    description: "5 Questions",
    duration: "10–15 min",
  },
  {
    value: 10,
    title: "Standard",
    description: "10 Questions",
    duration: "20–30 min",
  },
  {
    value: 15,
    title: "Deep Practice",
    description: "15 Questions",
    duration: "35–45 min",
  },
];

interface SetupSectionProps {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SetupSection({
  number,
  title,
  description,
  children,
}: SetupSectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-xs font-bold text-cyan-400">
          {number}
        </div>

        <div>
          <h2 className="text-base font-bold text-white">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

interface SelectGridProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

function SelectGrid({
  value,
  options,
  onChange,
  icon: Icon,
}: SelectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => {
        const selected = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`group flex min-h-[54px] items-center justify-between rounded-xl border px-4 text-left transition-all ${
              selected
                ? "border-cyan-500/50 bg-cyan-500/[0.08] shadow-lg shadow-cyan-500/5"
                : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {Icon && (
                <Icon
                  size={16}
                  className={
                    selected
                      ? "text-cyan-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  }
                />
              )}

              <span
                className={`truncate text-sm font-medium ${
                  selected
                    ? "text-white"
                    : "text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {option}
              </span>
            </div>

            {selected && (
              <div className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400">
                <Check
                  size={12}
                  className="text-black"
                  strokeWidth={3}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function InterviewSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryType =
    searchParams.get("type") as InterviewType | null;

  const queryTechnology =
    searchParams.get("technology");

  const [interviewType, setInterviewType] =
    useState<InterviewType>(
      queryType &&
        interviewTypes.some(
          (item) => item.id === queryType
        )
        ? queryType
        : "technical"
    );

  const [role, setRole] =
    useState("Software Engineer");

  const [technology, setTechnology] =
    useState(
      queryTechnology &&
        technologies.includes(queryTechnology)
        ? queryTechnology
        : "Java"
    );

  const [experience, setExperience] =
    useState("fresher");

  const [difficulty, setDifficulty] =
    useState("intermediate");

  const [questionCount, setQuestionCount] =
    useState(10);

  useEffect(() => {
    if (
      queryType &&
      interviewTypes.some(
        (item) => item.id === queryType
      )
    ) {
      setInterviewType(queryType);
    }

    if (
      queryTechnology &&
      technologies.includes(queryTechnology)
    ) {
      setTechnology(queryTechnology);
    }
  }, [queryType, queryTechnology]);

  function startInterview() {
    const params = new URLSearchParams();

    params.set("type", interviewType);
    params.set("role", role);
    params.set("technology", technology);
    params.set("experience", experience);
    params.set("difficulty", difficulty);
    params.set("questions", String(questionCount));

    router.push(
      `/interview/session?${params.toString()}`
    );
  }

  const selectedQuestion =
    questionCounts.find(
      (item) => item.value === questionCount
    );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07070A] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-200px] h-[550px] w-[550px] rounded-full bg-blue-600/10 blur-[150px]" />

        <div className="absolute right-[-180px] top-[25%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 border-b border-white/10 bg-[#09090B]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-5 lg:px-8">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() => router.push("/interview")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Back to interviews"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Sparkles
                  size={15}
                  className="text-cyan-400"
                />

                <span className="font-bold">
                  Codenthra AI
                </span>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Interview Setup
              </p>
            </div>

          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <Zap
              size={14}
              className="text-cyan-400"
            />
            AI-powered interview
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-[1100px] px-5 py-8 md:py-10 lg:px-8">

        {/* Introduction */}
        <section className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Sparkles size={14} />
            Personalized Interview
          </div>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            Configure your interview
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            Tell Codenthra AI what you&apos;re preparing for.
            We&apos;ll use your selections to create an
            adaptive interview experience designed around
            your goals.
          </p>
        </section>

        {/* Interview Type */}
        <SetupSection
          number="01"
          title="Interview type"
          description="What kind of interview do you want to practice?"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {interviewTypes.map((item) => {
              const Icon = item.icon;
              const selected =
                interviewType === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setInterviewType(item.id)
                  }
                  className={`relative rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? "border-cyan-500/60 bg-cyan-500/[0.07] shadow-lg shadow-cyan-500/5"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  {selected && (
                    <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500">
                      <Check
                        size={14}
                        className="text-black"
                        strokeWidth={3}
                      />
                    </div>
                  )}

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      selected
                        ? "border-cyan-500/20 bg-cyan-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={
                        selected
                          ? "text-cyan-400"
                          : "text-slate-400"
                      }
                    />
                  </div>

                  <h3 className="mt-4 font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 pr-5 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </SetupSection>

        {/* Role */}
        <SetupSection
          number="02"
          title="Target role"
          description="Which role are you preparing for?"
        >
          <SelectGrid
            value={role}
            options={roles}
            onChange={setRole}
            icon={Briefcase}
          />
        </SetupSection>

        {/* Technology */}
        <SetupSection
          number="03"
          title="Technology"
          description="Which technology should Codenthra AI focus on?"
        >
          <SelectGrid
            value={technology}
            options={technologies}
            onChange={setTechnology}
            icon={Layers3}
          />
        </SetupSection>

        {/* Experience */}
        <SetupSection
          number="04"
          title="Experience level"
          description="Choose the level that best matches your current experience."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {experienceLevels.map((item) => {
              const selected =
                experience === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setExperience(item.id)
                  }
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "border-cyan-500/50 bg-cyan-500/[0.07]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${
                        selected
                          ? "text-white"
                          : "text-slate-300"
                      }`}
                    >
                      {item.title}
                    </span>

                    {selected && (
                      <Check
                        size={15}
                        className="text-cyan-400"
                      />
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </SetupSection>

        {/* Difficulty */}
        <SetupSection
          number="05"
          title="Difficulty"
          description="How challenging should the interview be?"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {difficulties.map((item) => {
              const selected =
                difficulty === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setDifficulty(item.id)
                  }
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? "border-cyan-500/50 bg-cyan-500/[0.07]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {item.title}
                    </span>

                    {selected && (
                      <Check
                        size={16}
                        className="text-cyan-400"
                      />
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </SetupSection>

        {/* Question Count */}
        <SetupSection
          number="06"
          title="Interview length"
          description="How many questions would you like to practice?"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {questionCounts.map((item) => {
              const selected =
                questionCount === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setQuestionCount(item.value)
                  }
                  className={`relative rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? "border-cyan-500/50 bg-cyan-500/[0.07]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  {selected && (
                    <div className="absolute right-4 top-4">
                      <Check
                        size={16}
                        className="text-cyan-400"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Timer
                      size={17}
                      className={
                        selected
                          ? "text-cyan-400"
                          : "text-slate-500"
                      }
                    />

                    <span className="font-bold">
                      {item.title}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">
                    {item.description}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.duration}
                  </p>
                </button>
              );
            })}
          </div>
        </SetupSection>

        {/* Summary */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Trophy
                size={16}
                className="text-cyan-400"
              />

              <h2 className="text-sm font-bold">
                Interview summary
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
            <div className="bg-[#0b0b0f] p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Type
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {
                  interviewTypes.find(
                    (item) =>
                      item.id === interviewType
                  )?.title
                }
              </p>
            </div>

            <div className="bg-[#0b0b0f] p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Role
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {role}
              </p>
            </div>

            <div className="bg-[#0b0b0f] p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Technology
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {technology}
              </p>
            </div>

            <div className="bg-[#0b0b0f] p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Questions
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {selectedQuestion?.value} ·{" "}
                {selectedQuestion?.duration}
              </p>
            </div>
          </div>
        </section>

        {/* Start */}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.06] to-blue-500/[0.04] p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles
                size={16}
                className="text-cyan-400"
              />

              <p className="text-sm font-bold">
                Ready to begin?
              </p>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Codenthra AI will generate your interview based
              on these preferences.
            </p>
          </div>

          <button
            type="button"
            onClick={startInterview}
            className="group flex shrink-0 items-center justify-center gap-3 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
          >
            Start Interview

            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>

        {/* Small footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-600">
          <Target size={12} />
          Your interview adapts to your selected level and goals.
        </div>

      </main>
    </div>
  );
}

export default function InterviewSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070A] text-white flex items-center justify-center">
          <div className="text-sm text-slate-400">
            Preparing interview setup...
          </div>
        </div>
      }
    >
      <InterviewSetupContent />
    </Suspense>
  );
}