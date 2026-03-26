"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateSubscription = exports.adminUpdateScore = exports.deactivateUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_validation_1 = require("../validation/auth.validation");
const score_validation_1 = require("../validation/score.validation");
const subscription_validation_1 = require("../validation/subscription.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const hash_1 = require("../utils/hash");
exports.getAllUsers = (0, asyncHandler_1.default)(async (_req, res) => {
    const allUsers = await db_1.db
        .select({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, isActive: schema_1.users.isActive, createdAt: schema_1.users.createdAt })
        .from(schema_1.users)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
    res.json(new apiResponse_1.ApiResponse(200, { users: allUsers }, "Users fetched"));
});
exports.getUserById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const [user] = await db_1.db
        .select({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, isActive: schema_1.users.isActive, createdAt: schema_1.users.createdAt })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
        .limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    const userScores = await db_1.db.select().from(schema_1.scores).where((0, drizzle_orm_1.eq)(schema_1.scores.userId, id)).orderBy((0, drizzle_orm_1.desc)(schema_1.scores.playedAt)).limit(5);
    const [subscription] = await db_1.db.select().from(schema_1.subscriptions).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, id)).orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    res.json(new apiResponse_1.ApiResponse(200, { user, scores: userScores, subscription: subscription ?? null }, "User fetched"));
});
exports.updateUser = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const parsed = auth_validation_1.adminUpdateUserSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const updateData = { ...parsed.data };
    if (updateData["password"]) {
        updateData["password"] = await (0, hash_1.hashPassword)(updateData["password"]);
    }
    const [updated] = await db_1.db
        .update(schema_1.users)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
        .returning({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, isActive: schema_1.users.isActive });
    if (!updated)
        throw new apiError_1.ApiError(404, "User not found");
    res.json(new apiResponse_1.ApiResponse(200, { user: updated }, "User updated"));
});
exports.deactivateUser = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const [updated] = await db_1.db.update(schema_1.users).set({ isActive: false }).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).returning({ id: schema_1.users.id });
    if (!updated)
        throw new apiError_1.ApiError(404, "User not found");
    res.json(new apiResponse_1.ApiResponse(200, null, "User deactivated"));
});
exports.adminUpdateScore = (0, asyncHandler_1.default)(async (req, res) => {
    const scoreId = String(req.params["scoreId"]);
    const parsed = score_validation_1.updateScoreSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const updateData = {};
    if (parsed.data.score !== undefined)
        updateData["score"] = parsed.data.score;
    if (parsed.data.playedAt !== undefined)
        updateData["playedAt"] = new Date(parsed.data.playedAt);
    const [updated] = await db_1.db.update(schema_1.scores).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.scores.id, scoreId)).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Score not found");
    res.json(new apiResponse_1.ApiResponse(200, { score: updated }, "Score updated"));
});
exports.adminUpdateSubscription = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = String(req.params["userId"]);
    const parsed = subscription_validation_1.updateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const updateData = {};
    if (parsed.data.status)
        updateData["status"] = parsed.data.status;
    if (parsed.data.endDate)
        updateData["endDate"] = new Date(parsed.data.endDate);
    const [updated] = await db_1.db.update(schema_1.subscriptions).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, userId)).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Subscription not found");
    res.json(new apiResponse_1.ApiResponse(200, { subscription: updated }, "Subscription updated"));
});
