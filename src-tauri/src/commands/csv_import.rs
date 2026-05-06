use std::collections::HashMap;
use std::fs;

use encoding_rs::SHIFT_JIS;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvImportPreview {
    updates: Vec<HoldingUpdate>,
    unmatched: Vec<UnmatchedFund>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HoldingUpdate {
    holding_id: i64,
    account_name: String,
    fund_name: String,
    old_quantity: f64,
    new_quantity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnmatchedFund {
    fund_name: String,
    section: String,
    quantity: f64,
}

struct ParsedFund {
    name: String,
    quantity: f64,
    section: String,
}

/// Full-width ASCII to half-width for name matching
fn normalize_fullwidth(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '\u{FF01}'..='\u{FF5E}' => {
                char::from_u32(c as u32 - 0xFF01 + 0x21).unwrap_or(c)
            }
            '\u{3000}' => ' ',
            _ => c,
        })
        .collect()
}

pub(crate) fn read_shift_jis(path: &str) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("failed to read file: {e}"))?;
    let (cow, _, had_errors) = SHIFT_JIS.decode(&bytes);
    if had_errors {
        return Err("Shift-JIS decoding error".into());
    }
    Ok(cow.into_owned())
}

fn parse_sbi(content: &str) -> Result<Vec<ParsedFund>, String> {
    let mut funds = Vec::new();
    let mut current_section = String::new();

    fn section_label(header: &str) -> Option<&'static str> {
        if header.contains("特定預り") {
            Some("tokutei")
        } else if header.contains("つみたて投資枠") {
            Some("nisa_tsumitate")
        } else if header.contains("成長投資枠") {
            Some("nisa_seichou")
        } else if header.contains("旧NISA") {
            Some("nisa_old")
        } else {
            None
        }
    }

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(content.as_bytes());

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV parse error: {e}"))?;
        if record.len() == 0 {
            continue;
        }

        let first = record.get(0).unwrap_or("").trim().trim_matches('"');

        if first.starts_with("投資信託") {
            if let Some(label) = section_label(first) {
                current_section = label.to_string();
            }
            continue;
        }

        if current_section.is_empty() || record.len() < 4 {
            continue;
        }

        if first.is_empty()
            || first == "ファンド名"
            || first.contains("合計")
            || first.contains("総合計")
            || first == "評価額"
            || first
                .replace(',', "")
                .replace('.', "")
                .replace('+', "")
                .replace('-', "")
                .chars()
                .all(|c| c.is_ascii_digit())
        {
            continue;
        }

        let qty_str = record.get(2).unwrap_or("").trim().replace(',', "");
        let quantity: f64 = match qty_str.parse() {
            Ok(v) => v,
            Err(_) => continue,
        };

        funds.push(ParsedFund {
            name: normalize_fullwidth(first.trim()),
            quantity,
            section: current_section.clone(),
        });
    }

    Ok(funds)
}

fn parse_rakuten(content: &str) -> Result<Vec<ParsedFund>, String> {
    let mut totals: HashMap<(String, String), f64> = HashMap::new();

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV parse error: {e}"))?;
        if record.len() < 8 {
            continue;
        }

        // Normalize name variants (e.g. trailing "(オルカン)" added by Rakuten on transfer records)
        let fund_name = record.get(2).unwrap_or("").trim().to_string();
        let fund_name = normalize_rakuten_name(&fund_name);
        let account_type = record.get(4).unwrap_or("").trim().to_string();
        let transaction = record.get(5).unwrap_or("").trim().to_string();
        let qty_str = record
            .get(7)
            .unwrap_or("")
            .trim()
            .replace(',', "")
            .replace('"', "");

        let quantity: f64 = match qty_str.parse() {
            Ok(v) => v,
            Err(_) => continue,
        };

        let section = match account_type.as_str() {
            "特定" => "tokutei",
            "NISA" | "一般NISA" | "つみたてNISA" => "nisa",
            _ => "tokutei",
        };

        let key = (fund_name, section.to_string());
        let entry = totals.entry(key).or_insert(0.0);

        match transaction.as_str() {
            "買付" => *entry += quantity,
            "解約" | "出庫" => *entry -= quantity,
            _ => {}
        }
    }

    Ok(totals
        .into_iter()
        .filter(|(_, qty)| *qty > 0.0)
        .map(|((name, section), quantity)| ParsedFund {
            name,
            quantity,
            section,
        })
        .collect())
}

/// Rakuten sometimes appends a nickname suffix like "(オルカン)" on transfer/sell records.
/// Strip known suffixes so buy/sell/transfer entries aggregate under the same key.
fn normalize_rakuten_name(name: &str) -> String {
    // "(オール・カントリー)(オルカン)" → "(オール・カントリー)"
    let s = name.trim();
    if let Some(stripped) = s.strip_suffix("(オルカン)") {
        stripped.trim().to_string()
    } else {
        s.to_string()
    }
}

fn names_match(csv_name: &str, db_name: &str) -> bool {
    let csv_norm = normalize_fullwidth(csv_name).to_lowercase();
    let db_norm = normalize_fullwidth(db_name).to_lowercase();

    if csv_norm == db_norm {
        return true;
    }

    let csv_clean = csv_norm
        .replace("(オルカン)", "")
        .replace("(おるかん)", "");
    let db_clean = db_norm
        .replace("(オルカン)", "")
        .replace("(おるかん)", "");

    if csv_clean == db_clean {
        return true;
    }

    // Substring fallback only if both names are long enough to avoid false positives
    let min_len = csv_norm.len().min(db_norm.len());
    min_len >= 8 && (csv_norm.contains(&db_norm) || db_norm.contains(&csv_norm))
}

fn account_matches(account_name: &str, account_type: &str, broker: &str, section: &str) -> bool {
    let name_lower = account_name.to_lowercase();
    let broker_check = match broker {
        "sbi" => name_lower.contains("sbi"),
        "rakuten" => name_lower.contains("楽天"),
        _ => false,
    };
    if !broker_check {
        return false;
    }

    match section {
        "tokutei" => account_type == "tokutei",
        "nisa" => account_type == "nisa",
        _ => false,
    }
}

/// Shared logic: parse CSV and match against DB holdings (read-only)
fn build_preview(
    conn: &rusqlite::Connection,
    path: &str,
    broker: &str,
) -> Result<CsvImportPreview, String> {
    let content = read_shift_jis(path)?;

    let parsed = match broker {
        "sbi" => parse_sbi(&content)?,
        "rakuten" => parse_rakuten(&content)?,
        _ => return Err(format!("unknown broker: {broker}")),
    };

    let mut aggregated: HashMap<(String, String), f64> = HashMap::new();
    for fund in &parsed {
        let merged_section = match fund.section.as_str() {
            "nisa_seichou" | "nisa_tsumitate" => "nisa".to_string(),
            "nisa_old" => "tokutei".to_string(),
            other => other.to_string(),
        };
        let key = (fund.name.clone(), merged_section);
        *aggregated.entry(key).or_insert(0.0) += fund.quantity;
    }

    let mut acc_stmt = conn
        .prepare("SELECT id, name, type FROM accounts")
        .map_err(|e| e.to_string())?;
    let accounts: Vec<(i64, String, String)> = acc_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut hold_stmt = conn
        .prepare("SELECT id, account_id, name, quantity FROM holdings WHERE holding_type = 'fund'")
        .map_err(|e| e.to_string())?;
    let holdings: Vec<(i64, i64, String, f64)> = hold_stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut updates = Vec::new();
    let mut unmatched = Vec::new();

    for ((fund_name, section), quantity) in &aggregated {
        let mut matched = false;

        for (acc_id, acc_name, acc_type) in &accounts {
            if !account_matches(acc_name, acc_type, broker, section) {
                continue;
            }

            for (hold_id, hold_acc_id, hold_name, old_qty) in &holdings {
                if hold_acc_id != acc_id || !names_match(fund_name, hold_name) {
                    continue;
                }

                updates.push(HoldingUpdate {
                    holding_id: *hold_id,
                    account_name: acc_name.clone(),
                    fund_name: hold_name.clone(),
                    old_quantity: *old_qty,
                    new_quantity: *quantity,
                });
                matched = true;
                break;
            }
            if matched {
                break;
            }
        }

        if !matched {
            unmatched.push(UnmatchedFund {
                fund_name: fund_name.clone(),
                section: section.clone(),
                quantity: *quantity,
            });
        }
    }

    Ok(CsvImportPreview { updates, unmatched })
}

/// Preview only: parse CSV and show what would change, without writing to DB
#[tauri::command]
pub fn preview_csv_import(
    state: State<AppState>,
    path: String,
    broker: String,
) -> Result<CsvImportPreview, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;
    build_preview(conn, &path, &broker)
}

/// Apply: write the confirmed updates to DB
#[tauri::command]
pub fn apply_csv_import(
    state: State<AppState>,
    updates: Vec<HoldingUpdate>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db.as_ref().ok_or("database not initialized")?;

    // CSV import is the user confirming today's broker-side quantity, so re-stamp as_of.
    let today = crate::util::today();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for u in &updates {
        tx.execute(
            "UPDATE holdings SET quantity = ?1, as_of = ?2 WHERE id = ?3",
            params![u.new_quantity, today, u.holding_id],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
