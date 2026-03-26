"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishDraw = exports.simulateDraw = exports.createDraw = exports.getDrawById = exports.getDraws = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const draw_validation_1 = require("../validation/draw.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const drawEngine_1 = require("../utils/drawEngine");
const email_1 = require("../utils/email");
exports.getDraws = (0, asyncHandler_1.default)(async (_req, res) => {
    const allDraws = await db_1.db.select().from(schema_1.draws).orderBy((0, drizzle_orm_1.desc)(schema_1.draws.createdAt));
    res.json(new apiResponse_1.ApiResponse(200, { draws: allDraws }, "Draws fetched"));
});
exports.getDrawById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const [draw] = await db_1.db.select().from(schema_1.draws).where((0, drizzle_orm_1.eq)(schema_1.draws.id, id)).limit(1);
    if (!draw)
        throw new apiError_1.ApiError(404, "Draw not found");
    const [pool] = await db_1.db.select().from(schema_1.prizePools).where((0, drizzle_orm_1.eq)(schema_1.prizePools.drawId, id)).limit(1);
    res.json(new apiResponse_1.ApiResponse(200, { draw, prizePool: pool ?? null }, "Draw fetched"));
});
exports.createDraw = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = draw_validation_1.createDrawSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const existing = await db_1.db.select().from(schema_1.draws)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.draws.month, parsed.data.month), (0, drizzle_orm_1.eq)(schema_1.draws.year, parsed.data.year)))
        .limit(1);
    if (existing.length > 0)
        throw new apiError_1.ApiError(409, "Draw already exists for this month");
    const activeSubs = await db_1.db.select().from(schema_1.subscriptions).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.status, "ACTIVE"));
    const totalPool = activeSubs.reduce((sum, s) => sum + Number(s.price ?? 0), 0);
    const [draw] = await db_1.db.insert(schema_1.draws).values({
        month: parsed.data.month,
        year: parsed.data.year,
        drawType: parsed.data.drawType,
        isPublished: false,
    }).returning();
    await db_1.db.insert(schema_1.prizePools).values({
        drawId: draw.id,
        totalPool: String(totalPool),
        match5Pool: String(totalPool * 0.40),
        match4Pool: String(totalPool * 0.35),
        match3Pool: String(totalPool * 0.25),
        rolloverAmount: "0",
    });
    for (const sub of activeSubs) {
        const userScores = await db_1.db.select({ score: schema_1.scores.score })
            .from(schema_1.scores).where((0, drizzle_orm_1.eq)(schema_1.scores.userId, sub.userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.scores.playedAt)).limit(5);
        if (userScores.length > 0) {
            await db_1.db.insert(schema_1.drawEntries).values({
                userId: sub.userId,
                drawId: draw.id,
                userNumbers: userScores.map(s => s.score),
            }).onConflictDoNothing();
        }
    }
    res.status(201).json(new apiResponse_1.ApiResponse(201, { draw }, "Draw created"));
});
exports.simulateDraw = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = draw_validation_1.simulateDrawSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const numbers = parsed.data.drawType === "RANDOM" ? (0, drawEngine_1.randomDraw)() : await (0, drawEngine_1.algorithmDraw)();
    const entries = await db_1.db.select().from(schema_1.drawEntries)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawEntries.drawId, (0, drizzle_orm_1.sql) `(SELECT id FROM draws WHERE month = ${parsed.data.month} AND year = ${parsed.data.year} LIMIT 1)`)));
    const results = entries.map(e => ({
        userId: e.userId,
        userNumbers: e.userNumbers,
        matchType: (0, drawEngine_1.getMatchType)(e.userNumbers, numbers),
    })).filter(r => r.matchType !== null);
    res.json(new apiResponse_1.ApiResponse(200, { simulatedNumbers: numbers, potentialWinners: results }, "Simulation complete"));
});
exports.publishDraw = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const parsed = draw_validation_1.publishDrawSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const [draw] = await db_1.db.select().from(schema_1.draws).where((0, drizzle_orm_1.eq)(schema_1.draws.id, id)).limit(1);
    if (!draw)
        throw new apiError_1.ApiError(404, "Draw not found");
    if (draw.isPublished)
        throw new apiError_1.ApiError(400, "Draw already published");
    const winningNumbers = parsed.data.numbers;
    await db_1.db.update(schema_1.draws).set({ numbers: winningNumbers, isPublished: true }).where((0, drizzle_orm_1.eq)(schema_1.draws.id, id));
    let [pool] = await db_1.db.select().from(schema_1.prizePools).where((0, drizzle_orm_1.eq)(schema_1.prizePools.drawId, id)).limit(1);
    if (!pool) {
        const activeSubs = await db_1.db.select().from(schema_1.subscriptions).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.status, "ACTIVE"));
        const totalPool = activeSubs.reduce((sum, s) => sum + Number(s.price ?? 0), 0);
        [pool] = await db_1.db.insert(schema_1.prizePools).values({
            drawId: id,
            totalPool: String(totalPool),
            match5Pool: String(totalPool * 0.40),
            match4Pool: String(totalPool * 0.35),
            match3Pool: String(totalPool * 0.25),
            rolloverAmount: "0",
        }).returning();
    }
    if (!pool)
        throw new apiError_1.ApiError(500, "Prize pool could not be created");
    const entries = await db_1.db.select().from(schema_1.drawEntries).where((0, drizzle_orm_1.eq)(schema_1.drawEntries.drawId, id));
    const match5Winners = [];
    const match4Winners = [];
    const match3Winners = [];
    for (const entry of entries) {
        const matchType = (0, drawEngine_1.getMatchType)(entry.userNumbers, winningNumbers);
        if (matchType === "MATCH_5")
            match5Winners.push(entry.userId);
        else if (matchType === "MATCH_4")
            match4Winners.push(entry.userId);
        else if (matchType === "MATCH_3")
            match3Winners.push(entry.userId);
    }
    const match5Pool = Number(pool.match5Pool) + Number(pool.rolloverAmount);
    const hasJackpotWinner = match5Winners.length > 0;
    if (!hasJackpotWinner) {
        await db_1.db.update(schema_1.prizePools).set({ rolloverAmount: String(match5Pool) }).where((0, drizzle_orm_1.eq)(schema_1.prizePools.drawId, id));
    }
    const insertWinner = async (userId, matchType, totalPool, count) => {
        const amount = count > 0 ? totalPool / count : 0;
        await db_1.db.insert(schema_1.winners).values({ userId, drawId: id, matchType, prizeAmount: String(amount) });
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (user)
            await (0, email_1.sendWinnerEmail)(user.email, amount, matchType).catch(() => { });
    };
    if (hasJackpotWinner) {
        for (const uid of match5Winners)
            await insertWinner(uid, "MATCH_5", match5Pool, match5Winners.length);
    }
    for (const uid of match4Winners)
        await insertWinner(uid, "MATCH_4", Number(pool.match4Pool), match4Winners.length);
    for (const uid of match3Winners)
        await insertWinner(uid, "MATCH_3", Number(pool.match3Pool), match3Winners.length);
    const allUsers = await db_1.db.select({ email: schema_1.users.email }).from(schema_1.users);
    for (const u of allUsers) {
        await (0, email_1.sendDrawResultEmail)(u.email, draw.month, draw.year, winningNumbers).catch(() => { });
    }
    res.json(new apiResponse_1.ApiResponse(200, {
        winningNumbers,
        winners: { match5: match5Winners.length, match4: match4Winners.length, match3: match3Winners.length },
        jackpotRolledOver: !hasJackpotWinner,
    }, "Draw published"));
});
