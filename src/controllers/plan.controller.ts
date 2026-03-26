import { Request, Response } from "express";
import { db } from "../db/db";
import { plans } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { stripe } from "../utils/stripe";

const planSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["MONTHLY", "YEARLY"]),
  price: z.number().positive(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /plans — public, returns active plans
export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const activePlans = await db.select().from(plans).where(eq(plans.isActive, true));
  res.json(new ApiResponse(200, { plans: activePlans }, "Plans fetched"));
});

// GET /admin/plans — all plans including inactive
export const getAllPlans = asyncHandler(async (_req: Request, res: Response) => {
  const allPlans = await db.select().from(plans);
  res.json(new ApiResponse(200, { plans: allPlans }, "Plans fetched"));
});

// PATCH /admin/plans/:id — update plan + sync Stripe price if changed
export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  const parsed = planSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const [existing] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  if (!existing) throw new ApiError(404, "Plan not found");

  // if price changed and stripe product exists, create new Stripe price
  let stripePriceId = existing.stripePriceId;
  if (parsed.data.price && parsed.data.price !== Number(existing.price)) {
    if (existing.stripePriceId) {
      // archive old price, create new one
      await stripe.prices.update(existing.stripePriceId, { active: false });
    }
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round((parsed.data.price ?? Number(existing.price)) * 100),
      currency: "gbp",
      recurring: { interval: existing.type === "MONTHLY" ? "month" : "year" },
      product_data: { name: parsed.data.name ?? existing.name },
    });
    stripePriceId = stripePrice.id;
  }

  const [updated] = await db.update(plans)
    .set({ ...parsed.data, price: parsed.data.price ? String(parsed.data.price) : undefined, stripePriceId })
    .where(eq(plans.id, id))
    .returning();

  res.json(new ApiResponse(200, { plan: updated }, "Plan updated"));
});

// POST /admin/plans/sync-stripe — create Stripe prices for plans that don't have one
export const syncStripePrices = asyncHandler(async (_req: Request, res: Response) => {
  const allPlans = await db.select().from(plans);
  const results = [];

  for (const plan of allPlans) {
    if (plan.stripePriceId) { results.push({ id: plan.id, status: "already_synced" }); continue; }

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(Number(plan.price) * 100),
      currency: "gbp",
      recurring: { interval: plan.type === "MONTHLY" ? "month" : "year" },
      product_data: { name: plan.name },
    });

    await db.update(plans).set({ stripePriceId: stripePrice.id }).where(eq(plans.id, plan.id));
    results.push({ id: plan.id, stripePriceId: stripePrice.id, status: "synced" });
  }

  res.json(new ApiResponse(200, { results }, "Stripe prices synced"));
});
