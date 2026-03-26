"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateDrawSchema = exports.publishDrawSchema = exports.createDrawSchema = void 0;
const zod_1 = require("zod");
const drawNumbersSchema = zod_1.z
    .array(zod_1.z.number().int().min(1).max(45))
    .length(5);
exports.createDrawSchema = zod_1.z.object({
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2024),
    drawType: zod_1.z.enum(["RANDOM", "ALGORITHM"]),
});
exports.publishDrawSchema = zod_1.z.object({
    numbers: drawNumbersSchema,
});
exports.simulateDrawSchema = zod_1.z.object({
    drawType: zod_1.z.enum(["RANDOM", "ALGORITHM"]),
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2024),
});
