"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSubscription = void 0;
const db_1 = require("../db/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const requireSubscription = async (req, res, next) => {
    const [sub] = await db_1.db
        .select()
        .from(schema_1.subscriptions)
        .where((0, drizzle_orm_1.eq)(schema_1.subscriptions.userId, req.user.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.subscriptions.createdAt))
        .limit(1);
    if (!sub || sub.status !== "ACTIVE") {
        res.status(403).json({ success: false, message: "Active subscription required" });
        return;
    }
    next();
};
exports.requireSubscription = requireSubscription;
