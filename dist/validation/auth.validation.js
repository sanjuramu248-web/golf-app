"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.adminUpdateUserSchema = exports.updateUserRoleSchema = exports.loginSchema = exports.registerSchema = exports.roleEnum = void 0;
const zod_1 = require("zod");
exports.roleEnum = zod_1.z.enum(["USER", "ADMIN"]);
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255).optional(),
    email: zod_1.z.email(),
    password: zod_1.z.string().min(8).max(100),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(1),
});
exports.updateUserRoleSchema = zod_1.z.object({
    role: exports.roleEnum,
});
exports.adminUpdateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255).optional(),
    email: zod_1.z.email().optional(),
    isActive: zod_1.z.boolean().optional(),
    role: exports.roleEnum.optional(),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(255).optional(),
    email: zod_1.z.email().optional(),
    password: zod_1.z.string().min(8).max(100).optional(),
});
