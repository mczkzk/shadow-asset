use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub sort_order: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub sort_order: i64,
}

#[tauri::command]
pub fn get_accounts(state: State<AppState>) -> Result<Vec<Account>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, sort_order FROM accounts ORDER BY
             CASE type
               WHEN 'nisa' THEN 1
               WHEN 'ideco' THEN 2
               WHEN 'tokutei' THEN 3
               WHEN 'dc' THEN 4
               WHEN 'crypto' THEN 5
               WHEN 'gold' THEN 6
               ELSE 7
             END, name"
        )
        .map_err(|e| e.to_string())?;

    let accounts = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type: row.get(2)?,
                sort_order: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(accounts)
}

#[tauri::command]
pub fn create_account(
    state: State<AppState>,
    request: CreateAccountRequest,
) -> Result<Account, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute(
        "INSERT INTO accounts (name, type) VALUES (?1, ?2)",
        params![request.name, request.account_type],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Account {
        id,
        name: request.name,
        account_type: request.account_type,
        sort_order: 0,
    })
}

#[tauri::command]
pub fn update_account(
    state: State<AppState>,
    request: UpdateAccountRequest,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute(
        "UPDATE accounts SET name = ?1, type = ?2, sort_order = ?3 WHERE id = ?4",
        params![request.name, request.account_type, request.sort_order, request.id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_account(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
