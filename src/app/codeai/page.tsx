"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CodeAiRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/codexai");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-white/50 text-sm font-mono animate-pulse">
      Redirecting to Codenthra AI...
    </div>
  );
}
