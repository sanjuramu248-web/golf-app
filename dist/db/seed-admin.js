"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seedAdmin() {
    const email = "amarjeetchoudhary109@gmail.com";
    const password = "Admin@123";
    const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (existing.length > 0) {
        console.log(`⚠️  Admin already exists: ${email}`);
        process.exit(0);
    }
    const hashed = await bcrypt_1.default.hash(password, 10);
    const [admin] = await db_1.db.insert(schema_1.users).values({
        name: "Digital Heroes Admin",
        email,
        password: hashed,
        role: "ADMIN",
        isActive: true,
        isEmailVerified: true,
    }).returning({ id: schema_1.users.id, email: schema_1.users.email, role: schema_1.users.role });
    console.log("✅ Admin created:");
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${admin.role}`);
    process.exit(0);
}
seedAdmin().catch((e) => { console.error(e); process.exit(1); });
