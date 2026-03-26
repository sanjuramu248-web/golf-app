"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthCallback = exports.oauthRedirect = void 0;
const supabase_1 = require("../utils/supabase");
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const jwt_1 = require("../utils/jwt");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const apiError_1 = require("../utils/apiError");
const apiResponse_1 = require("../utils/apiResponse");
exports.oauthRedirect = (0, asyncHandler_1.default)(async (req, res) => {
    const provider = String(req.params["provider"]);
    const allowed = ["google", "github", "facebook"];
    if (!allowed.includes(provider))
        throw new apiError_1.ApiError(400, "Unsupported OAuth provider");
    const { data, error } = await supabase_1.supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${process.env.FRONTEND_URL}/auth/callback` },
    });
    if (error || !data.url)
        throw new apiError_1.ApiError(500, "Failed to generate OAuth URL");
    res.redirect(data.url);
});
exports.oauthCallback = (0, asyncHandler_1.default)(async (req, res) => {
    const { access_token } = req.body;
    if (!access_token)
        throw new apiError_1.ApiError(400, "Access token required");
    const { data, error } = await supabase_1.supabase.auth.getUser(access_token);
    if (error || !data.user)
        throw new apiError_1.ApiError(401, "Invalid Supabase token");
    const email = data.user.email;
    const name = data.user.user_metadata?.["full_name"] ?? data.user.user_metadata?.["name"] ?? null;
    if (!email)
        throw new apiError_1.ApiError(400, "Email not provided by OAuth provider");
    let [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (!user) {
        [user] = await db_1.db.insert(schema_1.users)
            .values({ email, name, password: "", role: "USER", isActive: true, isEmailVerified: true })
            .returning();
    }
    if (!user.isActive)
        throw new apiError_1.ApiError(403, "Account is deactivated");
    const payload = { id: user.id, email: user.email, role: user.role };
    res.json(new apiResponse_1.ApiResponse(200, {
        accessToken: (0, jwt_1.signAccessToken)(payload),
        refreshToken: (0, jwt_1.signRefreshToken)(payload),
        role: user.role,
    }, "OAuth login successful"));
});
