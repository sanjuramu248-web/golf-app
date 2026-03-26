"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubscriptionSchema = exports.createSubscriptionSchema = void 0;
const zod_1 = require("zod");
exports.createSubscriptionSchema = zod_1.z.object({
    plan: zod_1.z.enum(["MONTHLY", "YEARLY"]),
    stripeSubId: zod_1.z.string().optional(),
});
exports.updateSubscriptionSchema = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"]).optional(),
    endDate: zod_1.z.iso.datetime().optional(),
});
