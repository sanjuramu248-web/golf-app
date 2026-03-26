import { Request, Response } from "express";
import { db } from "../db/db";
import { charities, charityEvents, userCharity } from "../db/schema";
import { eq, ilike, desc } from "drizzle-orm";
import { createCharitySchema, updateCharitySchema, selectCharitySchema, createCharityEventSchema } from "../validation/charity.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

// GET /charities — public listing with optional search
export const getCharities = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const list = search
    ? await db.select().from(charities).where(ilike(charities.name, `%${search}%`)).orderBy(desc(charities.isFeatured))
    : await db.select().from(charities).orderBy(desc(charities.isFeatured));

  res.json(new ApiResponse(200, { charities: list }, "Charities fetched"));
});

// GET /charities/:id — public single charity with events
export const getCharityById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const [charity] = await db.select().from(charities).where(eq(charities.id, id)).limit(1);
  if (!charity) throw new ApiError(404, "Charity not found");

  const events = await db.select().from(charityEvents).where(eq(charityEvents.charityId, id));

  res.json(new ApiResponse(200, { charity, events }, "Charity fetched"));
});

// POST /charities — admin create
export const createCharity = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createCharitySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const [charity] = await db.insert(charities).values(parsed.data).returning();
  res.status(201).json(new ApiResponse(201, { charity }, "Charity created"));
});

// PATCH /charities/:id — admin update
export const updateCharity = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateCharitySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const [updated] = await db.update(charities).set(parsed.data).where(eq(charities.id, String(req.params["id"]))).returning();
  if (!updated) throw new ApiError(404, "Charity not found");

  res.json(new ApiResponse(200, { charity: updated }, "Charity updated"));
});

// DELETE /charities/:id — admin delete
export const deleteCharity = asyncHandler(async (req: Request, res: Response) => {
  const [deleted] = await db.delete(charities).where(eq(charities.id, String(req.params["id"]))).returning({ id: charities.id });
  if (!deleted) throw new ApiError(404, "Charity not found");

  res.json(new ApiResponse(200, null, "Charity deleted"));
});

// POST /charities/:id/events — admin add event
export const addCharityEvent = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createCharityEventSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const [event] = await db
    .insert(charityEvents)
    .values({ charityId: String(req.params["id"]), ...parsed.data, eventDate: new Date(parsed.data.eventDate) })
    .returning();

  res.status(201).json(new ApiResponse(201, { event }, "Event added"));
});

// POST /charities/select — user selects charity + contribution %
export const selectCharity = asyncHandler(async (req: Request, res: Response) => {
  const parsed = selectCharitySchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const userId = req.user!.id;

  // upsert — replace existing selection
  const existing = await db.select().from(userCharity).where(eq(userCharity.userId, userId)).limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(userCharity)
      .set({ charityId: parsed.data.charityId, contributionPercent: parsed.data.contributionPercent })
      .where(eq(userCharity.userId, userId))
      .returning();
    return void res.json(new ApiResponse(200, { userCharity: updated }, "Charity selection updated"));
  }

  const [created] = await db
    .insert(userCharity)
    .values({ userId, charityId: parsed.data.charityId, contributionPercent: parsed.data.contributionPercent })
    .returning();

  res.status(201).json(new ApiResponse(201, { userCharity: created }, "Charity selected"));
});

// GET /charities/my-selection — get user's current charity selection
export const getMyCharitySelection = asyncHandler(async (req: Request, res: Response) => {
  const [selection] = await db
    .select()
    .from(userCharity)
    .where(eq(userCharity.userId, req.user!.id))
    .limit(1);

  res.json(new ApiResponse(200, { selection: selection ?? null }, "Selection fetched"));
});
