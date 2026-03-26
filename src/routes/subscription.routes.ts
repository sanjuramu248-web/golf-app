import { Router } from "express";
import { getMySubscription, createSubscription, verifySession, cancelSubscription, stripeWebhook } from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";
import express from "express";

const router = Router();

// Stripe webhook — raw body, no auth
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

router.use(authenticate);
router.get("/me", getMySubscription);
router.post("/", createSubscription);
router.post("/verify", verifySession);   // called after Stripe redirect with session_id
router.patch("/cancel", cancelSubscription);

export default router;
