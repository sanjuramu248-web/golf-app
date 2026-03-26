import { Request, Response } from "express";
import { db } from "../db/db";
import { subscriptions, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { createSubscriptionSchema } from "../validation/subscription.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { stripe } from "../utils/stripe";
import { plans, userCharity, donations } from "../db/schema";
import { sendSubscriptionEmail } from "../utils/email";

// GET /subscriptions/me
export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, req.user!.id))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  res.json(new ApiResponse(200, { subscription: sub ?? null }, "Subscription fetched"));
});

// POST /subscriptions — create Stripe checkout session
export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const { plan } = parsed.data;
  const userId = req.user!.id;

  const [existing] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  if (existing?.status === "ACTIVE") throw new ApiError(409, "Already have an active subscription");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new ApiError(404, "User not found");

  // fetch plan from DB
  const [planRecord] = await db.select().from(plans).where(eq(plans.type, plan)).limit(1);
  if (!planRecord) throw new ApiError(404, "Plan not found");
  if (!planRecord.stripePriceId) throw new ApiError(400, "Plan not yet synced with Stripe. Contact admin.");

  // get or create Stripe customer
  const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
  const stripeCustomerId = existingCustomers.data.length > 0
    ? existingCustomers.data[0]!.id
    : (await stripe.customers.create({ email: user.email, ...(user.name ? { name: user.name } : {}) })).id;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: planRecord.stripePriceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/subscribe?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscribe?cancelled=true`,
    metadata: { userId, plan },
  });

  res.status(201).json(new ApiResponse(201, { checkoutUrl: session.url, sessionId: session.id }, "Checkout session created"));
});

// POST /subscriptions/verify — called by frontend after Stripe redirect (no webhook needed)
export const verifySession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) throw new ApiError(400, "sessionId required");

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  if (session.payment_status !== "paid") throw new ApiError(400, "Payment not completed");

  const { userId, plan } = session.metadata ?? {};
  if (!userId || !plan) throw new ApiError(400, "Invalid session metadata");

  // check not already activated (idempotent)
  const stripeSubId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  const [alreadyExists] = await db.select().from(subscriptions)
    .where(eq(subscriptions.stripeSubId, stripeSubId ?? "")).limit(1);

  if (alreadyExists) {
    res.json(new ApiResponse(200, { subscription: alreadyExists }, "Already activated"));
    return;
  }

  const [planRecord] = await db.select().from(plans).where(eq(plans.type, plan as "MONTHLY" | "YEARLY")).limit(1);
  const planPrice = planRecord ? Number(planRecord.price) : (plan === "MONTHLY" ? 9.99 : 99.99);

  const startDate = new Date();
  const endDate = new Date(startDate);
  plan === "MONTHLY"
    ? endDate.setMonth(endDate.getMonth() + 1)
    : endDate.setFullYear(endDate.getFullYear() + 1);

  const [sub] = await db.insert(subscriptions).values({
    userId,
    plan: plan as "MONTHLY" | "YEARLY",
    status: "ACTIVE",
    price: String(planPrice),
    startDate,
    endDate,
    stripeSubId,
  }).returning();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user) await sendSubscriptionEmail(user.email, plan, endDate).catch(() => {});

  // auto-create charity contribution (min 10% of subscription price)
  const [charitySelection] = await db.select().from(userCharity)
    .where(eq(userCharity.userId, userId)).limit(1);

  if (charitySelection) {
    const contributionPct = charitySelection.contributionPercent ?? 10;
    const charityAmount = (planPrice * contributionPct) / 100;

    await db.insert(donations).values({
      userId,
      charityId: charitySelection.charityId!,
      amount: String(charityAmount.toFixed(2)),
      status: "PENDING",
    }).onConflictDoNothing();
  }

  res.json(new ApiResponse(200, { subscription: sub }, "Subscription activated"));
});

// PATCH /subscriptions/cancel
export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, req.user!.id))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  if (!sub) throw new ApiError(404, "No subscription found");
  if (sub.status !== "ACTIVE") throw new ApiError(400, "Subscription is not active");

  if (sub.stripeSubId) await stripe.subscriptions.cancel(sub.stripeSubId);

  const [updated] = await db.update(subscriptions).set({ status: "CANCELLED" })
    .where(eq(subscriptions.id, sub.id)).returning();
  res.json(new ApiResponse(200, { subscription: updated }, "Subscription cancelled"));
});

// POST /subscriptions/webhook — optional, for production
export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    res.json({ received: true });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ message: "Webhook signature invalid" });
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { id: string };
    await db.update(subscriptions).set({ status: "CANCELLED" })
      .where(eq(subscriptions.stripeSubId, sub.id));
  }

  res.json({ received: true });
};
