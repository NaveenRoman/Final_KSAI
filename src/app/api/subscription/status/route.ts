import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserActiveSubscription } from "@/lib/subscription-service";
import { OFFICIAL_PLANS, PlanTier } from "@/lib/subscription-config";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers().catch(() => req.headers),
    });
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { hasActiveSubscription: false, plan: null, subscription: null, features: [] },
        { status: 200 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

    const isAdmin = dbUser?.role === "Admin";
    const activeSub = await getUserActiveSubscription(user.id);

    if (isAdmin) {
      return NextResponse.json({
        hasActiveSubscription: true,
        plan: "PRO",
        isAdmin: true,
        subscription: activeSub || {
          plan: "PRO",
          status: "ACTIVE",
          daysRemaining: 9999,
          startDate: new Date(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        },
        features: OFFICIAL_PLANS.PRO.features,
      });
    }

    if (!activeSub) {
      return NextResponse.json({
        hasActiveSubscription: false,
        plan: null,
        isAdmin: false,
        subscription: null,
        features: [],
      });
    }

    const planConfig = OFFICIAL_PLANS[activeSub.plan as PlanTier] || OFFICIAL_PLANS.BASIC;

    return NextResponse.json({
      hasActiveSubscription: true,
      plan: activeSub.plan,
      isAdmin: false,
      subscription: activeSub,
      features: planConfig.features,
    });
  } catch (error: unknown) {
    console.error("Subscription Status Fetch Error:", error);
    return NextResponse.json(
      { hasActiveSubscription: false, plan: null, error: "Failed to load subscription status." },
      { status: 500 }
    );
  }
}
