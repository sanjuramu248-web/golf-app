"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getMe = exports.refreshToken = exports.login = exports.resendVerification = exports.verifyEmail = exports.registerAdmin = exports.register = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const auth_validation_1 = require("../validation/auth.validation");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiResponse_1 = require("../utils/apiResponse");
const apiError_1 = require("../utils/apiError");
const email_1 = require("../utils/email");
async function registerUser(email, password, name, role) {
    const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (existing.length > 0)
        throw new apiError_1.ApiError(409, "Email already registered");
    const [user] = await db_1.db
        .insert(schema_1.users)
        .values({ name, email, password: await (0, hash_1.hashPassword)(password), role, isEmailVerified: false })
        .returning({ id: schema_1.users.id, email: schema_1.users.email, role: schema_1.users.role, isEmailVerified: schema_1.users.isEmailVerified });
    const token = (0, jwt_1.signVerifyToken)(email);
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    await (0, email_1.sendEmail)({
        to: email,
        subject: "Verify your Digital Heroes Golf account",
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h1 style="color:#1a1a1a">Verify your email 🏌️</h1>
        <p style="color:#444">Hi ${name ?? "there"}, click the button below to verify your account.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#999;font-size:12px">Link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
    `,
    });
    return { user };
}
exports.register = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = auth_validation_1.registerSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const { name, email, password } = parsed.data;
    const { user } = await registerUser(email, password, name, "USER");
    res.status(201).json(new apiResponse_1.ApiResponse(201, { user }, "Registered successfully. Please check your email to verify your account."));
});
exports.registerAdmin = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = auth_validation_1.registerSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const { name, email, password } = parsed.data;
    const { user } = await registerUser(email, password, name, "ADMIN");
    res.status(201).json(new apiResponse_1.ApiResponse(201, { user }, "Admin registered. Please check your email to verify your account."));
});
exports.verifyEmail = (0, asyncHandler_1.default)(async (req, res) => {
    const { token } = req.body;
    if (!token)
        throw new apiError_1.ApiError(400, "Token is required");
    let email;
    try {
        ({ email } = (0, jwt_1.verifyVerifyToken)(token));
    }
    catch {
        throw new apiError_1.ApiError(400, "Invalid or expired verification link");
    }
    await db_1.db.update(schema_1.users).set({ isEmailVerified: true }).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    const payload = { id: user.id, email: user.email, role: user.role };
    res.json(new apiResponse_1.ApiResponse(200, {
        accessToken: (0, jwt_1.signAccessToken)(payload),
        refreshToken: (0, jwt_1.signRefreshToken)(payload),
        role: user.role,
    }, "Email verified successfully"));
});
exports.resendVerification = (0, asyncHandler_1.default)(async (req, res) => {
    const { email } = req.body;
    if (!email)
        throw new apiError_1.ApiError(400, "Email is required");
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    if (user.isEmailVerified)
        throw new apiError_1.ApiError(400, "Email already verified");
    const token = (0, jwt_1.signVerifyToken)(email);
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    await (0, email_1.sendEmail)({
        to: email,
        subject: "Verify your Digital Heroes Golf account",
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24 hours.</p>`,
    });
    res.json(new apiResponse_1.ApiResponse(200, null, "Verification email resent"));
});
exports.login = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = auth_validation_1.loginSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const { email, password } = parsed.data;
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (!user || !(await (0, hash_1.comparePassword)(password, user.password)))
        throw new apiError_1.ApiError(401, "Invalid credentials");
    if (!user.isActive)
        throw new apiError_1.ApiError(403, "Account is deactivated");
    if (!user.isEmailVerified)
        throw new apiError_1.ApiError(403, "Please verify your email before logging in");
    const payload = { id: user.id, email: user.email, role: user.role };
    res.json(new apiResponse_1.ApiResponse(200, {
        accessToken: (0, jwt_1.signAccessToken)(payload),
        refreshToken: (0, jwt_1.signRefreshToken)(payload),
        role: user.role,
    }, "Login successful"));
});
exports.refreshToken = (0, asyncHandler_1.default)(async (req, res) => {
    const { token } = req.body;
    if (!token)
        throw new apiError_1.ApiError(400, "Refresh token required");
    try {
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        res.json(new apiResponse_1.ApiResponse(200, {
            accessToken: (0, jwt_1.signAccessToken)({ id: payload.id, email: payload.email, role: payload.role }),
        }, "Token refreshed"));
    }
    catch {
        throw new apiError_1.ApiError(401, "Invalid or expired refresh token");
    }
});
exports.getMe = (0, asyncHandler_1.default)(async (req, res) => {
    const [user] = await db_1.db
        .select({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role, isActive: schema_1.users.isActive, isEmailVerified: schema_1.users.isEmailVerified, createdAt: schema_1.users.createdAt })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id))
        .limit(1);
    if (!user)
        throw new apiError_1.ApiError(404, "User not found");
    res.json(new apiResponse_1.ApiResponse(200, { user }, "User fetched"));
});
exports.updateProfile = (0, asyncHandler_1.default)(async (req, res) => {
    const parsed = auth_validation_1.updateProfileSchema.safeParse(req.body);
    if (!parsed.success)
        throw new apiError_1.ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);
    const updateData = { ...parsed.data };
    if (parsed.data.password)
        updateData["password"] = await (0, hash_1.hashPassword)(parsed.data.password);
    const [updated] = await db_1.db
        .update(schema_1.users)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id))
        .returning({ id: schema_1.users.id, name: schema_1.users.name, email: schema_1.users.email, role: schema_1.users.role });
    res.json(new apiResponse_1.ApiResponse(200, { user: updated }, "Profile updated"));
});
