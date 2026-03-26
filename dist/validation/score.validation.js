"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateScoreSchema = exports.addScoreSchema = void 0;
const zod_1 = require("zod");
exports.addScoreSchema = zod_1.z.object({
    score: zod_1.z.number().int().min(1).max(45),
    playedAt: zod_1.z.iso.datetime(),
});
exports.updateScoreSchema = exports.addScoreSchema.partial();
