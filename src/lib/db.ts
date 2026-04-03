// @ts-expect-error node:sqlite is experimental in Node.js 22+
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "shadow-asset.db");

// Store in globalThis to survive Turbopack HMR module reloads
const G = globalThis as unknown as { __shadowAssetDb?: InstanceType<typeof DatabaseSync> };

function getDb(): InstanceType<typeof DatabaseSync> {
  if (G.__shadowAssetDb) return G.__shadowAssetDb;

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");

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

  G.__shadowAssetDb = db;
  return db;
}

export { getDb };
