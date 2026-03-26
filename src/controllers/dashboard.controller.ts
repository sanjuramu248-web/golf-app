import { Request, Response } from "express";
import { db } from "../db/db";
import { users, subscriptions, scores, userCharity, charities, drawEntries, draws, winners } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

// GET /dashboard — full user dashboard data in one request
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isEmailVerified: users.isEmailVerified })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(404, "User not found");

  // subscription status
  const [subscription] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)).limit(1);

  // last 5 scores
  const userScores = await db.select().from(scores)
    .where(eq(scores.userId, userId)).orderBy(desc(scores.playedAt)).limit(5);

  // charity selection
  const [charitySelection] = await db.select({
    charityId: userCharity.charityId,
    contributionPercent: userCharity.contributionPercent,
    charityName: charities.name,
    charityImage: charities.image,
  })
    .from(userCharity)
    .leftJoin(charities, eq(userCharity.charityId, charities.id))
    .where(eq(userCharity.userId, userId)).limit(1);

  // draw participation history
  const drawHistory = await db.select({
    entryId: drawEntries.id,
    drawId: drawEntries.drawId,
    userNumbers: drawEntries.userNumbers,
    month: draws.month,
    year: draws.year,
    isPublished: draws.isPublished,
    winningNumbers: draws.numbers,
    createdAt: drawEntries.createdAt,
  })
    .from(drawEntries)
    .leftJoin(draws, eq(drawEntries.drawId, draws.id))
    .where(eq(drawEntries.userId, userId))
    .orderBy(desc(drawEntries.createdAt))
    .limit(12);

  // winnings overview
  const userWinnings = await db.select().from(winners)
    .where(eq(winners.userId, userId)).orderBy(desc(winners.createdAt));

  const totalWon = userWinnings.reduce((sum, w) => sum + Number(w.prizeAmount ?? 0), 0);

  res.json(new ApiResponse(200, {
    user,
    subscription: subscription ?? null,
    scores: userScores,
    charity: charitySelection ?? null,
    draws: { history: drawHistory, totalEntered: drawHistory.length },
    winnings: { list: userWinnings, totalWon },
  }, "Dashboard fetched"));
});
