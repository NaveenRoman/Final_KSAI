import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { getChallengeById, normalizeCourseSlug } from "@/lib/challenges/challenge-bank";
import { logAiTelemetry } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challengeId, course, chapter, code = "", error = "", requestType = "DEBUG", hintIndex = 0 } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: "challengeId is required" },
        { status: 400 }
      );
    }

    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Validate course matching if provided
    if (course && normalizeCourseSlug(course) !== challenge.course) {
      return NextResponse.json(
        { error: `Challenge '${challengeId}' belongs to '${challenge.course}', not '${course}'` },
        { status: 400 }
      );
    }

    // Validate chapter matching if provided
    if (chapter !== undefined && chapter !== null && String(chapter).trim() !== "") {
      const parsedCh = parseInt(String(chapter).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsedCh) && parsedCh !== challenge.chapterOrder) {
        return NextResponse.json(
          { error: `Challenge '${challengeId}' belongs to chapter ${challenge.chapterOrder}, not chapter ${parsedCh}` },
          { status: 400 }
        );
      }
    }

    // Authenticate
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user) {
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
        if (session && new Date() < session.expiresAt) {
          user = session.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 1. If request is for curated hints
    if (requestType === "HINT") {
      const hints = challenge.hints || [];
      const currentHint =
        hints[Math.min(hintIndex, hints.length - 1)] ||
        "Carefully check your input parsing and edge case handling.";

      return NextResponse.json({
        success: true,
        hint: currentHint,
        hintIndex,
        totalHints: hints.length,
        hasMoreHints: hintIndex + 1 < hints.length,
      });
    }

    // 2. AI Bug Detection & Explanation
    const prompt = `You are KnowledgeStream AI's senior programming tutor.
A student is attempting the challenge: "${challenge.title}" in ${challenge.course.toUpperCase()}.

Challenge Description:
${challenge.description}

Objective:
${challenge.objective}

Student's Current Code:
\`\`\`${challenge.course}
${code}
\`\`\`

Execution / Compiler Output:
${error || "Code did not produce expected output for test cases."}

PEDAGOGICAL RULES:
1. Do NOT write the complete final solution for the student.
2. Clearly explain what the compiler or logical error means in plain English.
3. Point out the specific line or logic where the mismatch occurs.
4. Give a concrete 1-2 sentence hint on how to fix it without giving away the full code.
5. Use an encouraging, constructive tone.`;

    let telemetryLogged = false;
    const fetchStartTime = Date.now();
    try {
      const teachUrl = process.env.DJANGO_TEACH_URL || "http://127.0.0.1:8000/api/ai/teach/";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.INTERNAL_API_SECRET) {
        headers["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
      }

      const aiResponse = await fetch(teachUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          course: challenge.course,
          chapter: String(challenge.chapterOrder),
          topic: challenge.title,
          mode: "challenge_debug",
          question: prompt,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - fetchStartTime;

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();

        if (!telemetryLogged) {
          telemetryLogged = true;
          const promptTokens = typeof aiData?.usage?.prompt_tokens === "number" ? aiData.usage.prompt_tokens : null;
          const completionTokens = typeof aiData?.usage?.completion_tokens === "number" ? aiData.usage.completion_tokens : null;
          logAiTelemetry({
            timestamp: new Date().toISOString(),
            service: "challenge-help",
            studentId: user?.id || "anonymous",
            provider: aiData?.provider || (aiData?.data?.provider) || "django",
            model: aiData?.model || (aiData?.data?.model) || "django-teaching-engine",
            attempt: 1,
            latencyMs,
            status: 200,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
          });
        }

        const advice = aiData.explanation || aiData.message || aiData.response;
        if (advice) {
          return NextResponse.json({
            success: true,
            advice,
            hints: challenge.hints,
          });
        }
      } else {
        if (!telemetryLogged) {
          telemetryLogged = true;
          logAiTelemetry({
            timestamp: new Date().toISOString(),
            service: "challenge-help",
            studentId: user?.id || "anonymous",
            provider: "django",
            model: "django-teaching-engine",
            attempt: 1,
            latencyMs,
            status: aiResponse.status,
            inputTokens: null,
            outputTokens: null,
            error: `HTTP ${aiResponse.status}`,
          });
        }
      }
    } catch (fetchErr: any) {
      const latencyMs = Date.now() - fetchStartTime;
      if (!telemetryLogged) {
        telemetryLogged = true;
        logAiTelemetry({
          timestamp: new Date().toISOString(),
          service: "challenge-help",
          studentId: user?.id || "anonymous",
          provider: "django",
          model: "django-teaching-engine",
          attempt: 1,
          latencyMs,
          status: 502,
          inputTokens: null,
          outputTokens: null,
          error: fetchErr instanceof Error ? fetchErr.message : "Teach backend timeout/unavailable",
        });
      }
      // Fall through to heuristic guidance
    }

    // Heuristic fallback guidance
    let fallbackAdvice = `Check your implementation against the challenge requirements:
- Ensure input is parsed using standard I/O (Scanner, cin, scanf, or input()).
- Verify that your output format matches the examples precisely (check spaces and newlines).
- Check if edge cases (such as 0, negative values, or boundary conditions) are handled.`;

    if (error.includes("cannot find symbol") || error.includes("undeclared")) {
      fallbackAdvice = "The compiler detected an undeclared variable or method. Check for typographical errors and ensure all variables are declared before use.";
    } else if (error.includes("NullPointerException") || error.includes("Segmentation fault")) {
      fallbackAdvice = "A null or unallocated memory reference occurred. Check that arrays and objects are instantiated before accessing indices or members.";
    } else if (error.includes("IndexOutOfBoundsException") || error.includes("IndexError")) {
      fallbackAdvice = "Your code accessed an index outside the valid array bounds. Verify your loop bounds and array size checks.";
    }

    return NextResponse.json({
      success: true,
      advice: fallbackAdvice,
      hints: challenge.hints,
    });
  } catch (error: any) {
    console.error("AI Challenge Help Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process AI help request" },
      { status: 500 }
    );
  }
}
