use std::collections::HashMap;

use rusqlite::params;
use serde::Serialize;
use tauri::State;

use crate::pricing::forex;
use crate::AppState;

use super::manual_assets::ManualAsset;
use super::prices::asset_class_color;

/// Allocation-specific asset class mapping.
/// Unlike `asset_class_name()` (dashboard: 商品種別), this groups by risk allocation:
/// - fund/dc_fund → "株式" (not "投資信託")
/// - Known commodity/bond ETFs → override by ticker
fn allocation_class(holding_type: &str, ticker: &str) -> &'static str {
    // Ticker-based overrides for ETFs that track non-equity assets
    if holding_type == "us_etf" || holding_type == "us_stock" {
        match ticker.to_uppercase().as_str() {
            // Gold ETFs
            "GLDM" | "GLD" | "IAU" | "SGOL" => return "ゴールド",
            // Bond ETFs
            "AGG" | "BND" | "TLT" | "IEF" | "SHY" | "VGLT" | "EDV" | "HYG" | "LQD" => {
                return "債券"
            }
            _ => {}
        }
    }

    match holding_type {
        "fund" | "dc_fund" | "us_stock" | "us_etf" => "株式",
        "crypto" => "暗号資産",
        t if t.starts_with("gold_coin") || t.starts_with("gold_bar") => "ゴールド",
        _ => "その他",
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct AllocationItem {
    pub name: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct AllocationResponse {
    pub total_jpy: f64,
    pub items: Vec<AllocationItem>,
    pub manual_assets: Vec<ManualAssetWithJpy>,
    pub snapshot_date: Option<String>,
    pub forex_rates: HashMap<String, f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ManualAssetWithJpy {
    #[serde(flatten)]
    pub asset: ManualAsset,
    pub converted_jpy: Option<f64>,
}

#[tauri::command]
pub async fn fetch_allocation(state: State<'_, AppState>) -> Result<AllocationResponse, String> {
    // Read DB data: holding snapshots + holdings metadata + manual assets
    let (snapshot_date, holding_values, manual_assets, needed_currencies) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.as_ref().ok_or("database not initialized")?;

        // Get latest snapshot date
        let snapshot_date: Option<String> = conn
            .query_row(
                "SELECT MAX(date) FROM holding_snapshots",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        // Get holding values from snapshots + asset_class from holdings
        let holding_values: Vec<(String, f64)> = if let Some(ref date) = snapshot_date {
            let mut stmt = conn
                .prepare(
                    "SELECT h.holding_type, h.asset_class, h.ticker, hs.value_jpy
                     FROM holding_snapshots hs
                     JOIN holdings h ON hs.holding_id = h.id
                     WHERE hs.date = ?1",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt.query_map(params![date], |row| {
                let holding_type: String = row.get(0)?;
                let explicit_class: Option<String> = row.get(1)?;
                let ticker: String = row.get(2)?;
                let value_jpy: f64 = row.get(3)?;
                let class = explicit_class
                    .unwrap_or_else(|| allocation_class(&holding_type, &ticker).to_string());
                Ok((class, value_jpy))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
            rows
        } else {
            Vec::new()
        };

        // Get manual assets
        let mut stmt = conn
            .prepare("SELECT id, name, asset_class, value_jpy, currency, amount FROM manual_assets ORDER BY id")
            .map_err(|e| e.to_string())?;

        let manual_assets: Vec<ManualAsset> = stmt
            .query_map([], |row| {
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
            .filter_map(|r| r.ok())
            .collect();

        // Collect currencies that need forex conversion
        let needed_currencies: Vec<String> = manual_assets
            .iter()
            .filter_map(|a| a.currency.as_ref())
            .filter(|c| !c.is_empty())
            .cloned()
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        (snapshot_date, holding_values, manual_assets, needed_currencies)
    };

    // Fetch forex rates for foreign currency manual assets
    let forex_rates = if needed_currencies.is_empty() {
        HashMap::new()
    } else {
        forex::fetch_forex_rates(&needed_currencies).await
    };

    // Aggregate by asset class
    let mut class_totals: HashMap<String, f64> = HashMap::new();

    // Holdings from snapshots
    for (class, value) in &holding_values {
        *class_totals.entry(class.clone()).or_default() += value;
    }

    // Manual assets with JPY conversion
    let manual_assets_with_jpy: Vec<ManualAssetWithJpy> = manual_assets
        .into_iter()
        .map(|a| {
            let converted_jpy = if let (Some(currency), Some(amount)) = (&a.currency, a.amount) {
                forex_rates.get(currency.as_str()).map(|rate| amount * rate)
            } else {
                None
            };

            let jpy_value = converted_jpy.or(a.value_jpy).unwrap_or(0.0);
            *class_totals.entry(a.asset_class.clone()).or_default() += jpy_value;

            ManualAssetWithJpy {
                asset: a,
                converted_jpy,
            }
        })
        .collect();

    // Build sorted allocation items
    let total_jpy: f64 = class_totals.values().sum();

    let class_order = [
        "株式", "債券", "ゴールド", "暗号資産", "現金", "外貨預金", "不動産", "保険", "生活防衛資金",
    ];

    let mut items: Vec<AllocationItem> = class_totals
        .into_iter()
        .filter(|(_, v)| *v > 0.0)
        .map(|(name, value)| AllocationItem {
            color: asset_class_color(&name).to_string(),
            name,
            value,
        })
        .collect();

    items.sort_by(|a, b| {
        let a_idx = class_order.iter().position(|&c| c == a.name).unwrap_or(99);
        let b_idx = class_order.iter().position(|&c| c == b.name).unwrap_or(99);
        a_idx.cmp(&b_idx)
    });

    Ok(AllocationResponse {
        total_jpy,
        items,
        manual_assets: manual_assets_with_jpy,
        snapshot_date,
        forex_rates,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fund_maps_to_equity() {
        assert_eq!(allocation_class("fund", "0331418A"), "株式");
        assert_eq!(allocation_class("dc_fund", "JP90C000FHD2"), "株式");
    }

    #[test]
    fn stock_and_etf_map_to_equity() {
        assert_eq!(allocation_class("us_stock", "NVDA"), "株式");
        assert_eq!(allocation_class("us_etf", "VOO"), "株式");
    }

    #[test]
    fn gold_etf_maps_to_gold() {
        assert_eq!(allocation_class("us_etf", "GLDM"), "ゴールド");
        assert_eq!(allocation_class("us_etf", "GLD"), "ゴールド");
        assert_eq!(allocation_class("us_etf", "IAU"), "ゴールド");
    }

    #[test]
    fn bond_etf_maps_to_bond() {
        assert_eq!(allocation_class("us_etf", "AGG"), "債券");
        assert_eq!(allocation_class("us_etf", "BND"), "債券");
        assert_eq!(allocation_class("us_etf", "TLT"), "債券");
    }

    #[test]
    fn gold_physical_maps_to_gold() {
        assert_eq!(allocation_class("gold_coin_1oz", ""), "ゴールド");
        assert_eq!(allocation_class("gold_bar_100g", ""), "ゴールド");
    }

    #[test]
    fn crypto_maps_to_crypto() {
        assert_eq!(allocation_class("crypto", "BTC"), "暗号資産");
    }

    #[test]
    fn ticker_override_is_case_insensitive() {
        assert_eq!(allocation_class("us_etf", "gldm"), "ゴールド");
        assert_eq!(allocation_class("us_etf", "Agg"), "債券");
    }
}
