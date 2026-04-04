use rusqlite::params;
use serde::Serialize;
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Clone)]
pub struct Snapshot {
    pub id: i64,
    pub date: String,
    pub total_jpy: f64,
    pub breakdown_json: String,
}

#[tauri::command]
pub fn get_snapshots(state: State<AppState>, days: Option<i64>) -> Result<Vec<Snapshot>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let days = days.unwrap_or(90);
    let mut stmt = conn
        .prepare(
            "SELECT id, date, total_jpy, breakdown_json FROM snapshots
             WHERE date >= date('now', ?1)
             ORDER BY date DESC",
        )
        .map_err(|e| e.to_string())?;

    let offset = format!("-{} days", days);
    let snapshots = stmt
        .query_map(params![offset], |row| {
            Ok(Snapshot {
                id: row.get(0)?,
                date: row.get(1)?,
                total_jpy: row.get(2)?,
                breakdown_json: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(snapshots)
}
