"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaidSchema = exports.verifyWinnerSchema = exports.uploadProofSchema = void 0;
const zod_1 = require("zod");
exports.uploadProofSchema = zod_1.z.object({
    proofUrl: zod_1.z.url(),
});
exports.verifyWinnerSchema = zod_1.z.object({
    isVerified: zod_1.z.boolean(),
    paymentStatus: zod_1.z.enum(["PENDING", "PAID", "REJECTED"]).optional(),
    rejectedReason: zod_1.z.string().max(500).optional(),
}).refine((data) => data.isVerified || data.rejectedReason !== undefined, { message: "rejectedReason is required when rejecting a submission", path: ["rejectedReason"] });
exports.markPaidSchema = zod_1.z.object({
    paymentStatus: zod_1.z.literal("PAID"),
});
