use std::collections::{HashMap, HashSet};

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManualAsset {
    pub id: i64,
    pub name: String,
    pub asset_class: String,
    pub value_jpy: Option<f64>,
    pub currency: Option<String>,
    pub amount: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ManualAssetWithJpy {
    #[serde(flatten)]
    pub asset: ManualAsset,
    pub converted_jpy: Option<f64>,
}

/// Extract unique currency codes that need forex conversion.
pub fn needed_forex_currencies(assets: &[ManualAsset]) -> Vec<String> {
    assets
        .iter()
        .filter_map(|a| a.currency.as_ref())
        .filter(|c| !c.is_empty())
        .cloned()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect()
}

/// Convert manual assets to JPY using forex rates.
/// Returns (converted assets, total JPY value).
pub fn convert_to_jpy(
    assets: Vec<ManualAsset>,
    forex_rates: &HashMap<String, f64>,
) -> (Vec<ManualAssetWithJpy>, f64) {
    let mut total = 0.0;
    let with_jpy = assets
        .into_iter()
        .map(|a| {
            let converted_jpy = if let (Some(currency), Some(amount)) = (&a.currency, a.amount) {
                forex_rates.get(currency.as_str()).map(|rate| amount * rate)
            } else {
                None
            };
            let jpy_value = converted_jpy.or(a.value_jpy).unwrap_or(0.0);
            total += jpy_value;
            ManualAssetWithJpy {
                asset: a,
                converted_jpy,
            }
        })
        .collect();
    (with_jpy, total)
}

#[derive(Debug, Deserialize)]
pub struct CreateManualAssetRequest {
    pub name: String,
    pub asset_class: String,
    pub value_jpy: Option<f64>,
    pub currency: Option<String>,
    pub amount: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateManualAssetRequest {
    pub id: i64,
    pub name: String,
    pub asset_class: String,
    pub value_jpy: Option<f64>,
    pub currency: Option<String>,
    pub amount: Option<f64>,
}

pub(crate) fn read_all(conn: &rusqlite::Connection) -> Result<Vec<ManualAsset>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, asset_class, value_jpy, currency, amount FROM manual_assets ORDER BY id")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(ManualAsset {
            id: row.get(0)?,
            name: row.get(1)?,
            asset_class: row.get(2)?,
            value_jpy: row.get(3)?,
            currency: row.get(4)?,
            amount: row.get(5)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn get_manual_assets(state: State<AppState>) -> Result<Vec<ManualAsset>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;
    read_all(conn)
}

#[tauri::command]
pub fn create_manual_asset(
    state: State<AppState>,
    request: CreateManualAssetRequest,
) -> Result<ManualAsset, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute(
        "INSERT INTO manual_assets (name, asset_class, value_jpy, currency, amount)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![request.name, request.asset_class, request.value_jpy, request.currency, request.amount],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(ManualAsset {
        id,
        name: request.name,
        asset_class: request.asset_class,
        value_jpy: request.value_jpy,
        currency: request.currency,
        amount: request.amount,
    })
}

#[tauri::command]
pub fn update_manual_asset(
    state: State<AppState>,
    request: UpdateManualAssetRequest,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let updated = conn.execute(
        "UPDATE manual_assets SET name = ?1, asset_class = ?2, value_jpy = ?3, currency = ?4, amount = ?5
         WHERE id = ?6",
        params![request.name, request.asset_class, request.value_jpy, request.currency, request.amount, request.id],
    )
    .map_err(|e| e.to_string())?;

    if updated == 0 {
        return Err(format!("manual asset {} not found", request.id));
    }

    Ok(())
}

#[tauri::command]
pub fn delete_manual_asset(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    conn.execute("DELETE FROM manual_assets WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
