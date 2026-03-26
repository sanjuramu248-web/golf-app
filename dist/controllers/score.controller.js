"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScore = exports.updateScore = exports.addScore = exports.getMyScores = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const score_validation_1 = require("../validation/score.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
exports.getMyScores = (0, asyncHandler_1.default)(async (req, res) => {
    const userScores = await db_1.db
        .select()
        .from(schema_1.scores)
        .where((0, drizzle_orm_1.eq)(schema_1.scores.userId, req.user.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.scores.playedAt))
        .limit(5);
    res.json(new apiResponse_1.ApiResponse(200, { scores: userScores }, "Scores fetched"));
});
exports.addScore = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = score_validation_1.addScoreSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const userId = req.user.id;
    const existing = await db_1.db
        .select({ id: schema_1.scores.id })
        .from(schema_1.scores)
        .where((0, drizzle_orm_1.eq)(schema_1.scores.userId, userId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.scores.playedAt));
    if (existing.length >= 5) {
        await db_1.db.delete(schema_1.scores).where((0, drizzle_orm_1.eq)(schema_1.scores.id, existing[0].id));
    }
    const [score] = await db_1.db
        .insert(schema_1.scores)
        .values({ userId, score: parsed.data.score, playedAt: new Date(parsed.data.playedAt) })
        .returning();
    res.status(201).json(new apiResponse_1.ApiResponse(201, { score }, "Score added"));
});
exports.updateScore = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = score_validation_1.updateScoreSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const id = String(req.params["id"]);
    const updateData = {};
    if (parsed.data.score !== undefined)
        updateData.score = parsed.data.score;
    if (parsed.data.playedAt !== undefined)
        updateData.playedAt = new Date(parsed.data.playedAt);
    const [updated] = await db_1.db.update(schema_1.scores).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.scores.id, id)).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Score not found");
    if (updated.userId !== req.user.id)
        throw new apiError_1.ApiError(403, "Forbidden");
    res.json(new apiResponse_1.ApiResponse(200, { score: updated }, "Score updated"));
});
exports.deleteScore = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const [existing] = await db_1.db.select().from(schema_1.scores).where((0, drizzle_orm_1.eq)(schema_1.scores.id, id)).limit(1);
    if (!existing)
        throw new apiError_1.ApiError(404, "Score not found");
    if (existing.userId !== req.user.id)
        throw new apiError_1.ApiError(403, "Forbidden");
    await db_1.db.delete(schema_1.scores).where((0, drizzle_orm_1.eq)(schema_1.scores.id, id));
    res.json(new apiResponse_1.ApiResponse(200, null, "Score deleted"));
});
