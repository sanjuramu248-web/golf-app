import "dotenv/config";
import { db } from "./db";
import { charities, charityEvents } from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  // ── Plans ──────────────────────────────────────────────
  await db.execute(sql`
    INSERT INTO plans (name, type, price, description, is_active)
    VALUES
      ('Monthly', 'MONTHLY', 9.99, 'Monthly subscription — enter draws, track scores, support charity', true),
      ('Yearly',  'YEARLY',  99.99, 'Yearly subscription — save 17% vs monthly, all features included', true)
    ON CONFLICT (type) DO NOTHING
  `);
  console.log("✅ Plans seeded");

  // ── Charities ──────────────────────────────────────────
  const charitySeed = [
    {
      name: "Golf for Good",
      description: "Using the power of golf to raise funds for underprivileged youth programmes across the UK. Every swing counts.",
      isFeatured: true,
    },
    {
      name: "Fairway Foundation",
      description: "Supporting mental health initiatives through sport. We believe golf is more than a game — it's a lifeline.",
      isFeatured: true,
    },
    {
      name: "Green Hearts",
      description: "Environmental charity dedicated to preserving natural green spaces and promoting eco-friendly golf courses.",
      isFeatured: false,
    },
    {
      name: "Birdie for Life",
      description: "Funding cancer research and patient support through charity golf events and monthly subscription contributions.",
      isFeatured: false,
    },
    {
      name: "The 19th Hole",
      description: "Community-driven charity providing meals and shelter for homeless veterans through golf fundraising.",
      isFeatured: false,
    },
    {
      name: "Swing & Smile",
      description: "Bringing golf therapy to children with disabilities. Every subscription helps fund adaptive golf equipment.",
      isFeatured: false,
    },
    {
      name: "Eagle Education Fund",
      description: "Scholarships and educational support for young golfers from low-income backgrounds across the UK.",
      isFeatured: false,
    },
    {
      name: "Par for the Planet",
      description: "Climate action charity planting trees for every draw entry. Over 50,000 trees planted so far.",
      isFeatured: false,
    },
  ];

  const inserted = await db.insert(charities).values(
    charitySeed.map((c) => ({ ...c, image: null }))
  ).onConflictDoNothing().returning({ id: charities.id, name: charities.name });

  console.log(`✅ ${inserted.length} charities seeded`);

  // ── Charity Events ─────────────────────────────────────
  if (inserted.length > 0) {
    const golfForGood = inserted.find((c) => c.name === "Golf for Good");
    const fairway = inserted.find((c) => c.name === "Fairway Foundation");

    const events = [];

    if (golfForGood) {
      events.push(
        { charityId: golfForGood.id, title: "Summer Charity Golf Day", description: "Annual 18-hole charity scramble at Wentworth. All proceeds to youth programmes.", eventDate: new Date("2026-07-15") },
        { charityId: golfForGood.id, title: "Junior Golf Camp", description: "Free golf coaching for kids aged 8–16 from disadvantaged backgrounds.", eventDate: new Date("2026-08-10") }
      );
    }

    if (fairway) {
      events.push(
        { charityId: fairway.id, title: "Mental Health Awareness Round", description: "9-hole social round with mindfulness sessions. Open to all skill levels.", eventDate: new Date("2026-06-20") }
      );
    }

    if (events.length > 0) {
      await db.insert(charityEvents).values(events).onConflictDoNothing();
      console.log(`✅ ${events.length} charity events seeded`);
    }
  }

  console.log("🎉 Seed complete");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
