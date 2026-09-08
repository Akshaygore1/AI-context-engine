import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "../config.js";

mkdirSync(dirname(config.databasePath), { recursive: true });
export const database = new Database(config.databasePath);
database.pragma("journal_mode = WAL");

export function initializeDatabase() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS kundli (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS horoscope (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS panchang (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);
  `);
}

export function seedDatabase() {
  initializeDatabase();
  const insert = (table: string, keyColumn: string, key: string | number, payload: unknown) =>
    database.prepare(`INSERT OR REPLACE INTO ${table} (${keyColumn}, payload) VALUES (?, ?)`).run(key, JSON.stringify(payload));

  insert("users", "id", "user_101", {
    id: "user_101", name: "Aarav", preferredLanguage: "English", preferredTone: "supportive", subscription: "free",
    birthDetails: { date: "1992-05-14", time: "08:30", place: "Mumbai, India" },
  });
  insert("kundli", "user_id", "user_101", {
    userId: "user_101", moonSign: "Taurus", currentDasha: "Jupiter Mahadasha encourages patient expansion and learning.",
    houses: { "6": "Steady routines support wellbeing.", "7": "Partnerships benefit from patient communication.", "10": "Saturn in the 10th house favors disciplined, durable career progress." },
    ascendant: "Virgo", planets: { sun: "Taurus", moon: "Taurus", saturn: "Capricorn", jupiter: "Virgo" },
  });
  insert("horoscope", "user_id", "user_101", {
    userId: "user_101", career: "A period for consolidating skills, seeking mentorship, and taking measured leadership opportunities.",
    relationship: "Clear communication and shared routines create steadiness.", health: "Consistency in rest and daily habits deserves attention.",
    finance: "Prefer deliberate planning and sustainable commitments over impulsive decisions.",
  });
  insert("panchang", "id", 1, {
    tithi: "Shukla Paksha Panchami", nakshatra: "Rohini", yoga: "Siddhi", guidance: "A constructive day for patient planning and practical beginnings.",
  });
}

export function readPayload(table: "users" | "kundli" | "horoscope" | "panchang", keyColumn: string, key: string | number) {
  const row = database.prepare(`SELECT payload FROM ${table} WHERE ${keyColumn} = ?`).get(key) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) as unknown : undefined;
}
