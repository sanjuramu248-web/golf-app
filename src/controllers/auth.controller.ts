import { Request, Response } from "express";
import { db } from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword } from "../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken, signVerifyToken, verifyVerifyToken } from "../utils/jwt";
import { registerSchema, loginSchema, updateProfileSchema } from "../validation/auth.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { sendEmail } from "../utils/email";

// helper — creates user in DB and sends verification email via Gmail
async function registerUser(email: string, password: string, name: string | undefined, role: "USER" | "ADMIN") {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) throw new ApiError(409, "Email already registered");

  const [user] = await db
    .insert(users)
    .values({ name, email, password: await hashPassword(password), role, isEmailVerified: false })
    .returning({ id: users.id, email: users.email, role: users.role, isEmailVerified: users.isEmailVerified });

  // generate verification token and send email
  const token = signVerifyToken(email);
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

  await sendEmail({
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
// POST /api/auth/register — public user registration
export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const { name, email, password } = parsed.data;
  const { user } = await registerUser(email, password, name, "USER");

  res.status(201).json(new ApiResponse(201, { user }, "Registered successfully. Please check your email to verify your account."));
});

// POST /api/auth/register/admin — admin only
export const registerAdmin = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const { name, email, password } = parsed.data;
  const { user } = await registerUser(email, password, name, "ADMIN");

  res.status(201).json(new ApiResponse(201, { user }, "Admin registered. Please check your email to verify your account."));
});

// POST /api/auth/verify-email — frontend sends token from URL query param
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, "Token is required");

  let email: string;
  try {
    ({ email } = verifyVerifyToken(token));
  } catch {
    throw new ApiError(400, "Invalid or expired verification link");
  }

  await db.update(users).set({ isEmailVerified: true }).where(eq(users.email, email));

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new ApiError(404, "User not found");

  const payload = { id: user.id, email: user.email, role: user.role! };

  res.json(new ApiResponse(200, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    role: user.role,
  }, "Email verified successfully"));
});

// POST /api/auth/resend-verification
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new ApiError(404, "User not found");
  if (user.isEmailVerified) throw new ApiError(400, "Email already verified");

  const token = signVerifyToken(email);
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your Digital Heroes Golf account",
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24 hours.</p>`,
  });

  res.json(new ApiResponse(200, null, "Verification email resent"));
});

// POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await comparePassword(password, user.password))) throw new ApiError(401, "Invalid credentials");
  if (!user.isActive) throw new ApiError(403, "Account is deactivated");
  if (!user.isEmailVerified) throw new ApiError(403, "Please verify your email before logging in");

  const payload = { id: user.id, email: user.email, role: user.role! };

  res.json(new ApiResponse(200, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    role: user.role,
  }, "Login successful"));
});

// POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, "Refresh token required");

  try {
    const payload = verifyRefreshToken(token);
    res.json(new ApiResponse(200, {
      accessToken: signAccessToken({ id: payload.id, email: payload.email, role: payload.role }),
    }, "Token refreshed"));
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, isEmailVerified: users.isEmailVerified, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, req.user!.id))
    .limit(1);

  if (!user) throw new ApiError(404, "User not found");
  res.json(new ApiResponse(200, { user }, "User fetched"));
});

// PATCH /api/auth/me
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) updateData["password"] = await hashPassword(parsed.data.password);

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, req.user!.id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  res.json(new ApiResponse(200, { user: updated }, "Profile updated"));
});
