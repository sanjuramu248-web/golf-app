import { Request, Response } from "express";
import { supabase } from "../utils/supabase";
import { db } from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";

type OAuthProvider = "google" | "github" | "facebook";

// GET /api/oauth/:provider
export const oauthRedirect = asyncHandler(async (req: Request, res: Response) => {
  const provider = String(req.params["provider"]) as OAuthProvider;
  const allowed: OAuthProvider[] = ["google", "github", "facebook"];
  if (!allowed.includes(provider)) throw new ApiError(400, "Unsupported OAuth provider");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${process.env.FRONTEND_URL}/auth/callback` },
  });

  if (error || !data.url) throw new ApiError(500, "Failed to generate OAuth URL");
  res.redirect(data.url);
});

// POST /api/oauth/callback — frontend sends supabase access_token, gets app JWT
export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const { access_token } = req.body;
  if (!access_token) throw new ApiError(400, "Access token required");

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data.user) throw new ApiError(401, "Invalid Supabase token");

  const email = data.user.email;
  const name = data.user.user_metadata?.["full_name"] ?? data.user.user_metadata?.["name"] ?? null;
  if (!email) throw new ApiError(400, "Email not provided by OAuth provider");

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    [user] = await db.insert(users)
      .values({ email, name, password: "", role: "USER", isActive: true, isEmailVerified: true })
      .returning();
  }

  if (!user!.isActive) throw new ApiError(403, "Account is deactivated");

  const payload = { id: user!.id, email: user!.email, role: user!.role! };
  res.json(new ApiResponse(200, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    role: user!.role,
  }, "OAuth login successful"));
});
