import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      type plan_type NOT NULL UNIQUE,
      price DECIMAL(10,2) NOT NULL,
      stripe_price_id TEXT,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Plans table created");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
