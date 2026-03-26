import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import scoreRoutes from "./routes/score.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import charityRoutes from "./routes/charity.routes";
import winnerRoutes from "./routes/winner.routes";
import adminRoutes from "./routes/admin.routes";
import drawRoutes from "./routes/draw.routes";
import oauthRoutes from "./routes/oauth.routes";
import { getPlans } from "./controllers/plan.controller";
import { authenticate } from "./middlewares/auth.middleware";
import { requireSubscription } from "./middlewares/subscription.middleware";
import { getDashboard } from "./controllers/dashboard.controller";
import { createDonation, getMyDonations } from "./controllers/donation.controller";

const app = express();

app.use(cors());
app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/plans", getPlans); // public

app.use("/api/auth", authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/admin", adminRoutes);

// dashboard — requires active subscription
app.get("/api/dashboard", authenticate, requireSubscription, getDashboard);

// donations
app.post("/api/donations", authenticate, createDonation);
app.get("/api/donations/me", authenticate, getMyDonations);

app.use(errorHandler);

export { app };
