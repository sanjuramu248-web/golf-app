"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaid = exports.verifyWinner = exports.getAllWinners = exports.uploadProof = exports.getMyWinnings = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const winner_validation_1 = require("../validation/winner.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
exports.getMyWinnings = (0, asyncHandler_1.default)(async (req, res) => {
    const myWinnings = await db_1.db.select().from(schema_1.winners).where((0, drizzle_orm_1.eq)(schema_1.winners.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.winners.createdAt));
    res.json(new apiResponse_1.ApiResponse(200, { winners: myWinnings }, "Winnings fetched"));
});
exports.uploadProof = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = winner_validation_1.uploadProofSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const id = String(req.params["id"]);
    const [winner] = await db_1.db.select().from(schema_1.winners).where((0, drizzle_orm_1.eq)(schema_1.winners.id, id)).limit(1);
    if (!winner)
        throw new apiError_1.ApiError(404, "Winner record not found");
    if (winner.userId !== req.user.id)
        throw new apiError_1.ApiError(403, "Forbidden");
    const [updated] = await db_1.db.update(schema_1.winners).set({ proofUrl: parsed.data.proofUrl }).where((0, drizzle_orm_1.eq)(schema_1.winners.id, id)).returning();
    res.json(new apiResponse_1.ApiResponse(200, { winner: updated }, "Proof uploaded"));
});
exports.getAllWinners = (0, asyncHandler_1.default)(async (_req, res) => {
    const allWinners = await db_1.db.select().from(schema_1.winners).orderBy((0, drizzle_orm_1.desc)(schema_1.winners.createdAt));
    res.json(new apiResponse_1.ApiResponse(200, { winners: allWinners }, "Winners fetched"));
});
exports.verifyWinner = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = winner_validation_1.verifyWinnerSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const id = String(req.params["id"]);
    const [updated] = await db_1.db.update(schema_1.winners).set({
        isVerified: parsed.data.isVerified,
        paymentStatus: parsed.data.paymentStatus,
        rejectedReason: parsed.data.rejectedReason,
    }).where((0, drizzle_orm_1.eq)(schema_1.winners.id, id)).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Winner not found");
    res.json(new apiResponse_1.ApiResponse(200, { winner: updated }, "Winner updated"));
});
exports.markPaid = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = winner_validation_1.markPaidSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const id = String(req.params["id"]);
    const [updated] = await db_1.db.update(schema_1.winners).set({ paymentStatus: "PAID" }).where((0, drizzle_orm_1.eq)(schema_1.winners.id, id)).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Winner not found");
    res.json(new apiResponse_1.ApiResponse(200, { winner: updated }, "Payout marked as completed"));
});
