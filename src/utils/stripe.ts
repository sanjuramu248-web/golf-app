import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const PLANS = {
  MONTHLY: { priceId: process.env.STRIPE_MONTHLY_PRICE_ID!, amount: 9.99 },
  YEARLY:  { priceId: process.env.STRIPE_YEARLY_PRICE_ID!,  amount: 99.99 },
};
