const Database = require("better-sqlite3");
const db = new Database("events.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    allDay INTEGER NOT NULL,
    color TEXT,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

module.exports = db;

export default db;
