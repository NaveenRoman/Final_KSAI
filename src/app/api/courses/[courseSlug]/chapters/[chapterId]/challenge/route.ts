import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { getChapterChallengeProgression } from "@/lib/adaptive/unlock-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseSlug: string; chapterId: string }> }
) {
  try {
    const { courseSlug, chapterId } = await params;

    // 1. Resolve User
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

    const url = new URL(req.url);
    const requestedChallengeId = url.searchParams.get("challengeId");

    const orderNum = parseInt(chapterId.replace(/[^0-9]/g, ""), 10) || 0;

    const progression = await getChapterChallengeProgression({
      userId: user.id,
      courseSlug,
      chapterOrder: orderNum,
    });

    // If a specific challengeId was requested, validate it belongs to this chapter
    if (requestedChallengeId) {
      const match = progression.challenges.find((c) => c.id === requestedChallengeId);
      if (!match) {
        return NextResponse.json(
          {
            error: `Challenge '${requestedChallengeId}' does not belong to ${courseSlug} chapter ${orderNum}`,
            success: false,
            ...progression,
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      selectedChallengeId: requestedChallengeId || (progression.challenges[0]?.id ?? null),
      ...progression,
    });
  } catch (error: any) {
    console.error("GET Chapter Challenges Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve chapter challenges" },
      { status: 500 }
    );
  }
}
