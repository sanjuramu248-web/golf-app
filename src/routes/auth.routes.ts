import { Router } from "express";
import {
  register, registerAdmin, login, refreshToken,
  getMe, updateProfile, verifyEmail, resendVerification,
} from "../controllers/auth.controller";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

/* =========================
   PUBLIC
========================= */
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/verify-email", verifyEmail);          // called after clicking email link
router.post("/resend-verification", resendVerification);

/* =========================
   SUBSCRIBER
========================= */
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);

/* =========================
   ADMIN
========================= */
router.post("/register/admin", authenticate, requireAdmin, registerAdmin);

export default router;
