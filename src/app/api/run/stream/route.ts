import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Interactive execution route (SSE).
 *
 * Temporarily disabled for launch verification. Direct Docker spawning
 * and host execution are completely excised.
 */
export async function POST(request: Request) {
  return NextResponse.json(
    {
      success: false,
      output:
        "Interactive terminal execution is temporarily offline for launch verification. Please use standard code execution via the Run action.",
      error: "INTERACTIVE_EXECUTION_OFFLINE",
      exitCode: 503,
      infrastructureError: true,
    },
    { status: 503 }
  );
}

