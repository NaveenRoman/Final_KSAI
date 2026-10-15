"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightAIPanel } from "@/components/dashboard/RightAIPanel";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { Sparkles, Terminal, Code2, Cpu, MessageSquare } from "lucide-react";

export default function CodenthraAIPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        setUser({
          id: (session.user as any).id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: (session.user as any).role ?? "Student",
        });
      } else {
        router.push("/auth");
      }
    }
  }, [session, isPending, router]);

  const handleTabChange = (_tab: string) => {
    // LeftSidebar handles global navigation directly
  };

  return (
    <div className="h-screen bg-[#09090B] text-white flex flex-col selection:bg-cyan-500 selection:text-black overflow-hidden font-sans">
      <TopNavbar
        userName={user?.name || "Loading..."}
        userRole={user?.role || "Student"}
      />

      <div className="flex-1 flex w-full overflow-hidden">
        <LeftSidebar activeTab="AI Mentor" onTabChange={handleTabChange} />

        <main className="flex-1 overflow-y-auto h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full custom-scrollbar">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-2 bg-gradient-to-r from-purple-950/40 via-blue-950/20 to-cyan-950/30 shadow-2xl relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold border border-purple-500/20">
              <Sparkles size={13} /> Codenthra AI &bull; Advanced Coding Partner
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Welcome to Codenthra AI 🤖
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Your next-generation interactive AI coding assistant and peer programmer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-white/5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Code2 size={24} />
              </div>
              <h2 className="text-lg font-bold">Smart Code Synthesis</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Generate high-quality code snippets, boilerplate, or explain complex logic in real-time. Simply prompt Codenthra AI to write cleaner programs.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-white/5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Terminal size={24} />
              </div>
              <h2 className="text-lg font-bold">Interactive Sandbox & Debugger</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Analyze and run code in isolated cloud containers. Detect syntax errors, time complexity issues, and memory leaks automatically.
              </p>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent text-center space-y-4">
            <Cpu className="mx-auto text-cyan-400 animate-pulse" size={40} />
            <h3 className="text-lg font-bold">Next-Gen Interface is Under Construction</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
              We are fine-tuning our AST parser and multi-agent code compilation models. Codenthra AI workspace features will launch shortly!
            </p>
          </div>

          <DashboardFooter />
        </main>

        <RightAIPanel />
      </div>
    </div>
  );
}
