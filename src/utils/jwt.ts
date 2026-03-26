import jwt from "jsonwebtoken";

export interface JwtPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload;

// Email verification tokens — short-lived, signed with access secret
export const signVerifyToken = (email: string) =>
  jwt.sign({ email }, ACCESS_SECRET, { expiresIn: "24h" });

export const verifyVerifyToken = (token: string): { email: string } =>
  jwt.verify(token, ACCESS_SECRET) as { email: string };
