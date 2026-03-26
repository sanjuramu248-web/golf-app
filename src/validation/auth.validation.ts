import { z } from "zod";

export const roleEnum = z.enum(["USER", "ADMIN"]);

export const registerSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Admin: update a user's role
export const updateUserRoleSchema = z.object({
  role: roleEnum,
});

// Admin: edit user profile
export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.email().optional(),
  isActive: z.boolean().optional(),
  role: roleEnum.optional(),
});

// User: update own profile
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.email().optional(),
  password: z.string().min(8).max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
