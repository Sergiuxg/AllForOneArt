import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

function ensureDirSafe(dir: string) {
    try {
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    } catch {
        const fallback = path.join(process.cwd(), "data");
        fs.mkdirSync(fallback, { recursive: true });
        return fallback;
    }
}

const baseDir = ensureDirSafe(process.env.DB_DIR || "/var/data");
const dbPath = path.join(baseDir, "events.sqlite");

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    allDay INTEGER NOT NULL,
    color TEXT,
    data TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

export default db;