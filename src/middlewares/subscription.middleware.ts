import { Request, Response, NextFunction } from "express";
import { db } from "../db/db";
import { subscriptions } from "../db/schema";
import { eq, desc } from "drizzle-orm";

// Blocks access if user has no active subscription
export const requireSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, req.user!.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub || sub.status !== "ACTIVE") {
    res.status(403).json({ success: false, message: "Active subscription required" });
    return;
  }

  next();
};
