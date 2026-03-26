"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const schema_1 = require("./schema");
const stripe_1 = __importDefault(require("stripe"));
const drizzle_orm_1 = require("drizzle-orm");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
async function sync() {
    const allPlans = await db_1.db.select().from(schema_1.plans);
    for (const plan of allPlans) {
        if (plan.stripePriceId) {
            console.log(`${plan.name} — already synced: ${plan.stripePriceId}`);
            continue;
        }
        const price = await stripe.prices.create({
            unit_amount: Math.round(Number(plan.price) * 100),
            currency: "gbp",
            recurring: { interval: plan.type === "MONTHLY" ? "month" : "year" },
            product_data: { name: plan.name },
        });
        await db_1.db.update(schema_1.plans).set({ stripePriceId: price.id }).where((0, drizzle_orm_1.eq)(schema_1.plans.id, plan.id));
        console.log(`${plan.name} → ${price.id}`);
    }
    console.log("✅ Stripe sync complete");
    process.exit(0);
}
sync().catch((e) => { console.error(e.message); process.exit(1); });
