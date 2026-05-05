use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Holding {
    pub id: i64,
    pub account_id: i64,
    pub ticker: String,
    pub name: String,
    pub quantity: f64,
    pub holding_type: String,
    pub as_of: Option<String>,
    pub monthly_amount: Option<f64>,
    pub asset_class: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHoldingRequest {
    pub account_id: i64,
    pub ticker: String,
    pub name: String,
    pub quantity: f64,
    pub holding_type: String,
    pub monthly_amount: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHoldingRequest {
    pub id: i64,
    pub ticker: String,
    pub name: String,
    pub quantity: f64,
    pub holding_type: String,
    pub monthly_amount: Option<f64>,
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[tauri::command]
pub fn get_holdings(state: State<AppState>) -> Result<Vec<Holding>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, account_id, ticker, name, quantity, holding_type, as_of, monthly_amount, asset_class
             FROM holdings ORDER BY id",
        )
        .map_err(|e| e.to_string())?;

    let holdings = stmt
        .query_map([], |row| {
            Ok(Holding {
                id: row.get(0)?,
                account_id: row.get(1)?,
                ticker: row.get(2)?,
                name: row.get(3)?,
                quantity: row.get(4)?,
                holding_type: row.get(5)?,
                as_of: row.get(6)?,
                monthly_amount: row.get(7)?,
                asset_class: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(holdings)
}

#[tauri::command]
pub fn create_holding(
    state: State<AppState>,
    request: CreateHoldingRequest,
) -> Result<Holding, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    // Stamp as_of when a real quantity is set so monthly contribution estimation has a baseline.
    let as_of = if request.quantity > 0.0 { Some(today()) } else { None };

    conn.execute(
        "INSERT INTO holdings (account_id, ticker, name, quantity, holding_type, as_of, monthly_amount)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            request.account_id,
            request.ticker,
            request.name,
            request.quantity,
            request.holding_type,
            as_of,
            request.monthly_amount,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Holding {
        id,
        account_id: request.account_id,
        ticker: request.ticker,
        name: request.name,
        quantity: request.quantity,
        holding_type: request.holding_type,
        as_of,
        monthly_amount: request.monthly_amount,
        asset_class: None,
    })
}

#[tauri::command]
pub fn update_holding(
    state: State<AppState>,
    request: UpdateHoldingRequest,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    // 保存 implies the user is confirming the displayed quantity as of now,
    // so always re-stamp as_of to today.
    conn.execute(
        "UPDATE holdings SET ticker = ?1, name = ?2, quantity = ?3, holding_type = ?4, as_of = ?5, monthly_amount = ?6
         WHERE id = ?7",
        params![
            request.ticker,
            request.name,
            request.quantity,
            request.holding_type,
            today(),
            request.monthly_amount,
            request.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_holding(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute("DELETE FROM holdings WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
