import { Request, Response } from "express";
import { db } from "../db/db";
import { draws, drawEntries, winners, prizePools, subscriptions, scores, users } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { createDrawSchema, publishDrawSchema, simulateDrawSchema } from "../validation/draw.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { randomDraw, algorithmDraw, getMatchType } from "../utils/drawEngine";
import { sendDrawResultEmail, sendWinnerEmail } from "../utils/email";

// GET /draws — list all draws
export const getDraws = asyncHandler(async (_req: Request, res: Response) => {
  const allDraws = await db.select().from(draws).orderBy(desc(draws.createdAt));
  res.json(new ApiResponse(200, { draws: allDraws }, "Draws fetched"));
});

// GET /draws/:id — single draw with prize pool
export const getDrawById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const [draw] = await db.select().from(draws).where(eq(draws.id, id)).limit(1);
  if (!draw) throw new ApiError(404, "Draw not found");

  const [pool] = await db.select().from(prizePools).where(eq(prizePools.drawId, id)).limit(1);
  res.json(new ApiResponse(200, { draw, prizePool: pool ?? null }, "Draw fetched"));
});

// POST /admin/draws — create a new monthly draw
export const createDraw = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createDrawSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const existing = await db.select().from(draws)
    .where(and(eq(draws.month, parsed.data.month), eq(draws.year, parsed.data.year)))
    .limit(1);
  if (existing.length > 0) throw new ApiError(409, "Draw already exists for this month");

  // calculate prize pool from active subscriptions
  const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  const totalPool = activeSubs.reduce((sum, s) => sum + Number(s.price ?? 0), 0);

  const [draw] = await db.insert(draws).values({
    month: parsed.data.month,
    year: parsed.data.year,
    drawType: parsed.data.drawType,
    isPublished: false,
  }).returning();

  // create prize pool record
  await db.insert(prizePools).values({
    drawId: draw!.id,
    totalPool: String(totalPool),
    match5Pool: String(totalPool * 0.40),
    match4Pool: String(totalPool * 0.35),
    match3Pool: String(totalPool * 0.25),
    rolloverAmount: "0",
  });

  // auto-enter all active subscribers using their last 5 scores
  for (const sub of activeSubs) {
    const userScores = await db.select({ score: scores.score })
      .from(scores).where(eq(scores.userId, sub.userId!)).orderBy(desc(scores.playedAt)).limit(5);

    if (userScores.length > 0) {
      await db.insert(drawEntries).values({
        userId: sub.userId!,
        drawId: draw!.id,
        userNumbers: userScores.map(s => s.score),
      }).onConflictDoNothing();
    }
  }

  res.status(201).json(new ApiResponse(201, { draw }, "Draw created"));
});

// POST /admin/draws/simulate — preview results without publishing
export const simulateDraw = asyncHandler(async (req: Request, res: Response) => {
  const parsed = simulateDrawSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const numbers = parsed.data.drawType === "RANDOM" ? randomDraw() : await algorithmDraw();

  const entries = await db.select().from(drawEntries)
    .where(and(
      eq(drawEntries.drawId, sql`(SELECT id FROM draws WHERE month = ${parsed.data.month} AND year = ${parsed.data.year} LIMIT 1)`)
    ));

  const results = entries.map(e => ({
    userId: e.userId,
    userNumbers: e.userNumbers,
    matchType: getMatchType(e.userNumbers as number[], numbers),
  })).filter(r => r.matchType !== null);

  res.json(new ApiResponse(200, { simulatedNumbers: numbers, potentialWinners: results }, "Simulation complete"));
});

// POST /admin/draws/:id/publish — run draw, determine winners, publish
export const publishDraw = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const parsed = publishDrawSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const [draw] = await db.select().from(draws).where(eq(draws.id, id)).limit(1);
  if (!draw) throw new ApiError(404, "Draw not found");
  if (draw.isPublished) throw new ApiError(400, "Draw already published");

  const winningNumbers = parsed.data.numbers;

  // update draw with numbers and publish
  await db.update(draws).set({ numbers: winningNumbers as unknown as number[], isPublished: true }).where(eq(draws.id, id));

  // get prize pool — create one if missing
  let [pool] = await db.select().from(prizePools).where(eq(prizePools.drawId, id)).limit(1);
  if (!pool) {
    const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
    const totalPool = activeSubs.reduce((sum, s) => sum + Number(s.price ?? 0), 0);
    [pool] = await db.insert(prizePools).values({
      drawId: id,
      totalPool: String(totalPool),
      match5Pool: String(totalPool * 0.40),
      match4Pool: String(totalPool * 0.35),
      match3Pool: String(totalPool * 0.25),
      rolloverAmount: "0",
    }).returning();
  }

  if (!pool) throw new ApiError(500, "Prize pool could not be created");

  // get all entries and determine winners
  const entries = await db.select().from(drawEntries).where(eq(drawEntries.drawId, id));

  const match5Winners: string[] = [];
  const match4Winners: string[] = [];
  const match3Winners: string[] = [];

  for (const entry of entries) {
    const matchType = getMatchType(entry.userNumbers as number[], winningNumbers);
    if (matchType === "MATCH_5") match5Winners.push(entry.userId!);
    else if (matchType === "MATCH_4") match4Winners.push(entry.userId!);
    else if (matchType === "MATCH_3") match3Winners.push(entry.userId!);
  }

  // handle jackpot rollover
  const match5Pool = Number(pool.match5Pool) + Number(pool.rolloverAmount);
  const hasJackpotWinner = match5Winners.length > 0;

  if (!hasJackpotWinner) {
    // rollover to next draw — update current pool
    await db.update(prizePools).set({ rolloverAmount: String(match5Pool) }).where(eq(prizePools.drawId, id));
  }

  // insert winners
  const insertWinner = async (userId: string, matchType: "MATCH_5" | "MATCH_4" | "MATCH_3", totalPool: number, count: number) => {
    const amount = count > 0 ? totalPool / count : 0;
    await db.insert(winners).values({ userId, drawId: id, matchType, prizeAmount: String(amount) });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user) await sendWinnerEmail(user.email, amount, matchType).catch(() => {});
  };

  if (hasJackpotWinner) {
    for (const uid of match5Winners) await insertWinner(uid, "MATCH_5", match5Pool, match5Winners.length);
  }
  for (const uid of match4Winners) await insertWinner(uid, "MATCH_4", Number(pool.match4Pool), match4Winners.length);
  for (const uid of match3Winners) await insertWinner(uid, "MATCH_3", Number(pool.match3Pool), match3Winners.length);

  // notify all subscribers of draw results
  const allUsers = await db.select({ email: users.email }).from(users);
  for (const u of allUsers) {
    await sendDrawResultEmail(u.email, draw.month!, draw.year!, winningNumbers).catch(() => {});
  }

  res.json(new ApiResponse(200, {
    winningNumbers,
    winners: { match5: match5Winners.length, match4: match4Winners.length, match3: match3Winners.length },
    jackpotRolledOver: !hasJackpotWinner,
  }, "Draw published"));
});
