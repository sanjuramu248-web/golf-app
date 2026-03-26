"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
router.post("/webhook", express_2.default.raw({ type: "application/json" }), subscription_controller_1.stripeWebhook);
router.use(auth_middleware_1.authenticate);
router.get("/me", subscription_controller_1.getMySubscription);
router.post("/", subscription_controller_1.createSubscription);
router.post("/verify", subscription_controller_1.verifySession);
router.patch("/cancel", subscription_controller_1.cancelSubscription);
exports.default = router;
