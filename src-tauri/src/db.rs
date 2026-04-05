use rusqlite::Connection;
use std::fs;
use tauri::{AppHandle, Manager};

pub fn initialize(app_handle: &AppHandle) -> Connection {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    fs::create_dir_all(&app_dir).expect("failed to create app data dir");

    let db_path = app_dir.join("shadow-asset.db");
    let conn = Connection::open(db_path).expect("failed to open database");

    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA busy_timeout=5000;
         PRAGMA foreign_keys=ON;",
    )
    .expect("failed to set pragmas");

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS accounts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            type       TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS holdings (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            ticker         TEXT NOT NULL,
            name           TEXT NOT NULL,
            quantity       REAL NOT NULL DEFAULT 0,
            holding_type   TEXT NOT NULL,
            as_of          TEXT,
            monthly_amount REAL
        );

        CREATE TABLE IF NOT EXISTS snapshots (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            date           TEXT NOT NULL UNIQUE,
            total_jpy      REAL NOT NULL,
            breakdown_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS holding_snapshots (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            date       TEXT NOT NULL,
            holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
            value_jpy  REAL NOT NULL,
            UNIQUE(date, holding_id)
        );",
    )
    .expect("failed to create tables");

    conn
}
