import { Request, Response } from "express";
import { db } from "../db/db";
import { scores } from "../db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { addScoreSchema, updateScoreSchema } from "../validation/score.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

// GET /scores — get own last 5 scores (most recent first)
export const getMyScores = asyncHandler(async (req: Request, res: Response) => {
  const userScores = await db
    .select()
    .from(scores)
    .where(eq(scores.userId, req.user!.id))
    .orderBy(desc(scores.playedAt))
    .limit(5);

  res.json(new ApiResponse(200, { scores: userScores }, "Scores fetched"));
});

// POST /scores — add a score; enforce rolling 5 limit
export const addScore = asyncHandler(async (req: Request, res: Response) => {
  const parsed = addScoreSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const userId = req.user!.id;

  // check current count
  const existing = await db
    .select({ id: scores.id })
    .from(scores)
    .where(eq(scores.userId, userId))
    .orderBy(asc(scores.playedAt));

  // if already 5, delete the oldest
  if (existing.length >= 5) {
    await db.delete(scores).where(eq(scores.id, existing[0]!.id));
  }

  const [score] = await db
    .insert(scores)
    .values({ userId, score: parsed.data.score, playedAt: new Date(parsed.data.playedAt) })
    .returning();

  res.status(201).json(new ApiResponse(201, { score }, "Score added"));
});

// PATCH /scores/:id — edit own score
export const updateScore = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateScoreSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const id = String(req.params["id"]);
  const updateData: Record<string, unknown> = {};
  if (parsed.data.score !== undefined) updateData.score = parsed.data.score;
  if (parsed.data.playedAt !== undefined) updateData.playedAt = new Date(parsed.data.playedAt);

  const [updated] = await db.update(scores).set(updateData).where(eq(scores.id, id)).returning();
  if (!updated) throw new ApiError(404, "Score not found");
  if (updated.userId !== req.user!.id) throw new ApiError(403, "Forbidden");

  res.json(new ApiResponse(200, { score: updated }, "Score updated"));
});

// DELETE /scores/:id — delete own score
export const deleteScore = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const [existing] = await db.select().from(scores).where(eq(scores.id, id)).limit(1);
  if (!existing) throw new ApiError(404, "Score not found");
  if (existing.userId !== req.user!.id) throw new ApiError(403, "Forbidden");

  await db.delete(scores).where(eq(scores.id, id));
  res.json(new ApiResponse(200, null, "Score deleted"));
});
