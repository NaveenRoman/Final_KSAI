import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { getUserActiveSubscription, checkCourseAccess } from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate user strictly from server session
    const sessionData = await auth.api.getSession({
      headers: await headers().catch(() => req.headers),
    });
    let user = sessionData?.user ?? null;

    if (!user) {
      const cookieStore = await cookies();
      const sessionTokenRaw =
        cookieStore.get("better-auth.session_token")?.value ||
        cookieStore.get("__Secure-better-auth.session_token")?.value ||
        cookieStore.get("better-auth.session-token")?.value ||
        cookieStore.get("sessionToken")?.value;

      if (sessionTokenRaw) {
        const rawToken = parseSessionToken(sessionTokenRaw);
        const dbSession = await db.session.findUnique({
          where: { token: rawToken },
          include: { user: true },
        });
        if (dbSession && new Date() < dbSession.expiresAt) {
          user = dbSession.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", enrollments: [] },
        { status: 401 }
      );
    }

    // Prevent parameter spoofing: if client supplied email query param, verify it matches
    const { searchParams } = new URL(req.url);
    const requestedEmail = searchParams.get("email");
    if (requestedEmail && user.email && requestedEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Cannot access courses of another user.", enrollments: [] },
        { status: 403 }
      );
    }

    const activeSub = await getUserActiveSubscription(user.id);

    const enrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });

    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enr) => {
        const access = await checkCourseAccess(user.id, enr.course.language || enr.course.id);
        return {
          ...enr,
          hasCourseAccess: access.hasAccess,
          accessReason: access.reason ?? null,
          isSubscriptionActive: !!activeSub,
          daysRemaining: activeSub?.daysRemaining ?? 0,
          subscriptionStatus: activeSub ? "ACTIVE" : "EXPIRED",
          planTier: activeSub?.plan ?? null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      enrollments: enrichedEnrollments,
      subscription: activeSub
        ? {
            plan: activeSub.plan,
            status: activeSub.status,
            durationMonths: activeSub.durationMonths,
            daysRemaining: activeSub.daysRemaining,
            endDate: activeSub.endDate,
          }
        : null,
    });
  } catch (error) {
    console.error("My Courses API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrolled courses." },
      { status: 500 }
    );
  }
}
