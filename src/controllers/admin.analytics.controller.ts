import { Request, Response } from "express";
import { db } from "../db/db";
import { users, subscriptions, draws, winners, userCharity } from "../db/schema";
import { eq, count, sum, sql } from "drizzle-orm";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";

// GET /admin/analytics — full dashboard stats
export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [activeSubscriptions] = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  const [totalRevenue] = await db.select({ total: sum(subscriptions.price) }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  const [totalDraws] = await db.select({ count: count() }).from(draws);
  const [totalWinners] = await db.select({ count: count() }).from(winners);
  const [totalPaid] = await db.select({ total: sum(winners.prizeAmount) }).from(winners).where(eq(winners.paymentStatus, "PAID"));
  const [totalPrizePool] = await db.select({ total: sum(winners.prizeAmount) }).from(winners); // all prizes awarded

  // charity contribution totals
  const charityStats = await db
    .select({ charityId: userCharity.charityId, userCount: count(), avgContribution: sql<number>`AVG(${userCharity.contributionPercent})` })
    .from(userCharity)
    .groupBy(userCharity.charityId);

  // subscription plan breakdown
  const planBreakdown = await db
    .select({ plan: subscriptions.plan, count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "ACTIVE"))
    .groupBy(subscriptions.plan);

  res.json(new ApiResponse(200, {
    users: { total: totalUsers?.count ?? 0 },
    subscriptions: { active: activeSubscriptions?.count ?? 0, revenue: totalRevenue?.total ?? 0, byPlan: planBreakdown },
    draws: { total: totalDraws?.count ?? 0 },
    winners: { total: totalWinners?.count ?? 0, totalPaid: totalPaid?.total ?? 0, totalAwarded: totalPrizePool?.total ?? 0 },
    charities: charityStats,
  }, "Analytics fetched"));
});
