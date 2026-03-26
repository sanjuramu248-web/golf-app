import { Request, Response } from "express";
import { db } from "../db/db";
import { donations, charities, subscriptions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { donationSchema } from "../validation/charity.validation";
import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { sendEmail } from "../utils/email";

// POST /donations — independent donation not tied to gameplay
export const createDonation = asyncHandler(async (req: Request, res: Response) => {
  const parsed = donationSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Validation failed", parsed.error.flatten().fieldErrors);

  const { charityId, amount } = parsed.data;
  const userId = req.user!.id;

  // verify charity exists
  const [charity] = await db.select().from(charities).where(eq(charities.id, charityId)).limit(1);
  if (!charity) throw new ApiError(404, "Charity not found");

  const [donation] = await db.insert(donations).values({
    userId,
    charityId,
    amount: String(amount.toFixed(2)),
    status: "PENDING",
  }).returning();

  // send confirmation email
  await sendEmail({
    to: req.user!.email,
    subject: `Donation to ${charity.name} — Thank you!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h2>Thank you for your donation 🙏</h2>
        <p>Your donation of <b>£${amount.toFixed(2)}</b> to <b>${charity.name}</b> has been received.</p>
        <p style="color:#666;font-size:14px">This is an independent donation not tied to your subscription.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">Digital Heroes Golf · digitalheroes.co.in</p>
      </div>
    `,
  }).catch(() => {});

  res.status(201).json(new ApiResponse(201, { donation, charityAmount: amount, charityName: charity.name }, "Donation created"));
});

// GET /donations/me — user views own donations with charity contribution summary
export const getMyDonations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const myDonations = await db.select().from(donations)
    .where(eq(donations.userId, userId))
    .orderBy(desc(donations.createdAt));

  // calculate total donated
  const totalDonated = myDonations.reduce((sum, d) => sum + Number(d.amount), 0);

  // get active subscription to show what % is going to charity
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt)).limit(1);

  res.json(new ApiResponse(200, {
    donations: myDonations,
    summary: {
      totalDonated: totalDonated.toFixed(2),
      subscriptionContributions: myDonations.filter(d => d.providerId === null).length,
      independentDonations: myDonations.length,
      activeSubscription: sub?.status === "ACTIVE",
    },
  }, "Donations fetched"));
});
