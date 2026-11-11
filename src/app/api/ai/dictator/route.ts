import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { db } from "@/lib/db";
import { logAiTelemetry } from "@/lib/ai/gemini-client";

export async function POST(request: Request) {
  const startTime = Date.now();
  let studentId = "anonymous";
  let telemetryLogged = false;

  try {
    const body = await request.json();

    // Optionally enrich with student's active learning memory if authenticated
    if (!body.learningMemory) {
      try {
        const cookieStore = await cookies();
        const sessionTokenRaw =
          cookieStore.get("better-auth.session_token")?.value ||
          cookieStore.get("sessionToken")?.value;

        const session = await auth.api.getSession({
          headers: await headers(),
        });

        let user = session?.user as any;
        if (!user && sessionTokenRaw) {
          const rawToken = parseSessionToken(sessionTokenRaw);
          const dbSession = await db.session.findUnique({
            where: { token: rawToken },
            include: { user: true },
          });
          if (dbSession && new Date() < dbSession.expiresAt) {
            user = dbSession.user;
          }
        }

        if (user) {
          studentId = user.id;
          const lang = (body.language || "python").toLowerCase();
          const topicName = body.topic || body.project || "";

          const topicProfile = await db.topicProgress.findFirst({
            where: {
              userId: user.id,
              courseId: lang,
              ...(topicName ? { topic: { contains: topicName.replace(/^[\d\.\-\s:]+/, "").trim() } } : {}),
            },
            orderBy: { updatedAt: "desc" },
          });

          if (topicProfile && topicProfile.recommendedDifficulty) {
            body.studentCategory = body.studentCategory || topicProfile.recommendedDifficulty;
            body.learningGroup = (body.studentCategory || topicProfile.recommendedDifficulty).toUpperCase();
            body.practiceLevel = body.practiceLevel || (topicProfile.recommendedDifficulty === "ADVANCED" ? "3" : topicProfile.recommendedDifficulty === "INTERMEDIATE" ? "2" : "1");
          }

          const progress = await db.topicProgress.findMany({
            where: { userId: user.id },
            take: 5,
            orderBy: { updatedAt: "desc" },
          });
          if (progress && progress.length > 0) {
            const struggles = progress
              .filter((p) => p.status === "NEEDS_REVIEW" || p.status === "STRUGGLING")
              .map((p) => p.topic)
              .join(", ");
            if (struggles) {
              body.learningMemory = `Recent struggle topics: ${struggles}. Provide gentle support on these.`;
            }
          }
        }
      } catch {
        // Non-blocking enrichment
      }
    }

    const dictateUrl =
      process.env.DJANGO_DICTATE_URL ||
      (process.env.DJANGO_TEACH_URL
        ? process.env.DJANGO_TEACH_URL.replace(/\/ai\/teach\/?$/, "/ai/dictate/")
        : "http://127.0.0.1:8000/api/ai/dictate/");

    const backendHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.INTERNAL_API_SECRET) {
      backendHeaders["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
    }

    const response = await fetch(dictateUrl, {
      method: "POST",
      headers: backendHeaders,
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { success: false, message: text || "Invalid response from AI Dictator backend." };
    }

    // Telemetry capture for Django proxy execution (single-event guarantee)
    if (!telemetryLogged) {
      telemetryLogged = true;
      const promptTokens = typeof result?.usage?.prompt_tokens === "number" ? result.usage.prompt_tokens : null;
      const completionTokens = typeof result?.usage?.completion_tokens === "number" ? result.usage.completion_tokens : null;
      logAiTelemetry({
        timestamp: new Date().toISOString(),
        service: "dictate",
        studentId,
        provider: result?.provider || (result?.data?.provider) || "django",
        model: result?.model || (result?.data?.model) || "django-dictator",
        attempt: 1,
        latencyMs,
        status: response.status,
        error: response.ok ? undefined : (result?.message || `HTTP ${response.status}`),
        inputTokens: promptTokens,
        outputTokens: completionTokens,
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message || `Dictator backend request failed with status ${response.status}.`,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error("Next Dictator API Error:", error);

    if (!telemetryLogged) {
      telemetryLogged = true;
      logAiTelemetry({
        timestamp: new Date().toISOString(),
        service: "dictate",
        studentId,
        provider: "django",
        model: "django-dictator",
        attempt: 1,
        latencyMs,
        status: 502,
        inputTokens: null,
        outputTokens: null,
        error: error.message || "Unable to connect to Dictator backend.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to connect to Dictator backend.",
      },
      {
        status: 502,
      }
    );
  }
}
