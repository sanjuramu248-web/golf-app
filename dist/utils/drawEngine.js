"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDraw = randomDraw;
exports.algorithmDraw = algorithmDraw;
exports.getMatchType = getMatchType;
const db_1 = require("../db/db");
const drizzle_orm_1 = require("drizzle-orm");
const RANGE = { min: 1, max: 45 };
function randomDraw() {
    const nums = new Set();
    while (nums.size < 5) {
        nums.add(Math.floor(Math.random() * (RANGE.max - RANGE.min + 1)) + RANGE.min);
    }
    return [...nums].sort((a, b) => a - b);
}
async function algorithmDraw() {
    const rows = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT score, COUNT(*) as count FROM scores GROUP BY score ORDER BY count DESC LIMIT 20`);
    const pool = [];
    for (const row of rows) {
        const weight = Math.min(Number(row.count), 5);
        for (let i = 0; i < weight; i++)
            pool.push(row.score);
    }
    if (pool.length < 5)
        return randomDraw();
    const picked = new Set();
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (const n of shuffled) {
        if (picked.size === 5)
            break;
        picked.add(n);
    }
    if (picked.size < 5)
        return randomDraw();
    return [...picked].sort((a, b) => a - b);
}
function getMatchType(userNums, drawNums) {
    const matches = userNums.filter(n => drawNums.includes(n)).length;
    const total = userNums.length;
    if (matches < 3)
        return null;
    if (total >= 5) {
        if (matches >= 5)
            return "MATCH_5";
        if (matches >= 4)
            return "MATCH_4";
        return "MATCH_3";
    }
    if (matches >= total && total === 4)
        return "MATCH_4";
    if (matches >= total && total === 3)
        return "MATCH_3";
    if (matches >= 3)
        return "MATCH_3";
    return null;
}
