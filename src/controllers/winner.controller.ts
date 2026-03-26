import { Request, Response } from "express";
import { db } from "../db/db";
import { winners } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { uploadProofSchema, verifyWinnerSchema, markPaidSchema } from "../validation/winner.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

export const getMyWinnings = asyncHandler(async (req: Request, res: Response) => {
  const myWinnings = await db.select().from(winners).where(eq(winners.userId, req.user!.id)).orderBy(desc(winners.createdAt));
  res.json(new ApiResponse(200, { winners: myWinnings }, "Winnings fetched"));
});

export const uploadProof = asyncHandler(async (req: Request, res: Response) => {
  const parsed = uploadProofSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const id = String(req.params["id"]);
  const [winner] = await db.select().from(winners).where(eq(winners.id, id)).limit(1);
  if (!winner) throw new ApiError(404, "Winner record not found");
  if (winner.userId !== req.user!.id) throw new ApiError(403, "Forbidden");

  const [updated] = await db.update(winners).set({ proofUrl: parsed.data.proofUrl }).where(eq(winners.id, id)).returning();
  res.json(new ApiResponse(200, { winner: updated }, "Proof uploaded"));
});

export const getAllWinners = asyncHandler(async (_req: Request, res: Response) => {
  const allWinners = await db.select().from(winners).orderBy(desc(winners.createdAt));
  res.json(new ApiResponse(200, { winners: allWinners }, "Winners fetched"));
});

export const verifyWinner = asyncHandler(async (req: Request, res: Response) => {
  const parsed = verifyWinnerSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const id = String(req.params["id"]);
  const [updated] = await db.update(winners).set({
    isVerified: parsed.data.isVerified,
    paymentStatus: parsed.data.paymentStatus,
    rejectedReason: parsed.data.rejectedReason,
  }).where(eq(winners.id, id)).returning();

  if (!updated) throw new ApiError(404, "Winner not found");
  res.json(new ApiResponse(200, { winner: updated }, "Winner updated"));
});

export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const parsed = markPaidSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const id = String(req.params["id"]);
  const [updated] = await db.update(winners).set({ paymentStatus: "PAID" }).where(eq(winners.id, id)).returning();
  if (!updated) throw new ApiError(404, "Winner not found");
  res.json(new ApiResponse(200, { winner: updated }, "Payout marked as completed"));
});
