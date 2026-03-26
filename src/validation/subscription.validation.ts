import { z } from "zod";

export const createSubscriptionSchema = z.object({
  plan: z.enum(["MONTHLY", "YEARLY"]),
  stripeSubId: z.string().optional(),
});

// Admin: update subscription status or extend end date
export const updateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"]).optional(),
  endDate: z.iso.datetime().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
