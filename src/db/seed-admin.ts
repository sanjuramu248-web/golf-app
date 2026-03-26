import "dotenv/config";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seedAdmin() {
  const email = "amarjeetchoudhary109@gmail.com";
  const password = "Admin@123";

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`⚠️  Admin already exists: ${email}`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);

  const [admin] = await db.insert(users).values({
    name: "Digital Heroes Admin",
    email,
    password: hashed,
    role: "ADMIN",
    isActive: true,
    isEmailVerified: true,
  }).returning({ id: users.id, email: users.email, role: users.role });

  console.log("✅ Admin created:");
  console.log(`   Email:    ${admin!.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     ${admin!.role}`);
  process.exit(0);
}

seedAdmin().catch((e) => { console.error(e); process.exit(1); });
