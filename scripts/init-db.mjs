import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "shadow-asset.db");

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    holding_type TEXT NOT NULL,
    as_of TEXT,
    monthly_amount REAL
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    total_jpy REAL NOT NULL,
    breakdown_json TEXT NOT NULL
  );
`);

console.log("Database initialized:", dbPath);
db.close();
