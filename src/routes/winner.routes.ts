import { Router } from "express";
import { getMyWinnings, uploadProof, getAllWinners, verifyWinner, markPaid } from "../controllers/winner.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// user
router.get("/me", authenticate, getMyWinnings);
router.patch("/:id/proof", authenticate, uploadProof);

// admin
router.get("/", authenticate, requireAdmin, getAllWinners);
router.patch("/:id/verify", authenticate, requireAdmin, verifyWinner);
router.patch("/:id/pay", authenticate, requireAdmin, markPaid);

export default router;
