import { db } from "../db/db";
import { sql } from "drizzle-orm";

const RANGE = { min: 1, max: 45 };

// Random draw — standard lottery
export function randomDraw(): number[] {
  const nums = new Set<number>();
  while (nums.size < 5) {
    nums.add(Math.floor(Math.random() * (RANGE.max - RANGE.min + 1)) + RANGE.min);
  }
  return [...nums].sort((a, b) => a - b);
}

// Algorithm draw — weighted by most frequent scores across all users
export async function algorithmDraw(): Promise<number[]> {
  const rows = await db.execute<{ score: number; count: string }>(
    sql`SELECT score, COUNT(*) as count FROM scores GROUP BY score ORDER BY count DESC LIMIT 20`
  );

  const pool: number[] = [];
  for (const row of rows) {
    const weight = Math.min(Number(row.count), 5);
    for (let i = 0; i < weight; i++) pool.push(row.score);
  }

  // fallback if not enough data
  if (pool.length < 5) return randomDraw();

  const picked = new Set<number>();
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (const n of shuffled) {
    if (picked.size === 5) break;
    picked.add(n);
  }

  if (picked.size < 5) return randomDraw();
  return [...picked].sort((a, b) => a - b);
}

// Match user numbers against draw numbers
// Counts how many of the user's numbers appear in the winning numbers
// Thresholds scale with how many numbers the user has (min 3 to qualify)
export function getMatchType(userNums: number[], drawNums: number[]): "MATCH_5" | "MATCH_4" | "MATCH_3" | null {
  const matches = userNums.filter(n => drawNums.includes(n)).length;
  const total = userNums.length;

  // Need at least 3 matches to win anything
  if (matches < 3) return null;

  // If user has 5 numbers: 5=MATCH_5, 4=MATCH_4, 3=MATCH_3
  // If user has fewer numbers: scale proportionally
  if (total >= 5) {
    if (matches >= 5) return "MATCH_5";
    if (matches >= 4) return "MATCH_4";
    return "MATCH_3";
  }

  // For users with 3-4 scores: all 3+ matches count as MATCH_3
  // (they can't win jackpot without 5 scores — incentivises entering all 5)
  if (matches >= total && total === 4) return "MATCH_4"; // matched all 4
  if (matches >= total && total === 3) return "MATCH_3"; // matched all 3
  if (matches >= 3) return "MATCH_3";

  return null;
}
