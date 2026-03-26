import { z } from "zod";

const drawNumbersSchema = z
  .array(z.number().int().min(1).max(45))
  .length(5);

export const createDrawSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  drawType: z.enum(["RANDOM", "ALGORITHM"]),
});

export const publishDrawSchema = z.object({
  numbers: drawNumbersSchema,
});

export const simulateDrawSchema = z.object({
  drawType: z.enum(["RANDOM", "ALGORITHM"]),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
});

export type CreateDrawInput = z.infer<typeof createDrawSchema>;
export type PublishDrawInput = z.infer<typeof publishDrawSchema>;
export type SimulateDrawInput = z.infer<typeof simulateDrawSchema>;
