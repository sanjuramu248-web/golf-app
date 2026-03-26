"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStripePrices = exports.updatePlan = exports.getAllPlans = exports.getPlans = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const stripe_1 = require("../utils/stripe");
const planSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    type: zod_1.z.enum(["MONTHLY", "YEARLY"]),
    price: zod_1.z.number().positive(),
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.getPlans = (0, asyncHandler_1.default)(async (_req, res) => {
    const activePlans = await db_1.db.select().from(schema_1.plans).where((0, drizzle_orm_1.eq)(schema_1.plans.isActive, true));
    res.json(new apiResponse_1.ApiResponse(200, { plans: activePlans }, "Plans fetched"));
});
exports.getAllPlans = (0, asyncHandler_1.default)(async (_req, res) => {
    const allPlans = await db_1.db.select().from(schema_1.plans);
    res.json(new apiResponse_1.ApiResponse(200, { plans: allPlans }, "Plans fetched"));
});
exports.updatePlan = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const parsed = planSchema.partial().safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const [existing] = await db_1.db.select().from(schema_1.plans).where((0, drizzle_orm_1.eq)(schema_1.plans.id, id)).limit(1);
    if (!existing)
        throw new apiError_1.ApiError(404, "Plan not found");
    let stripePriceId = existing.stripePriceId;
    if (parsed.data.price && parsed.data.price !== Number(existing.price)) {
        if (existing.stripePriceId) {
            await stripe_1.stripe.prices.update(existing.stripePriceId, { active: false });
        }
        const stripePrice = await stripe_1.stripe.prices.create({
            unit_amount: Math.round((parsed.data.price ?? Number(existing.price)) * 100),
            currency: "gbp",
            recurring: { interval: existing.type === "MONTHLY" ? "month" : "year" },
            product_data: { name: parsed.data.name ?? existing.name },
        });
        stripePriceId = stripePrice.id;
    }
    const [updated] = await db_1.db.update(schema_1.plans)
        .set({ ...parsed.data, price: parsed.data.price ? String(parsed.data.price) : undefined, stripePriceId })
        .where((0, drizzle_orm_1.eq)(schema_1.plans.id, id))
        .returning();
    res.json(new apiResponse_1.ApiResponse(200, { plan: updated }, "Plan updated"));
});
exports.syncStripePrices = (0, asyncHandler_1.default)(async (_req, res) => {
    const allPlans = await db_1.db.select().from(schema_1.plans);
    const results = [];
    for (const plan of allPlans) {
        if (plan.stripePriceId) {
            results.push({ id: plan.id, status: "already_synced" });
            continue;
        }
        const stripePrice = await stripe_1.stripe.prices.create({
            unit_amount: Math.round(Number(plan.price) * 100),
            currency: "gbp",
            recurring: { interval: plan.type === "MONTHLY" ? "month" : "year" },
            product_data: { name: plan.name },
        });
        await db_1.db.update(schema_1.plans).set({ stripePriceId: stripePrice.id }).where((0, drizzle_orm_1.eq)(schema_1.plans.id, plan.id));
        results.push({ id: plan.id, stripePriceId: stripePrice.id, status: "synced" });
    }
    res.json(new apiResponse_1.ApiResponse(200, { results }, "Stripe prices synced"));
});
