import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  pgEnum,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PENDING",
]);

export const planTypeEnum = pgEnum("plan_type", ["MONTHLY", "YEARLY"]);

export const drawTypeEnum = pgEnum("draw_type", ["RANDOM", "ALGORITHM"]);

export const matchTypeEnum = pgEnum("match_type", [
  "MATCH_3",
  "MATCH_4",
  "MATCH_5",
]);

// REJECTED added — admin can approve or reject winner submissions
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "REJECTED",
]);

/* =========================
   USERS
========================= */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("USER").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================
   CHARITIES
========================= */

export const charities = pgTable("charities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  image: text("image"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================
   CHARITY EVENTS (golf days etc.)
========================= */

export const charityEvents = pgTable("charity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  charityId: uuid("charity_id").references(() => charities.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   USER CHARITY SELECTION
========================= */

export const userCharity = pgTable("user_charity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  charityId: uuid("charity_id").references(() => charities.id).notNull(),
  // min 10%, user can voluntarily increase
  contributionPercent: integer("contribution_percent").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================
   SUBSCRIPTION PLANS (admin configurable)
========================= */

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),       // e.g. "Monthly", "Yearly"
  type: planTypeEnum("type").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stripePriceId: text("stripe_price_id"),                 // set by admin after creating in Stripe
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   SUBSCRIPTIONS
========================= */

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  plan: planTypeEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").default("PENDING").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  stripeSubId: text("stripe_sub_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   SCORES (LAST 5 LOGIC)
========================= */

export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  score: integer("score").notNull(), // 1–45 Stableford
  playedAt: timestamp("played_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   DRAWS (MONTHLY)
========================= */

export const draws = pgTable("draws", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: integer("month").notNull(), // 1–12
  year: integer("year").notNull(),
  drawType: drawTypeEnum("draw_type").notNull(),
  numbers: jsonb("numbers"), // 5 winning numbers, null until published
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   DRAW ENTRIES
========================= */

export const drawEntries = pgTable(
  "draw_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    drawId: uuid("draw_id").references(() => draws.id).notNull(),
    // snapshot of user's last 5 scores at time of entry
    userNumbers: jsonb("user_numbers").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.userId, t.drawId)] // one entry per user per draw
);

/* =========================
   WINNERS
========================= */

export const winners = pgTable("winners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  drawId: uuid("draw_id").references(() => draws.id).notNull(),
  matchType: matchTypeEnum("match_type").notNull(),
  prizeAmount: decimal("prize_amount", { precision: 10, scale: 2 }).notNull(),
  proofUrl: text("proof_url"),
  isVerified: boolean("is_verified").default(false).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("PENDING").notNull(),
  // reason stored when admin rejects a submission
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   PRIZE POOL
========================= */

export const prizePools = pgTable("prize_pools", {
  id: uuid("id").primaryKey().defaultRandom(),
  drawId: uuid("draw_id").references(() => draws.id).notNull(),
  totalPool: decimal("total_pool", { precision: 10, scale: 2 }).notNull(),
  match5Pool: decimal("match5_pool", { precision: 10, scale: 2 }).notNull(), // 40%
  match4Pool: decimal("match4_pool", { precision: 10, scale: 2 }).notNull(), // 35%
  match3Pool: decimal("match3_pool", { precision: 10, scale: 2 }).notNull(), // 25%
  // carries forward to next draw if no 5-match winner
  rolloverAmount: decimal("rollover_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   TRANSACTIONS
========================= */

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  // portion of subscription routed to charity
  charityAmount: decimal("charity_amount", { precision: 10, scale: 2 }),
  status: paymentStatusEnum("status").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // e.g. "stripe"
  providerId: text("provider_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   DONATIONS (independent — not tied to gameplay)
========================= */

export const donations = pgTable("donations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  charityId: uuid("charity_id").references(() => charities.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  providerId: text("provider_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
