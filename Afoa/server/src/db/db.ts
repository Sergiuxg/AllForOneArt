import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || "/var/data";

// NU încerca să creezi /var/data pe Render dacă nu ai disk
// Creează doar dacă e un path local (ex: ./data)
if (!DB_DIR.startsWith("/var/data")) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, "events.db");
const db = new Database(dbPath);

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
