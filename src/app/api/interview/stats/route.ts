import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    // 1. Resolve requesting user
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

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // 2. Fetch authenticated user's current streak and details
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { currentStreak: true, longestStreak: true },
    });

    // 3. Query all authentic INTERVIEW_COMPLETE logs for this user
    const interviewLogs = await db.activityLog.findMany({
      where: {
        userId: user.id,
        actionType: "INTERVIEW_COMPLETE",
      },
      orderBy: { createdAt: "desc" },
    });

    const totalInterviews = interviewLogs.length;

    // Parse metadata
    const parsedSessions = interviewLogs.map((log) => {
      let meta: any = {};
      try {
        meta = log.metadata ? JSON.parse(log.metadata) : {};
      } catch {
        meta = {};
      }
      return {
        id: log.id,
        createdAt: log.createdAt,
        title: meta.title || "AI Mock Interview",
        type: meta.interviewType || "technical",
        score: typeof meta.score === "number" ? meta.score : 0,
        technicalScore: typeof meta.technicalScore === "number" ? meta.technicalScore : meta.score || 0,
        communicationScore: typeof meta.communicationScore === "number" ? meta.communicationScore : meta.score || 0,
        relevanceScore: typeof meta.relevanceScore === "number" ? meta.relevanceScore : meta.score || 0,
        technology: meta.technology || "General",
        completedQuestions: meta.completedQuestions || 1,
        totalQuestions: meta.totalQuestions || 1,
      };
    });

    // Calculate overall interview readiness score
    const readinessScore =
      totalInterviews > 0
        ? Math.round(parsedSessions.reduce((acc, s) => acc + s.score, 0) / totalInterviews)
        : null;

    // Calculate skill scores
    const technicalSessions = parsedSessions.filter((s) => s.type === "technical" || s.type === "coding");
    const codingSessions = parsedSessions.filter((s) => s.type === "coding");
    const hrSessions = parsedSessions.filter((s) => s.type === "hr");

    const technicalScore =
      technicalSessions.length > 0
        ? Math.round(technicalSessions.reduce((acc, s) => acc + s.technicalScore, 0) / technicalSessions.length)
        : null;

    const codingScore =
      codingSessions.length > 0
        ? Math.round(codingSessions.reduce((acc, s) => acc + s.score, 0) / codingSessions.length)
        : null;

    const communicationScore =
      totalInterviews > 0
        ? Math.round(parsedSessions.reduce((acc, s) => acc + s.communicationScore, 0) / totalInterviews)
        : null;

    const hrScore =
      hrSessions.length > 0
        ? Math.round(hrSessions.reduce((acc, s) => acc + s.score, 0) / hrSessions.length)
        : null;

    // Format recent interviews with readable dates
    const recentInterviews = parsedSessions.slice(0, 5).map((s) => {
      const diffMs = Date.now() - new Date(s.createdAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let dateLabel = "Today";
      if (diffDays === 1) dateLabel = "Yesterday";
      else if (diffDays > 1) dateLabel = `${diffDays} days ago`;

      return {
        id: s.id,
        title: s.title,
        type:
          s.type === "hr"
            ? "HR"
            : s.type === "coding"
            ? "Coding"
            : s.type === "mock"
            ? "Mock"
            : "Technical",
        score: s.score,
        date: dateLabel,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalInterviews,
        readinessScore,
        currentStreak: dbUser?.currentStreak || 0,
        longestStreak: dbUser?.longestStreak || 0,
        skills: {
          technical: technicalScore,
          coding: codingScore,
          communication: communicationScore,
          hr: hrScore,
        },
        recentInterviews,
      },
    });
  } catch (error: any) {
    console.error("Get Interview Stats API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load interview metrics" },
      { status: 500 }
    );
  }
}
