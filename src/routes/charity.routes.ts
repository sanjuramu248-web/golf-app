import { Router } from "express";
import {
  getCharities, getCharityById, createCharity, updateCharity, deleteCharity,
  addCharityEvent, selectCharity, getMyCharitySelection,
} from "../controllers/charity.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// public
router.get("/", getCharities);
router.get("/:id", getCharityById);

// user
router.post("/select", authenticate, selectCharity);
router.get("/my-selection", authenticate, getMyCharitySelection);

// admin
router.post("/", authenticate, requireAdmin, createCharity);
router.patch("/:id", authenticate, requireAdmin, updateCharity);
router.delete("/:id", authenticate, requireAdmin, deleteCharity);
router.post("/:id/events", authenticate, requireAdmin, addCharityEvent);

export default router;
