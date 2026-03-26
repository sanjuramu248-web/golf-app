import { z } from "zod";

export const addScoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  playedAt: z.iso.datetime(),
});

export const updateScoreSchema = addScoreSchema.partial();

export type AddScoreInput = z.infer<typeof addScoreSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;
