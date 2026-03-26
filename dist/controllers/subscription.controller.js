"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.cancelSubscription = exports.verifySession = exports.createSubscription = exports.getMySubscription = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const subscription_validation_1 = require("../validation/subscription.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const stripe_1 = require("../utils/stripe");
const schema_2 = require("../db/schema");
const email_1 = require("../utils/email");
exports.getMySubscription = (0, asyncHandler_1.default)(async (req, res) => {
    const [sub] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, req.user.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    res.json(new apiResponse_1.ApiResponse(200, { subscription: sub ?? null }, "Subscription fetched"));
});
exports.createSubscription = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = subscription_validation_1.createSubscriptionSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const { plan } = parsed.data;
    const userId = req.user.id;
    const [existing] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    if (existing?.status === "ACTIVE")
        throw new apiError_1.ApiError(409, "Already have an active subscription");
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    const [planRecord] = await db_1.db.select().from(schema_2.plans).where((0, drizzle_orm_1.eq)(schema_2.plans.type, plan)).limit(1);
    if (!planRecord)
        throw new apiError_1.ApiError(404, "Plan not found");
    if (!planRecord.stripePriceId)
        throw new apiError_1.ApiError(400, "Plan not yet synced with Stripe. Contact admin.");
    const existingCustomers = await stripe_1.stripe.customers.list({ email: user.email, limit: 1 });
    const stripeCustomerId = existingCustomers.data.length > 0
        ? existingCustomers.data[0].id
        : (await stripe_1.stripe.customers.create({ email: user.email, ...(user.name ? { name: user.name } : {}) })).id;
    const session = await stripe_1.stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: planRecord.stripePriceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/subscribe?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscribe?cancelled=true`,
        metadata: { userId, plan },
    });
    res.status(201).json(new apiResponse_1.ApiResponse(201, { checkoutUrl: session.url, sessionId: session.id }, "Checkout session created"));
});
exports.verifySession = (0, asyncHandler_1.default)(async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId)
        throw new apiError_1.ApiError(400, "sessionId required");
    const session = await stripe_1.stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.payment_status !== "paid")
        throw new apiError_1.ApiError(400, "Payment not completed");
    const { userId, plan } = session.metadata ?? {};
    if (!userId || !plan)
        throw new apiError_1.ApiError(400, "Invalid session metadata");
    const stripeSubId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const [alreadyExists] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.stripeSubId, stripeSubId ?? "")).limit(1);
    if (alreadyExists) {
        res.json(new apiResponse_1.ApiResponse(200, { subscription: alreadyExists }, "Already activated"));
        return;
    }
    const [planRecord] = await db_1.db.select().from(schema_2.plans).where((0, drizzle_orm_1.eq)(schema_2.plans.type, plan)).limit(1);
    const planPrice = planRecord ? Number(planRecord.price) : (plan === "MONTHLY" ? 9.99 : 99.99);
    const startDate = new Date();
    const endDate = new Date(startDate);
    plan === "MONTHLY"
        ? endDate.setMonth(endDate.getMonth() + 1)
        : endDate.setFullYear(endDate.getFullYear() + 1);
    const [sub] = await db_1.db.insert(schema_1.subscriptions).values({
        userId,
        plan: plan,
        status: "ACTIVE",
        price: String(planPrice),
        startDate,
        endDate,
        stripeSubId,
    }).returning();
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    if (user)
        await (0, email_1.sendSubscriptionEmail)(user.email, plan, endDate).catch(() => { });
    const [charitySelection] = await db_1.db.select().from(schema_2.userCharity)
        .where((0, drizzle_orm_1.eq)(schema_2.userCharity.userId, userId)).limit(1);
    if (charitySelection) {
        const contributionPct = charitySelection.contributionPercent ?? 10;
        const charityAmount = (planPrice * contributionPct) / 100;
        await db_1.db.insert(schema_2.donations).values({
            userId,
            charityId: charitySelection.charityId,
            amount: String(charityAmount.toFixed(2)),
            status: "PENDING",
        }).onConflictDoNothing();
    }
    res.json(new apiResponse_1.ApiResponse(200, { subscription: sub }, "Subscription activated"));
});
exports.cancelSubscription = (0, asyncHandler_1.default)(async (req, res) => {
    const [sub] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, req.user.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    if (!sub)
        throw new apiError_1.ApiError(404, "No subscription found");
    if (sub.status !== "ACTIVE")
        throw new apiError_1.ApiError(400, "Subscription is not active");
    if (sub.stripeSubId)
        await stripe_1.stripe.subscriptions.cancel(sub.stripeSubId);
    const [updated] = await db_1.db.update(schema_1.subscriptions).set({ status: "CANCELLED" })
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.id, sub.id)).returning();
    res.json(new apiResponse_1.ApiResponse(200, { subscription: updated }, "Subscription cancelled"));
});
const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        res.json({ received: true });
        return;
    }
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch {
        res.status(400).json({ message: "Webhook signature invalid" });
        return;
    }
    if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        await db_1.db.update(schema_1.subscriptions).set({ status: "CANCELLED" })
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.stripeSubId, sub.id));
    }
    res.json({ received: true });
};
exports.stripeWebhook = stripeWebhook;
