import { z } from "zod";

export const uploadProofSchema = z.object({
  proofUrl: z.url(),
});

// Admin: verify or reject a winner submission
export const verifyWinnerSchema = z.object({
  isVerified: z.boolean(),
  paymentStatus: z.enum(["PENDING", "PAID", "REJECTED"]).optional(),
  rejectedReason: z.string().max(500).optional(),
}).refine(
  (data) => data.isVerified || data.rejectedReason !== undefined,
  { message: "rejectedReason is required when rejecting a submission", path: ["rejectedReason"] }
);

// Admin: mark payout as completed
export const markPaidSchema = z.object({
  paymentStatus: z.literal("PAID"),
});

export type UploadProofInput = z.infer<typeof uploadProofSchema>;
export type VerifyWinnerInput = z.infer<typeof verifyWinnerSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
