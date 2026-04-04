use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
struct ExportAccount {
    name: String,
    #[serde(rename = "type")]
    account_type: String,
    sort_order: i64,
    holdings: Vec<ExportHolding>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportHolding {
    ticker: String,
    name: String,
    quantity: f64,
    holding_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    as_of: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    monthly_amount: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportSnapshot {
    date: String,
    total_jpy: f64,
    breakdown_json: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportData {
    version: u32,
    exported_at: String,
    accounts: Vec<ExportAccount>,
    snapshots: Vec<ExportSnapshot>,
}

#[tauri::command]
pub fn export_data(state: State<AppState>, path: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    // Read accounts
    let mut stmt = conn
        .prepare("SELECT id, name, type, sort_order FROM accounts ORDER BY sort_order, id")
        .map_err(|e| e.to_string())?;

    let accounts: Vec<(i64, String, String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Read holdings per account
    let mut holdings_stmt = conn
        .prepare(
            "SELECT ticker, name, quantity, holding_type, as_of, monthly_amount
             FROM holdings WHERE account_id = ?1 ORDER BY id",
        )
        .map_err(|e| e.to_string())?;

    let export_accounts: Vec<ExportAccount> = accounts
        .into_iter()
        .map(|(id, name, account_type, sort_order)| {
            let holdings = holdings_stmt
                .query_map(params![id], |row| {
                    Ok(ExportHolding {
                        ticker: row.get(0)?,
                        name: row.get(1)?,
                        quantity: row.get(2)?,
                        holding_type: row.get(3)?,
                        as_of: row.get(4)?,
                        monthly_amount: row.get(5)?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            Ok(ExportAccount {
                name,
                account_type,
                sort_order,
                holdings,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    // Read snapshots
    let mut snap_stmt = conn
        .prepare("SELECT date, total_jpy, breakdown_json FROM snapshots ORDER BY date")
        .map_err(|e| e.to_string())?;

    let snapshots = snap_stmt
        .query_map([], |row| {
            Ok(ExportSnapshot {
                date: row.get(0)?,
                total_jpy: row.get(1)?,
                breakdown_json: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let export = ExportData {
        version: 1,
        exported_at: chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%:z").to_string(),
        accounts: export_accounts,
        snapshots,
    };

    let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn import_data(state: State<AppState>, path: String) -> Result<(), String> {
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: ExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    if data.version != 1 {
        return Err(format!("unsupported export version: {}", data.version));
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| e.to_string())?;

    // Clear existing data (accounts CASCADE deletes holdings)
    tx.execute("DELETE FROM snapshots", [])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM accounts", [])
        .map_err(|e| e.to_string())?;

    // Insert accounts and their holdings
    for account in &data.accounts {
        tx.execute(
            "INSERT INTO accounts (name, type, sort_order) VALUES (?1, ?2, ?3)",
            params![account.name, account.account_type, account.sort_order],
        )
        .map_err(|e| e.to_string())?;

        let account_id = tx.last_insert_rowid();

        for holding in &account.holdings {
            tx.execute(
                "INSERT INTO holdings (account_id, ticker, name, quantity, holding_type, as_of, monthly_amount)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    account_id,
                    holding.ticker,
                    holding.name,
                    holding.quantity,
                    holding.holding_type,
                    holding.as_of,
                    holding.monthly_amount,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Insert snapshots
    for snapshot in &data.snapshots {
        tx.execute(
            "INSERT INTO snapshots (date, total_jpy, breakdown_json) VALUES (?1, ?2, ?3)",
            params![snapshot.date, snapshot.total_jpy, snapshot.breakdown_json],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
