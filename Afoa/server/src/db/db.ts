import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || "/var/data";   // Render disk
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const dbPath = path.join(DB_DIR, "events.db");
const db = new Database(dbPath);

// create tables (safe)
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    allDay INTEGER NOT NULL DEFAULT 1,
    color TEXT,
    data TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
`);

export default db;
