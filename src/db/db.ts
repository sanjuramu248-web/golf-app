import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });

export async function connectionDb() {
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connected");
}