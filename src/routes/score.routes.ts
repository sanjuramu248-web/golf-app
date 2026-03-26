import { Router } from "express";
import { getMyScores, addScore, updateScore, deleteScore } from "../controllers/score.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getMyScores);
router.post("/", addScore);
router.patch("/:id", updateScore);
router.delete("/:id", deleteScore);

export default router;
