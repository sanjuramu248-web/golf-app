"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANS = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
});
exports.PLANS = {
    MONTHLY: { priceId: process.env.STRIPE_MONTHLY_PRICE_ID, amount: 9.99 },
    YEARLY: { priceId: process.env.STRIPE_YEARLY_PRICE_ID, amount: 99.99 },
};
