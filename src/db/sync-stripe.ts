import "dotenv/config";
import { db } from "./db";
import { plans } from "./schema";
import Stripe from "stripe";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function sync() {
  const allPlans = await db.select().from(plans);

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

    await db.update(plans).set({ stripePriceId: price.id }).where(eq(plans.id, plan.id));
    console.log(`${plan.name} → ${price.id}`);
  }

  console.log("✅ Stripe sync complete");
  process.exit(0);
}

sync().catch((e) => { console.error(e.message); process.exit(1); });
