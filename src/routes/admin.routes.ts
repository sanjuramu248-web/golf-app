import { Router } from "express";
import { getAllUsers, getUserById, updateUser, deactivateUser, adminUpdateScore, adminUpdateSubscription } from "../controllers/admin.user.controller";
import { getAnalytics } from "../controllers/admin.analytics.controller";
import { getAllPlans, updatePlan, syncStripePrices } from "../controllers/plan.controller";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, requireAdmin);

// users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deactivateUser);
router.patch("/scores/:scoreId", adminUpdateScore);
router.patch("/users/:userId/subscription", adminUpdateSubscription);

// analytics
router.get("/analytics", getAnalytics);

// plans
router.get("/plans", getAllPlans);
router.patch("/plans/:id", updatePlan);
router.post("/plans/sync-stripe", syncStripePrices);

export default router;
