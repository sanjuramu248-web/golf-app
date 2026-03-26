"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
exports.getDashboard = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const [user] = await db_1.db
        .select({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, isEmailVerified: schema_1.users.isEmailVerified })
        .from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    const [subscription] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    const userScores = await db_1.db.select().from(schema_1.scores)
        .where((0, drizzle_orm_1.eq)(schema_1.scores.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.scores.playedAt)).limit(5);
    const [charitySelection] = await db_1.db.select({
        charityId: schema_1.userCharity.charityId,
        contributionPercent: schema_1.userCharity.contributionPercent,
        charityName: schema_1.charities.name,
        charityImage: schema_1.charities.image,
    })
        .from(schema_1.userCharity)
        .leftJoin(schema_1.charities, (0, drizzle_orm_1.eq)(schema_1.userCharity.charityId, schema_1.charities.id))
        .where((0, drizzle_orm_1.eq)(schema_1.userCharity.userId, userId)).limit(1);
    const drawHistory = await db_1.db.select({
        entryId: schema_1.drawEntries.id,
        drawId: schema_1.drawEntries.drawId,
        userNumbers: schema_1.drawEntries.userNumbers,
        month: schema_1.draws.month,
        year: schema_1.draws.year,
        isPublished: schema_1.draws.isPublished,
        winningNumbers: schema_1.draws.numbers,
        createdAt: schema_1.drawEntries.createdAt,
    })
        .from(schema_1.drawEntries)
        .leftJoin(schema_1.draws, (0, drizzle_orm_1.eq)(schema_1.drawEntries.drawId, schema_1.draws.id))
        .where((0, drizzle_orm_1.eq)(schema_1.drawEntries.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.drawEntries.createdAt))
        .limit(12);
    const userWinnings = await db_1.db.select().from(schema_1.winners)
        .where((0, drizzle_orm_1.eq)(schema_1.winners.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.winners.createdAt));
    const totalWon = userWinnings.reduce((sum, w) => sum + Number(w.prizeAmount ?? 0), 0);
    res.json(new apiResponse_1.ApiResponse(200, {
        user,
        subscription: subscription ?? null,
        scores: userScores,
        charity: charitySelection ?? null,
        draws: { history: drawHistory, totalEntered: drawHistory.length },
        winnings: { list: userWinnings, totalWon },
    }, "Dashboard fetched"));
});
