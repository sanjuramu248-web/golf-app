import { z } from "zod";

export const createCharitySchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  image: z.url().optional(),
  isFeatured: z.boolean().optional().default(false),
});

export const updateCharitySchema = createCharitySchema.partial();

// User selects a charity and sets contribution %
export const selectCharitySchema = z.object({
  charityId: z.uuid(),
  contributionPercent: z.number().int().min(10).max(100).default(10),
});

// Charity event (e.g. upcoming golf day)
export const createCharityEventSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  eventDate: z.iso.datetime(),
});

export const updateCharityEventSchema = createCharityEventSchema.partial();

// Independent donation not tied to gameplay — min £1
export const donationSchema = z.object({
  charityId: z.uuid(),
  amount: z.number().min(1, "Minimum donation is £1").multipleOf(0.01),
});

export type CreateCharityInput = z.infer<typeof createCharitySchema>;
export type UpdateCharityInput = z.infer<typeof updateCharitySchema>;
export type SelectCharityInput = z.infer<typeof selectCharitySchema>;
export type CreateCharityEventInput = z.infer<typeof createCharityEventSchema>;
export type UpdateCharityEventInput = z.infer<typeof updateCharityEventSchema>;
export type DonationInput = z.infer<typeof donationSchema>;
