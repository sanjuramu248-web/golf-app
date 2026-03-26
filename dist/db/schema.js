"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.donations = exports.transactions = exports.prizePools = exports.winners = exports.drawEntries = exports.draws = exports.scores = exports.subscriptions = exports.plans = exports.userCharity = exports.charityEvents = exports.charities = exports.users = exports.paymentStatusEnum = exports.matchTypeEnum = exports.drawTypeEnum = exports.planTypeEnum = exports.subscriptionStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["USER", "ADMIN"]);
exports.subscriptionStatusEnum = (0, pg_core_1.pgEnum)("subscription_status", [
    "ACTIVE",
    "CANCELLED",
    "EXPIRED",
    "PENDING",
]);
exports.planTypeEnum = (0, pg_core_1.pgEnum)("plan_type", ["MONTHLY", "YEARLY"]);
exports.drawTypeEnum = (0, pg_core_1.pgEnum)("draw_type", ["RANDOM", "ALGORITHM"]);
exports.matchTypeEnum = (0, pg_core_1.pgEnum)("match_type", [
    "MATCH_3",
    "MATCH_4",
    "MATCH_5",
]);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)("payment_status", [
    "PENDING",
    "PAID",
    "REJECTED",
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique().notNull(),
    password: (0, pg_core_1.text)("password").notNull(),
    role: (0, exports.userRoleEnum)("role").default("USER").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    isEmailVerified: (0, pg_core_1.boolean)("is_email_verified").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.charities = (0, pg_core_1.pgTable)("charities", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    image: (0, pg_core_1.text)("image"),
    isFeatured: (0, pg_core_1.boolean)("is_featured").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.charityEvents = (0, pg_core_1.pgTable)("charity_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    charityId: (0, pg_core_1.uuid)("charity_id").references(() => exports.charities.id).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    eventDate: (0, pg_core_1.timestamp)("event_date").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.userCharity = (0, pg_core_1.pgTable)("user_charity", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    charityId: (0, pg_core_1.uuid)("charity_id").references(() => exports.charities.id).notNull(),
    contributionPercent: (0, pg_core_1.integer)("contribution_percent").default(10).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.plans = (0, pg_core_1.pgTable)("plans", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    type: (0, exports.planTypeEnum)("type").notNull().unique(),
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    stripePriceId: (0, pg_core_1.text)("stripe_price_id"),
    description: (0, pg_core_1.text)("description"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.subscriptions = (0, pg_core_1.pgTable)("subscriptions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    plan: (0, exports.planTypeEnum)("plan").notNull(),
    status: (0, exports.subscriptionStatusEnum)("status").default("PENDING").notNull(),
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    startDate: (0, pg_core_1.timestamp)("start_date"),
    endDate: (0, pg_core_1.timestamp)("end_date"),
    stripeSubId: (0, pg_core_1.text)("stripe_sub_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.scores = (0, pg_core_1.pgTable)("scores", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    score: (0, pg_core_1.integer)("score").notNull(),
    playedAt: (0, pg_core_1.timestamp)("played_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.draws = (0, pg_core_1.pgTable)("draws", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    month: (0, pg_core_1.integer)("month").notNull(),
    year: (0, pg_core_1.integer)("year").notNull(),
    drawType: (0, exports.drawTypeEnum)("draw_type").notNull(),
    numbers: (0, pg_core_1.jsonb)("numbers"),
    isPublished: (0, pg_core_1.boolean)("is_published").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.drawEntries = (0, pg_core_1.pgTable)("draw_entries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    drawId: (0, pg_core_1.uuid)("draw_id").references(() => exports.draws.id).notNull(),
    userNumbers: (0, pg_core_1.jsonb)("user_numbers").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (t) => [(0, pg_core_1.unique)().on(t.userId, t.drawId)]);
exports.winners = (0, pg_core_1.pgTable)("winners", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    drawId: (0, pg_core_1.uuid)("draw_id").references(() => exports.draws.id).notNull(),
    matchType: (0, exports.matchTypeEnum)("match_type").notNull(),
    prizeAmount: (0, pg_core_1.decimal)("prize_amount", { precision: 10, scale: 2 }).notNull(),
    proofUrl: (0, pg_core_1.text)("proof_url"),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false).notNull(),
    paymentStatus: (0, exports.paymentStatusEnum)("payment_status").default("PENDING").notNull(),
    rejectedReason: (0, pg_core_1.text)("rejected_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.prizePools = (0, pg_core_1.pgTable)("prize_pools", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    drawId: (0, pg_core_1.uuid)("draw_id").references(() => exports.draws.id).notNull(),
    totalPool: (0, pg_core_1.decimal)("total_pool", { precision: 10, scale: 2 }).notNull(),
    match5Pool: (0, pg_core_1.decimal)("match5_pool", { precision: 10, scale: 2 }).notNull(),
    match4Pool: (0, pg_core_1.decimal)("match4_pool", { precision: 10, scale: 2 }).notNull(),
    match3Pool: (0, pg_core_1.decimal)("match3_pool", { precision: 10, scale: 2 }).notNull(),
    rolloverAmount: (0, pg_core_1.decimal)("rollover_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.transactions = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id").references(() => exports.subscriptions.id),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    charityAmount: (0, pg_core_1.decimal)("charity_amount", { precision: 10, scale: 2 }),
    status: (0, exports.paymentStatusEnum)("status").notNull(),
    provider: (0, pg_core_1.varchar)("provider", { length: 50 }).notNull(),
    providerId: (0, pg_core_1.text)("provider_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.donations = (0, pg_core_1.pgTable)("donations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id).notNull(),
    charityId: (0, pg_core_1.uuid)("charity_id").references(() => exports.charities.id).notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    status: (0, exports.paymentStatusEnum)("status").default("PENDING").notNull(),
    providerId: (0, pg_core_1.text)("provider_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
