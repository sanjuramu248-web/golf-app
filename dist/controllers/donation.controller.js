"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyDonations = exports.createDonation = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const charity_validation_1 = require("../validation/charity.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const email_1 = require("../utils/email");
exports.createDonation = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = charity_validation_1.donationSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const { charityId, amount } = parsed.data;
    const userId = req.user.id;
    const [charity] = await db_1.db.select().from(schema_1.charities).where((0, drizzle_orm_1.eq)(schema_1.charities.id, charityId)).limit(1);
    if (!charity)
        throw new apiError_1.ApiError(404, "Charity not found");
    const [donation] = await db_1.db.insert(schema_1.donations).values({
        userId,
        charityId,
        amount: String(amount.toFixed(2)),
        status: "PENDING",
    }).returning();
    await (0, email_1.sendEmail)({
        to: req.user.email,
        subject: `Donation to ${charity.name} — Thank you!`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h2>Thank you for your donation 🙏</h2>
        <p>Your donation of <b>£${amount.toFixed(2)}</b> to <b>${charity.name}</b> has been received.</p>
        <p style="color:#666;font-size:14px">This is an independent donation not tied to your subscription.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">Digital Heroes Golf · digitalheroes.co.in</p>
      </div>
    `,
    }).catch(() => { });
    res.status(201).json(new apiResponse_1.ApiResponse(201, { donation, charityAmount: amount, charityName: charity.name }, "Donation created"));
});
exports.getMyDonations = (0, asyncHandler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const myDonations = await db_1.db.select().from(schema_1.donations)
        .where((0, drizzle_orm_1.eq)(schema_1.donations.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.donations.createdAt));
    const totalDonated = myDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const [sub] = await db_1.db.select().from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt)).limit(1);
    res.json(new apiResponse_1.ApiResponse(200, {
        donations: myDonations,
        summary: {
            totalDonated: totalDonated.toFixed(2),
            subscriptionContributions: myDonations.filter(d => d.providerId === null).length,
            independentDonations: myDonations.length,
            activeSubscription: sub?.status === "ACTIVE",
        },
    }, "Donations fetched"));
});
