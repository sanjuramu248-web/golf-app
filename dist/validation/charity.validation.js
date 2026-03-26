"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.donationSchema = exports.updateCharityEventSchema = exports.createCharityEventSchema = exports.selectCharitySchema = exports.updateCharitySchema = exports.createCharitySchema = void 0;
const zod_1 = require("zod");
exports.createCharitySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255),
    description: zod_1.z.string().optional(),
    image: zod_1.z.url().optional(),
    isFeatured: zod_1.z.boolean().optional().default(false),
});
exports.updateCharitySchema = exports.createCharitySchema.partial();
exports.selectCharitySchema = zod_1.z.object({
    charityId: zod_1.z.uuid(),
    contributionPercent: zod_1.z.number().int().min(10).max(100).default(10),
});
exports.createCharityEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(255),
    description: zod_1.z.string().optional(),
    eventDate: zod_1.z.iso.datetime(),
});
exports.updateCharityEventSchema = exports.createCharityEventSchema.partial();
exports.donationSchema = zod_1.z.object({
    charityId: zod_1.z.uuid(),
    amount: zod_1.z.number().min(1, "Minimum donation is £1").multipleOf(0.01),
});
