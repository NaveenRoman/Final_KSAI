import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { executeCode } from "@/lib/code-execution";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contestId: string; challengeId: string }> }
) {
  try {
    const { contestId, challengeId } = await params;
    const body = await req.json().catch(() => ({}));
    const { code = "", language = "javascript" } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Code cannot be empty." }, { status: 400 });
    }

    // 1. Resolve student session user
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user) {
      try {
        const cookieStore = await cookies();
        const sessionToken =
          cookieStore.get("better-auth.session_token")?.value ||
          cookieStore.get("sessionToken")?.value;

        if (sessionToken) {
          const rawToken = parseSessionToken(sessionToken);
          const session = await db.session.findUnique({
            where: { token: rawToken },
            include: { user: true },
          });
          user = session?.user ?? null;
        }
      } catch {
        // Fallback for non-standard request contexts
      }
    }

    if (!user) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:better-auth\.session_token|sessionToken)=([^;]+)/);
      if (match && match[1]) {
        const rawToken = parseSessionToken(decodeURIComponent(match[1]));
        const session = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        user = session?.user ?? null;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Resolve challenge
    const challenge = await db.challenge.findFirst({
      where: {
        id: challengeId,
        contestId,
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge or Contest not found" }, { status: 404 });
    }

    // Parse test cases
    let testCasesList: Array<{ input?: unknown }> = [];
    try {
      if (typeof challenge.testCases === "string") {
        testCasesList = JSON.parse(challenge.testCases);
      } else if (Array.isArray(challenge.testCases)) {
        testCasesList = challenge.testCases;
      }
    } catch {
      testCasesList = [];
    }

    if (!Array.isArray(testCasesList) || testCasesList.length === 0) {
      return NextResponse.json({ error: "No test cases found for challenge" }, { status: 400 });
    }

    const testResults = [];
    for (let i = 0; i < testCasesList.length; i++) {
      const tc = testCasesList[i];
      const stdinInput = tc.input !== undefined && tc.input !== null ? String(tc.input) : "";

      const execRes = await executeCode({
        code,
        language,
        studentId: user.id,
        stdin: stdinInput,
      });

      testResults.push({
        testCaseIndex: i + 1,
        input: stdinInput,
        actualOutput: execRes.stdout.trim(),
        stderr: execRes.stderr,
        error: execRes.error || null,
        success: execRes.success,
      });
    }

    return NextResponse.json({
      success: true,
      language,
      testResults,
    });
  } catch (error) {
    console.error("POST Run Code Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
