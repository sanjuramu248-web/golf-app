import { Request, Response } from "express";
import { db } from "../db/db";
import { users, scores, subscriptions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { adminUpdateUserSchema } from "../validation/auth.validation";
import { updateScoreSchema } from "../validation/score.validation";
import { updateSubscriptionSchema } from "../validation/subscription.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { hashPassword } from "../utils/hash";

// GET /admin/users
export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt));

  res.json(new ApiResponse(200, { users: allUsers }, "Users fetched"));
});

// GET /admin/users/:id
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) throw new ApiError(404, "User not found");

  const userScores = await db.select().from(scores).where(eq(scores.userId, id)).orderBy(desc(scores.playedAt)).limit(5);
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).orderBy(desc(subscriptions.createdAt)).limit(1);

  res.json(new ApiResponse(200, { user, scores: userScores, subscription: subscription ?? null }, "User fetched"));
});

// PATCH /admin/users/:id
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);

  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const updateData: Record<string, unknown> = { ...parsed.data };
  if ((updateData["password"] as string | undefined)) {
    updateData["password"] = await hashPassword(updateData["password"] as string);
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive });

  if (!updated) throw new ApiError(404, "User not found");
  res.json(new ApiResponse(200, { user: updated }, "User updated"));
});

// DELETE /admin/users/:id — soft delete
export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);

  const [updated] = await db.update(users).set({ isActive: false }).where(eq(users.id, id)).returning({ id: users.id });
  if (!updated) throw new ApiError(404, "User not found");
  res.json(new ApiResponse(200, null, "User deactivated"));
});

// PATCH /admin/scores/:scoreId
export const adminUpdateScore = asyncHandler(async (req: Request, res: Response) => {
  const scoreId = String(req.params["scoreId"]);

  const parsed = updateScoreSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const updateData: Record<string, unknown> = {};
  if (parsed.data.score !== undefined) updateData["score"] = parsed.data.score;
  if (parsed.data.playedAt !== undefined) updateData["playedAt"] = new Date(parsed.data.playedAt);

  const [updated] = await db.update(scores).set(updateData).where(eq(scores.id, scoreId)).returning();
  if (!updated) throw new ApiError(404, "Score not found");

  res.json(new ApiResponse(200, { score: updated }, "Score updated"));
});

// PATCH /admin/users/:userId/subscription
export const adminUpdateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params["userId"]);

  const parsed = updateSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status) updateData["status"] = parsed.data.status;
  if (parsed.data.endDate) updateData["endDate"] = new Date(parsed.data.endDate);

  const [updated] = await db.update(subscriptions).set(updateData).where(eq(subscriptions.userId, userId)).returning();
  if (!updated) throw new ApiError(404, "Subscription not found");

  res.json(new ApiResponse(200, { subscription: updated }, "Subscription updated"));
});
