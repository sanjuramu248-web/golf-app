import { Router } from "express";
import { getDraws, getDrawById, createDraw, simulateDraw, publishDraw } from "../controllers/draw.controller";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// public/user
router.get("/", authenticate, getDraws);
router.get("/:id", authenticate, getDrawById);

// admin
router.post("/", authenticate, requireAdmin, createDraw);
router.post("/simulate", authenticate, requireAdmin, simulateDraw);
router.post("/:id/publish", authenticate, requireAdmin, publishDraw);

export default router;
