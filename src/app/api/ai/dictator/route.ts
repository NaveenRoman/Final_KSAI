import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { db } from "@/lib/db";

export async function POST(request: Request) {
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

    const response = await fetch("http://127.0.0.1:8000/api/ai/dictate/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { success: false, message: text || "Invalid response from AI Dictator backend." };
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
    console.error("Next Dictator API Error:", error);

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
