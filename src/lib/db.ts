/**
 * SQLite database for user accounts and settings.
 * Uses sql.js (pure JS, no native bindings needed).
 * Data persists to data/dragon-editor.db.
 */
// @ts-ignore — sql.js has no type declarations
import initSqlJs from "sql.js";
type Database = any;
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "dragon-editor.db");
const AUTH_SECRET = process.env.AUTH_SECRET || "dragon-editor-dev-secret";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB or create new
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'local',
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`${AUTH_SECRET}:${password}`).digest("hex");
}

export function makeToken(username: string): string {
  return crypto.createHash("sha256").update(`${AUTH_SECRET}:token:${username}`).digest("hex");
}

export function verifyToken(token: string, db: Database): string | null {
  const rows = db.exec("SELECT username FROM users");
  if (!rows.length) return null;
  for (const row of rows[0].values) {
    const username = row[0] as string;
    if (makeToken(username) === token) return username;
  }
  return null;
}
