import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return NextResponse.json(
    {
      success: false,
      message: "Interactive terminal execution is temporarily offline for launch verification.",
      error: "INTERACTIVE_EXECUTION_OFFLINE",
    },
    { status: 503 }
  );
}

