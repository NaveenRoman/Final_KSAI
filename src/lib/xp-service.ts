import { db } from "@/lib/db";
import { XP_CONFIG, XpSourceType, calculateLevelFromLifetimeXp, LevelInfo } from "@/lib/xp-config";

export interface AwardXpOptions {
  userId: string;
  amount: number;
  source: XpSourceType;
  courseId?: string | null;
  idempotencyKey?: string | null;
}

export interface AwardXpResult {
  xpAwarded: number;
  xpTransaction: any;
  milestoneTransaction: any;
  user: any;
  isDuplicate?: boolean;
  levelInfo?: LevelInfo;
}


/**
 * Calculates calendar day difference between lastActiveDate and currentDate (in UTC).
 * 0  = same calendar day
 * 1  = exactly 1 day prior (yesterday)
 * >1 = 2 or more days prior
 * -1 = no lastActiveDate (first activity ever)
 */
export function getCalendarDayDifference(
  lastDate: Date | null | undefined,
  currentDate: Date = new Date()
): number {
  if (!lastDate) return -1;

  const lastUtc = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate()
  );
  const currentUtc = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  );

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((currentUtc - lastUtc) / msPerDay);
}

/**
 * Awards XP to a user, logs an append-only XpTransaction record,
 * and updates the user's daily streak and user.xp total server-side
 * inside an atomic database transaction.
 */
export async function awardXpAndStreak({
  userId,
  amount,
  source,
  courseId,
  idempotencyKey,
}: AwardXpOptions): Promise<AwardXpResult> {
  const now = new Date();

  return await db.$transaction(async (tx) => {
    // 1. Retrieve current streak, activity state, and XP for user
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastActiveDate: true,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 2. Check for idempotency: if idempotencyKey is provided and already exists, return early without re-awarding
    if (idempotencyKey) {
      const existingTx = await tx.xpTransaction.findUnique({
        where: { id: idempotencyKey },
      });
      if (existingTx) {
        return {
          xpAwarded: 0,
          xpTransaction: existingTx,
          milestoneTransaction: null,
          user,
          isDuplicate: true,
          levelInfo: calculateLevelFromLifetimeXp(user.xp),
        };
      }
    }

    // 3. Calculate new streak state based on lastActiveDate
    const dayDiff = getCalendarDayDifference(user.lastActiveDate, now);

    let newCurrentStreak = user.currentStreak;
    let streakAdvanced = false;

    if (dayDiff === 1) {
      // Active yesterday -> increment current streak by 1
      newCurrentStreak = user.currentStreak + 1;
      streakAdvanced = true;
    } else if (dayDiff === 0) {
      // Already active today -> keep current streak as is
      newCurrentStreak = user.currentStreak > 0 ? user.currentStreak : 1;
    } else {
      // More than 1 day ago or first active date -> reset current streak to 1
      newCurrentStreak = 1;
      streakAdvanced = true;
    }

    // Update longestStreak if currentStreak exceeds it
    const newLongestStreak = Math.max(user.longestStreak, newCurrentStreak);

    // 4. Create primary XP transaction record (if amount > 0)
    let xpTx = null;
    let totalXpAwarded = 0;

    if (amount > 0) {
      xpTx = await tx.xpTransaction.create({
        data: {
          ...(idempotencyKey ? { id: idempotencyKey } : {}),
          userId,
          amount,
          source,
          courseId: courseId ?? null,
          createdAt: now,
        },
      });
      totalXpAwarded += amount;
    }

    // 5. Check for daily streak milestone bonus only on an exact streak increment transition
    let milestoneTx = null;
    const streakIncremented = dayDiff === 1 && newCurrentStreak > user.currentStreak;
    if (streakIncremented) {
      const milestoneBonus = XP_CONFIG.STREAK_MILESTONES[newCurrentStreak];
      if (milestoneBonus && milestoneBonus > 0) {
        milestoneTx = await tx.xpTransaction.create({
          data: {
            userId,
            amount: milestoneBonus,
            source: "streak_bonus",
            courseId: courseId ?? null,
            createdAt: now,
          },
        });
        totalXpAwarded += milestoneBonus;
      }
    }

    // 6. Calculate unified level monotonically from new lifetime XP
    const newLifetimeXp = user.xp + totalXpAwarded;
    const levelInfo = calculateLevelFromLifetimeXp(newLifetimeXp);

    // Atomically update user streak fields, lastActiveDate, level, and increment user.xp
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActiveDate: now,
        ...(totalXpAwarded > 0
          ? {
              xp: { increment: totalXpAwarded },
              level: levelInfo.level,
            }
          : {}),
      },
    });

    return {
      xpAwarded: totalXpAwarded,
      xpTransaction: xpTx,
      milestoneTransaction: milestoneTx,
      user: updatedUser,
      isDuplicate: false,
      levelInfo,
    };
  });
}

/**
 * Reconciles and synchronizes user.xp to strictly match the sum of all historical XpTransactions.
 */
export async function syncUserXpFromTransactions(userId: string) {
  return await db.$transaction(async (tx) => {
    const aggregate = await tx.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const totalXp = aggregate._sum.amount ?? 0;
    return await tx.user.update({
      where: { id: userId },
      data: { xp: totalXp },
    });
  });
}
