import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return NextResponse.json({
    success: true,
    message: "Interactive sessions offline for launch verification.",
  });
}

