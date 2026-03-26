"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCharitySelection = exports.selectCharity = exports.addCharityEvent = exports.deleteCharity = exports.updateCharity = exports.createCharity = exports.getCharityById = exports.getCharities = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const charity_validation_1 = require("../validation/charity.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
exports.getCharities = (0, asyncHandler_1.default)(async (req, res) => {
    const { search } = req.query;
    const list = search
        ? await db_1.db.select().from(schema_1.charities).where((0, drizzle_orm_1.ilike)(schema_1.charities.name, `%${search}%`)).orderBy((0, drizzle_orm_1.desc)(schema_1.charities.isFeatured))
        : await db_1.db.select().from(schema_1.charities).orderBy((0, drizzle_orm_1.desc)(schema_1.charities.isFeatured));
    res.json(new apiResponse_1.ApiResponse(200, { charities: list }, "Charities fetched"));
});
exports.getCharityById = (0, asyncHandler_1.default)(async (req, res) => {
    const id = String(req.params["id"]);
    const [charity] = await db_1.db.select().from(schema_1.charities).where((0, drizzle_orm_1.eq)(schema_1.charities.id, id)).limit(1);
    if (!charity)
        throw new apiError_1.ApiError(404, "Charity not found");
    const events = await db_1.db.select().from(schema_1.charityEvents).where((0, drizzle_orm_1.eq)(schema_1.charityEvents.charityId, id));
    res.json(new apiResponse_1.ApiResponse(200, { charity, events }, "Charity fetched"));
});
exports.createCharity = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = charity_validation_1.createCharitySchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const [charity] = await db_1.db.insert(schema_1.charities).values(parsed.data).returning();
    res.status(201).json(new apiResponse_1.ApiResponse(201, { charity }, "Charity created"));
});
exports.updateCharity = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = charity_validation_1.updateCharitySchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const [updated] = await db_1.db.update(schema_1.charities).set(parsed.data).where((0, drizzle_orm_1.eq)(schema_1.charities.id, String(req.params["id"]))).returning();
    if (!updated)
        throw new apiError_1.ApiError(404, "Charity not found");
    res.json(new apiResponse_1.ApiResponse(200, { charity: updated }, "Charity updated"));
});
exports.deleteCharity = (0, asyncHandler_1.default)(async (req, res) => {
    const [deleted] = await db_1.db.delete(schema_1.charities).where((0, drizzle_orm_1.eq)(schema_1.charities.id, String(req.params["id"]))).returning({ id: schema_1.charities.id });
    if (!deleted)
        throw new apiError_1.ApiError(404, "Charity not found");
    res.json(new apiResponse_1.ApiResponse(200, null, "Charity deleted"));
});
exports.addCharityEvent = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = charity_validation_1.createCharityEventSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const [event] = await db_1.db
        .insert(schema_1.charityEvents)
        .values({ charityId: String(req.params["id"]), ...parsed.data, eventDate: new Date(parsed.data.eventDate) })
        .returning();
    res.status(201).json(new apiResponse_1.ApiResponse(201, { event }, "Event added"));
});
exports.selectCharity = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = charity_validation_1.selectCharitySchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const userId = req.user.id;
    const existing = await db_1.db.select().from(schema_1.userCharity).where((0, drizzle_orm_1.eq)(schema_1.userCharity.userId, userId)).limit(1);
    if (existing.length > 0) {
        const [updated] = await db_1.db
            .update(schema_1.userCharity)
            .set({ charityId: parsed.data.charityId, contributionPercent: parsed.data.contributionPercent })
            .where((0, drizzle_orm_1.eq)(schema_1.userCharity.userId, userId))
            .returning();
        return void res.json(new apiResponse_1.ApiResponse(200, { userCharity: updated }, "Charity selection updated"));
    }
    const [created] = await db_1.db
        .insert(schema_1.userCharity)
        .values({ userId, charityId: parsed.data.charityId, contributionPercent: parsed.data.contributionPercent })
        .returning();
    res.status(201).json(new apiResponse_1.ApiResponse(201, { userCharity: created }, "Charity selected"));
});
exports.getMyCharitySelection = (0, asyncHandler_1.default)(async (req, res) => {
    const [selection] = await db_1.db
        .select()
        .from(schema_1.userCharity)
        .where((0, drizzle_orm_1.eq)(schema_1.userCharity.userId, req.user.id))
        .limit(1);
    res.json(new apiResponse_1.ApiResponse(200, { selection: selection ?? null }, "Selection fetched"));
});
