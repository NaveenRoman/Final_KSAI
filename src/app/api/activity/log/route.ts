import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { awardXpAndStreak } from "@/lib/xp-service";

export const dynamic = "force-dynamic";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  level?: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload. Expected JSON object." },
        { status: 400 }
      );
    }

    const { actionType, metadata } = body as { actionType?: unknown; metadata?: unknown };

    if (!actionType || typeof actionType !== "string" || actionType.trim() === "") {
      return NextResponse.json(
        { error: "actionType is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    // 1. Resolve user session via Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let user: SessionUser | null = (session?.user as unknown as SessionUser) ?? null;

    if (!user && sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        user = dbSession.user as unknown as SessionUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Log activity in database
    const serializedMetadata = metadata
      ? typeof metadata === "string"
        ? metadata
        : JSON.stringify(metadata)
      : null;

    const activity = await db.activityLog.create({
      data: {
        userId: user.id,
        actionType: actionType.trim(),
        metadata: serializedMetadata,
      },
    });

    // 3. Award minor XP if it's an editor completion or debug session (rate-limited, daily capped at 50 XP)
    let xpToAdd = 0;
    const cleanActionType = actionType.trim();
    if (cleanActionType === "EDITOR_FIX" || cleanActionType === "EDITOR_IMPROVEMENT" || cleanActionType === "EDITOR_GUIDANCE") {
      xpToAdd = 10;
    } else if (cleanActionType === "EDITOR_HINT") {
      xpToAdd = 5;
    }

    if (xpToAdd > 0) {
      try {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const dailyEditorXp = await db.xpTransaction.aggregate({
          where: {
            userId: user.id,
            source: "editor_practice",
            createdAt: { gte: todayStart },
          },
          _sum: { amount: true },
        });

        const currentDailySum = dailyEditorXp._sum.amount ?? 0;
        const DAILY_EDITOR_CAP = 50; // max 50 XP per day from editor hints/fixes
        const allowableXp = Math.min(xpToAdd, Math.max(0, DAILY_EDITOR_CAP - currentDailySum));

        if (allowableXp > 0) {
          const initialLevel = user.level ?? 1;
          const xpResult = await awardXpAndStreak({
            userId: user.id,
            amount: allowableXp,
            source: "editor_practice",
            idempotencyKey: `editor_${activity.id}`,
          });

          if (xpResult.user && xpResult.user.level > initialLevel) {
            await db.notification.create({
              data: {
                userId: user.id,
                title: "Level Up! 🎉",
                message: `Congratulations! You've reached Level ${xpResult.user.level} through code editor practice!`,
                read: false,
              },
            }).catch(() => null);
          }
        }
      } catch (xpErr) {
        console.error("XP awarding error in activity log (non-fatal):", xpErr);
      }
    }

    return NextResponse.json({ success: true, activityId: activity.id });

  } catch (error: unknown) {
    console.error("Activity Log API Error:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message || "Failed to record activity log" },
      { status: 500 }
    );
  }
}
