"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
exports.getAnalytics = (0, asyncHandler_1.default)(async (_req, res) => {
    const [totalUsers] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.users);
    const [activeSubscriptions] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.subscriptions).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.status, "ACTIVE"));
    const [totalRevenue] = await db_1.db.select({ total: (0, drizzle_orm_1.sum)(schema_1.subscriptions.price) }).from(schema_1.subscriptions).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.status, "ACTIVE"));
    const [totalDraws] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.draws);
    const [totalWinners] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.winners);
    const [totalPaid] = await db_1.db.select({ total: (0, drizzle_orm_1.sum)(schema_1.winners.prizeAmount) }).from(schema_1.winners).where((0, drizzle_orm_1.eq)(schema_1.winners.paymentStatus, "PAID"));
    const [totalPrizePool] = await db_1.db.select({ total: (0, drizzle_orm_1.sum)(schema_1.winners.prizeAmount) }).from(schema_1.winners);
    const charityStats = await db_1.db
        .select({ charityId: schema_1.userCharity.charityId, userCount: (0, drizzle_orm_1.count)(), avgContribution: (0, drizzle_orm_1.sql) `AVG(${schema_1.userCharity.contributionPercent})` })
        .from(schema_1.userCharity)
        .groupBy(schema_1.userCharity.charityId);
    const planBreakdown = await db_1.db
        .select({ plan: schema_1.subscriptions.plan, count: (0, drizzle_orm_1.count)() })
        .from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.status, "ACTIVE"))
        .groupBy(schema_1.subscriptions.plan);
    res.json(new apiResponse_1.ApiResponse(200, {
        users: { total: totalUsers?.count ?? 0 },
        subscriptions: { active: activeSubscriptions?.count ?? 0, revenue: totalRevenue?.total ?? 0, byPlan: planBreakdown },
        draws: { total: totalDraws?.count ?? 0 },
        winners: { total: totalWinners?.count ?? 0, totalPaid: totalPaid?.total ?? 0, totalAwarded: totalPrizePool?.total ?? 0 },
        charities: charityStats,
    }, "Analytics fetched"));
});
