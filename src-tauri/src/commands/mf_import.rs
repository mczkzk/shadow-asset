use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;
use super::csv_import::read_shift_jis;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfImportPreview {
    pub rows: Vec<MfPreviewRow>,
    pub skipped_today: bool,
    pub skipped_existing: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfPreviewRow {
    pub date: String,
    pub total_jpy: f64,
    pub breakdown_json: String,
}

#[derive(Debug, Serialize)]
pub struct MfImportResult {
    imported: usize,
}

fn build_breakdown_json(fund: f64, stock: f64, bond: f64) -> String {
    let mut items = Vec::new();
    if fund > 0.0 {
        items.push(format!(
            r##"{{"name":"投資信託","type":"投資信託","value":{fund},"color":"#4F46E5"}}"##
        ));
    }
    if stock > 0.0 {
        items.push(format!(
            r##"{{"name":"株式","type":"株式","value":{stock},"color":"#059669"}}"##
        ));
    }
    if bond > 0.0 {
        items.push(format!(
            r##"{{"name":"債券","type":"債券","value":{bond},"color":"#8B5CF6"}}"##
        ));
    }
    format!("[{}]", items.join(","))
}

fn parse_mf_csv(content: &str) -> Result<Vec<MfPreviewRow>, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    let mut rows = Vec::new();

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV parse error: {e}"))?;
        if record.len() < 10 {
            continue;
        }

        let date_raw = record.get(0).unwrap_or("").trim().trim_matches('"');
        let date = date_raw.replace('/', "-");

        let parse_amount = |idx: usize| -> f64 {
            record
                .get(idx)
                .unwrap_or("0")
                .trim()
                .trim_matches('"')
                .replace(',', "")
                .parse::<f64>()
                .unwrap_or(0.0)
        };

        let total = parse_amount(1);
        let stock = parse_amount(3);       // 株式(現物) → 株式
        let fund = parse_amount(4)         // 投資信託 → 投資信託
                 + parse_amount(7);        // 年金(iDeCo/DC) → 投資信託
        let bond = parse_amount(5);        // 債券 → 債券

        if total <= 0.0 {
            continue;
        }

        rows.push(MfPreviewRow {
            date,
            total_jpy: total,
            breakdown_json: build_breakdown_json(fund, stock, bond),
        });
    }

    Ok(rows)
}

#[tauri::command]
pub fn preview_mf_import(state: State<AppState>, path: String) -> Result<MfImportPreview, String> {
    let content = read_shift_jis(&path)?;
    let all_rows = parse_mf_csv(&content)?;
    if all_rows.is_empty() {
        return Err("CSVにデータが見つかりませんでした".into());
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let skipped_today = all_rows.iter().any(|r| r.date == today);

    // Batch query: fetch all existing snapshot dates in one go
    let mut stmt = conn
        .prepare("SELECT date FROM snapshots")
        .map_err(|e| e.to_string())?;
    let existing_dates: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut rows = Vec::new();
    let mut skipped_existing = 0usize;

    for row in all_rows {
        if row.date == today {
            continue;
        }
        if existing_dates.contains(&row.date) {
            skipped_existing += 1;
        } else {
            rows.push(row);
        }
    }

    Ok(MfImportPreview {
        rows,
        skipped_today,
        skipped_existing,
    })
}

#[tauri::command]
pub fn apply_mf_import(
    state: State<AppState>,
    rows: Vec<MfPreviewRow>,
) -> Result<MfImportResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let mut imported = 0usize;
    for row in &rows {
        let result = tx.execute(
            "INSERT OR IGNORE INTO snapshots (date, total_jpy, breakdown_json) VALUES (?1, ?2, ?3)",
            params![row.date, row.total_jpy, row.breakdown_json],
        ).map_err(|e| e.to_string())?;
        if result > 0 {
            imported += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(MfImportResult { imported })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_mf_csv_basic() {
        let csv = r#""日付","合計（円）","預金・現金・暗号資産（円）","株式(現物)（円）","投資信託（円）","債券（円）","保険（円）","年金（円）","ポイント（円）","その他の資産（円）"
"2026/04/04","10000000","1000000","3000000","4000000","500000","200000","800000","100","500000"
"2026/04/03","9500000","900000","2800000","3900000","0","200000","750000","50","450000""#;

        let rows = parse_mf_csv(csv).unwrap();
        assert_eq!(rows.len(), 2);

        assert_eq!(rows[0].date, "2026-04-04");
        assert_eq!(rows[0].total_jpy, 10000000.0);

        let breakdown: Vec<serde_json::Value> =
            serde_json::from_str(&rows[0].breakdown_json).unwrap();
        assert_eq!(breakdown.len(), 3);

        // 投資信託 = funds(4000000) + pension(800000)
        assert_eq!(breakdown[0]["name"], "投資信託");
        assert_eq!(breakdown[0]["value"].as_f64().unwrap(), 4000000.0 + 800000.0);

        // 株式 = stocks(3000000)
        assert_eq!(breakdown[1]["name"], "株式");
        assert_eq!(breakdown[1]["value"].as_f64().unwrap(), 3000000.0);

        // 債券 = 500000
        assert_eq!(breakdown[2]["name"], "債券");
        assert_eq!(breakdown[2]["value"].as_f64().unwrap(), 500000.0);
    }

    #[test]
    fn no_bond_when_zero() {
        let json = build_breakdown_json(1000.0, 500.0, 0.0);
        let parsed: Vec<serde_json::Value> = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0]["name"], "投資信託");
        assert_eq!(parsed[1]["name"], "株式");
    }
}
