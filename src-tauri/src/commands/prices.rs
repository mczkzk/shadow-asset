use std::collections::HashSet;

use chrono::Local;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

use crate::commands::accounts::Account;
use crate::commands::holdings::Holding;
use crate::commands::manual_assets::{self, ManualAssetWithJpy};
use crate::pricing::{crypto, forex, fund, gold, yahoo};
use crate::AppState;


#[derive(Debug, Serialize, Clone)]
pub struct HoldingWithValue {
    #[serde(flatten)]
    pub holding: Holding,
    pub price: Option<f64>,
    pub currency: String,
    pub value_jpy: Option<f64>,
    pub estimated_quantity: Option<f64>,
    pub prev_value_jpy: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AccountWithHoldings {
    #[serde(flatten)]
    pub account: Account,
    pub holdings: Vec<HoldingWithValue>,
    pub total_jpy: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct CategoryBreakdown {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct PortfolioResponse {
    pub total_jpy: f64,
    pub usd_jpy: f64,
    pub gold_coin_oz_jpy: f64,
    pub gold_bar_gram_jpy: f64,
    pub accounts: Vec<AccountWithHoldings>,
    pub breakdown: Vec<CategoryBreakdown>,
    pub prev_total_jpy: Option<f64>,
    pub prev_date: Option<String>,
    pub manual_assets: Vec<ManualAssetWithJpy>,
}

fn gold_coin_oz(holding_type: &str) -> Option<f64> {
    match holding_type {
        "gold_coin_1oz" => Some(1.0),
        "gold_coin_half_oz" => Some(0.5),
        "gold_coin_quarter_oz" => Some(0.25),
        "gold_coin_tenth_oz" => Some(0.1),
        _ => None,
    }
}

fn gold_bar_grams(holding_type: &str) -> Option<f64> {
    match holding_type {
        "gold_bar_5g" => Some(5.0),
        "gold_bar_10g" => Some(10.0),
        "gold_bar_20g" => Some(20.0),
        "gold_bar_50g" => Some(50.0),
        "gold_bar_100g" => Some(100.0),
        "gold_bar_500g" => Some(500.0),
        "gold_bar_1kg" => Some(1000.0),
        _ => None,
    }
}

pub(crate) fn is_gold(holding_type: &str) -> bool {
    gold_coin_oz(holding_type).is_some() || gold_bar_grams(holding_type).is_some()
}

pub(crate) fn asset_class_name(holding_type: &str) -> &'static str {
    match holding_type {
        "fund" | "dc_fund" => "投資信託",
        "us_stock" | "us_etf" => "株式",
        "crypto" => "暗号資産",
        t if is_gold(t) => "ゴールド",
        _ => "その他",
    }
}

pub(crate) fn asset_class_color(class_name: &str) -> &'static str {
    match class_name {
        "投資信託" => "#4F46E5",
        "株式" => "#059669",
        "暗号資産" => "#D97706",
        "ゴールド" => "#CA8A04",
        "債券" => "#8B5CF6",
        "現金" => "#10B981",
        "外貨預金" => "#06B6D4",
        "不動産" => "#F59E0B",
        "保険" => "#EC4899",
        "生活防衛資金" => "#84CC16",
        _ => "#6B7280",
    }
}

/// Estimate current quantity based on monthly contributions since as_of date.
/// `price_per_unit` must be the cost to buy ONE unit of the holding.
/// For Japanese funds (基準価額 per 10,000口), caller must pass price/10000.
fn estimate_quantity(holding: &Holding, price_per_unit: f64) -> f64 {
    let as_of = match &holding.as_of {
        Some(d) if !d.is_empty() => d,
        _ => return holding.quantity,
    };
    let monthly = match holding.monthly_amount {
        Some(m) if m > 0.0 && price_per_unit > 0.0 => m,
        _ => return holding.quantity,
    };

    let as_of_date = chrono::NaiveDate::parse_from_str(as_of, "%Y-%m-%d");
    let as_of_date = match as_of_date {
        Ok(d) => d,
        Err(_) => return holding.quantity,
    };

    let today = Local::now().date_naive();
    let months_elapsed =
        (today.year() - as_of_date.year()) * 12 + (today.month() as i32 - as_of_date.month() as i32);

    if months_elapsed <= 0 {
        return holding.quantity;
    }

    let additional = (months_elapsed as f64 * monthly) / price_per_unit;
    holding.quantity + additional
}

fn calculate_value(
    holding: &Holding,
    price: Option<f64>,
    currency: &str,
    usd_jpy: f64,
    gold_coin_oz_jpy: f64,
    gold_bar_gram_jpy: f64,
) -> HoldingWithValue {
    // Gold: Tanaka Kikinzoku buyback prices
    // holding_type encodes size, quantity = number of items
    if let Some(oz) = gold_coin_oz(&holding.holding_type) {
        let price_per_item = gold_coin_oz_jpy * oz;
        let value = price_per_item * holding.quantity;
        return HoldingWithValue {
            holding: holding.clone(),
            price: Some(price_per_item),
            currency: "JPY".to_string(),
            value_jpy: Some(value),
            estimated_quantity: None,
            prev_value_jpy: None,
        };
    }

    if let Some(grams) = gold_bar_grams(&holding.holding_type) {
        let price_per_item = gold_bar_gram_jpy * grams;
        let value = price_per_item * holding.quantity;
        return HoldingWithValue {
            holding: holding.clone(),
            price: Some(price_per_item),
            currency: "JPY".to_string(),
            value_jpy: Some(value),
            estimated_quantity: None,
            prev_value_jpy: None,
        };
    }

    let price = match price {
        Some(p) => p,
        None => {
            return HoldingWithValue {
                holding: holding.clone(),
                price: None,
                currency: currency.to_string(),
                value_jpy: None,
                estimated_quantity: None,
                prev_value_jpy: None,
            }
        }
    };

    let is_fund = holding.holding_type == "fund" || holding.holding_type == "dc_fund";
    // Convert price to JPY per unit for tsumitate estimation (monthly_amount is always JPY)
    let price_per_unit_jpy = if is_fund {
        price / 10000.0 // 基準価額 is per 10,000口, already JPY
    } else if currency == "USD" {
        price * usd_jpy // convert USD to JPY
    } else {
        price
    };
    let estimated_qty = estimate_quantity(holding, price_per_unit_jpy);
    let is_estimated = (estimated_qty - holding.quantity).abs() > 0.001;

    let value_jpy = if is_fund {
        (estimated_qty / 10000.0) * price
    } else if currency == "USD" {
        estimated_qty * price * usd_jpy
    } else {
        estimated_qty * price
    };

    HoldingWithValue {
        holding: holding.clone(),
        price: Some(price),
        currency: currency.to_string(),
        value_jpy: Some(value_jpy),
        estimated_quantity: if is_estimated {
            Some(estimated_qty)
        } else {
            None
        },
        prev_value_jpy: None,
    }
}

use chrono::Datelike;

#[tauri::command]
pub async fn fetch_portfolio(state: State<'_, AppState>) -> Result<PortfolioResponse, String> {
    // Read DB data
    let (accounts, all_holdings, manual_assets_raw, needed_currencies) = {
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
        let accounts: Vec<Account> = stmt
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

        let mut stmt = conn
            .prepare(
                "SELECT id, account_id, ticker, name, quantity, holding_type, as_of, monthly_amount, asset_class
                 FROM holdings ORDER BY id",
            )
            .map_err(|e| e.to_string())?;
        let holdings: Vec<Holding> = stmt
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

        let manual_assets_raw = manual_assets::read_all(conn)?;

        // Exclude USD since fetch_usd_jpy() already fetches JPY=X
        let needed_currencies: Vec<String> = manual_assets::needed_forex_currencies(&manual_assets_raw)
            .into_iter()
            .filter(|c| c != "USD")
            .collect();

        (accounts, holdings, manual_assets_raw, needed_currencies)
    };

    // Categorize tickers
    let mut stock_tickers: HashSet<String> = HashSet::new();
    let mut crypto_symbols: HashSet<String> = HashSet::new();
    let mut fund_tickers: HashSet<String> = HashSet::new();

    for h in &all_holdings {
        if is_gold(&h.holding_type) {
            continue;
        }
        match h.holding_type.as_str() {
            "crypto" => {
                crypto_symbols.insert(h.ticker.clone());
            }
            "fund" | "dc_fund" => {
                fund_tickers.insert(h.ticker.clone());
            }
            _ => {
                stock_tickers.insert(h.ticker.clone());
            }
        }
    }

    // Fetch all prices in parallel
    let stock_list: Vec<String> = stock_tickers.into_iter().collect();
    let crypto_list: Vec<String> = crypto_symbols.into_iter().collect();
    let fund_list: Vec<String> = fund_tickers.into_iter().collect();

    let (usd_jpy, gold_prices, crypto_prices, stock_prices, fund_prices, mut manual_forex_rates) = tokio::join!(
        forex::fetch_usd_jpy(),
        gold::fetch_gold_prices(),
        crypto::fetch_crypto_prices_jpy(&crypto_list),
        yahoo::fetch_stock_prices(&stock_list),
        fund::fetch_fund_prices(&fund_list),
        async {
            if needed_currencies.is_empty() {
                std::collections::HashMap::new()
            } else {
                forex::fetch_forex_rates(&needed_currencies).await
            }
        },
    );

    // Reuse the already-fetched USD/JPY rate for manual asset conversion
    manual_forex_rates.insert("USD".to_string(), usd_jpy);

    // Calculate portfolio
    let mut grand_total = 0.0;
    let mut accounts_with_holdings: Vec<AccountWithHoldings> = Vec::new();

    for account in &accounts {
        let account_holdings: Vec<&Holding> = all_holdings
            .iter()
            .filter(|h| h.account_id == account.id)
            .collect();

        let mut holdings_with_value: Vec<HoldingWithValue> = Vec::new();
        let mut account_total = 0.0;

        for h in account_holdings {
            let (price, currency) = match h.holding_type.as_str() {
                "crypto" => {
                    let p = crypto_prices.get(&h.ticker.to_uppercase()).copied();
                    (p, "JPY")
                }
                t if is_gold(t) => (None, "JPY"),
                "fund" | "dc_fund" => {
                    let p = fund_prices.get(&h.ticker).copied();
                    (p, "JPY")
                }
                _ => {
                    if let Some(sp) = stock_prices.get(&h.ticker.to_uppercase()) {
                        (Some(sp.price), sp.currency.as_str())
                    } else {
                        (None, "JPY")
                    }
                }
            };

            let hwv = calculate_value(h, price, currency, usd_jpy, gold_prices.coin_1oz_jpy, gold_prices.bar_per_gram_jpy);
            account_total += hwv.value_jpy.unwrap_or(0.0);
            holdings_with_value.push(hwv);
        }

        grand_total += account_total;
        accounts_with_holdings.push(AccountWithHoldings {
            account: account.clone(),
            holdings: holdings_with_value,
            total_jpy: account_total,
        });
    }

    // Breakdown by asset class (not by account)
    let mut class_totals: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for a in &accounts_with_holdings {
        for h in &a.holdings {
            let class = h.holding.asset_class.as_deref()
                .unwrap_or_else(|| asset_class_name(&h.holding.holding_type));
            *class_totals.entry(class.to_string()).or_default() += h.value_jpy.unwrap_or(0.0);
        }
    }

    // Convert manual assets and add to breakdown
    let (manual_assets_with_jpy, manual_assets_total) =
        manual_assets::convert_to_jpy(manual_assets_raw, &manual_forex_rates);

    for ma in &manual_assets_with_jpy {
        let jpy_value = ma.converted_jpy.or(ma.asset.value_jpy).unwrap_or(0.0);
        *class_totals.entry(ma.asset.asset_class.clone()).or_default() += jpy_value;
    }

    grand_total += manual_assets_total;

    let breakdown: Vec<CategoryBreakdown> = class_totals
        .into_iter()
        .filter(|(_, v)| *v > 0.0)
        .map(|(name, value)| CategoryBreakdown {
            color: asset_class_color(&name).to_string(),
            account_type: name.clone(),
            name,
            value,
        })
        .collect();

    // Load previous holding snapshots + save current ones
    let (prev_total_jpy, prev_date) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.as_ref().ok_or("database not initialized")?;
        let today = Local::now().format("%Y-%m-%d").to_string();

        // Load previous holding-level values (single query)
        let mut stmt = conn
            .prepare(
                "SELECT date, holding_id, value_jpy FROM holding_snapshots
                 WHERE date = (SELECT date FROM holding_snapshots WHERE date < ?1 ORDER BY date DESC LIMIT 1)",
            )
            .map_err(|e| e.to_string())?;
        let prev_rows: Vec<(String, i64, f64)> = stmt
            .query_map(params![today], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let prev_date = prev_rows.first().map(|(d, _, _)| d.clone());
        let prev_values: std::collections::HashMap<i64, f64> = prev_rows
            .into_iter()
            .map(|(_, id, v)| (id, v))
            .collect();

        for account in &mut accounts_with_holdings {
            for h in &mut account.holdings {
                if let Some(&pv) = prev_values.get(&(h.holding.id as i64)) {
                    h.prev_value_jpy = Some(pv);
                }
            }
        }
        let prev_total = if !prev_values.is_empty() {
            // Approximation: manual assets lack their own snapshots, so we add
            // current values to both sides. Inaccurate if user edits between snapshots.
            Some(prev_values.values().sum::<f64>() + manual_assets_total)
        } else {
            None
        };

        // Save today's snapshots in a single transaction
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        for account in &accounts_with_holdings {
            for h in &account.holdings {
                if let Some(v) = h.value_jpy {
                    tx.execute(
                        "INSERT OR REPLACE INTO holding_snapshots (date, holding_id, value_jpy) VALUES (?1, ?2, ?3)",
                        params![today, h.holding.id, v],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }
        let breakdown_json = serde_json::to_string(&breakdown).unwrap_or_default();
        tx.execute(
            "INSERT OR REPLACE INTO snapshots (date, total_jpy, breakdown_json) VALUES (?1, ?2, ?3)",
            params![today, grand_total, breakdown_json],
        ).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;

        (prev_total, prev_date)
    };

    Ok(PortfolioResponse {
        total_jpy: grand_total,
        usd_jpy,
        gold_coin_oz_jpy: gold_prices.coin_1oz_jpy,
        gold_bar_gram_jpy: gold_prices.bar_per_gram_jpy,
        accounts: accounts_with_holdings,
        breakdown,
        prev_total_jpy,
        prev_date,
        manual_assets: manual_assets_with_jpy,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_holding(holding_type: &str, quantity: f64) -> Holding {
        Holding {
            id: 1,
            account_id: 1,
            ticker: "TEST".to_string(),
            name: "Test".to_string(),
            quantity,
            holding_type: holding_type.to_string(),
            as_of: None,
            monthly_amount: None,
            asset_class: None,
        }
    }

    #[test]
    fn gold_coin_sizes() {
        assert_eq!(gold_coin_oz("gold_coin_1oz"), Some(1.0));
        assert_eq!(gold_coin_oz("gold_coin_half_oz"), Some(0.5));
        assert_eq!(gold_coin_oz("gold_coin_quarter_oz"), Some(0.25));
        assert_eq!(gold_coin_oz("gold_coin_tenth_oz"), Some(0.1));
        assert_eq!(gold_coin_oz("us_stock"), None);
    }

    #[test]
    fn gold_bar_sizes() {
        assert_eq!(gold_bar_grams("gold_bar_5g"), Some(5.0));
        assert_eq!(gold_bar_grams("gold_bar_20g"), Some(20.0));
        assert_eq!(gold_bar_grams("gold_bar_1kg"), Some(1000.0));
        assert_eq!(gold_bar_grams("fund"), None);
    }

    #[test]
    fn gold_coin_value_calculation() {
        let h = make_holding("gold_coin_1oz", 2.0);
        let result = calculate_value(&h, None, "JPY", 150.0, 800000.0, 25000.0);
        // 2 coins × 800,000/oz × 1oz = 1,600,000
        assert_eq!(result.value_jpy, Some(1600000.0));
        assert_eq!(result.price, Some(800000.0));
    }

    #[test]
    fn gold_coin_half_oz_value() {
        let h = make_holding("gold_coin_half_oz", 3.0);
        let result = calculate_value(&h, None, "JPY", 150.0, 800000.0, 25000.0);
        // 3 coins × 800,000 × 0.5oz = 1,200,000
        assert_eq!(result.value_jpy, Some(1200000.0));
    }

    #[test]
    fn gold_bar_20g_value() {
        let h = make_holding("gold_bar_20g", 2.0);
        let result = calculate_value(&h, None, "JPY", 150.0, 800000.0, 26499.0);
        // 2 bars × 26,499/g × 20g = 1,059,960
        assert_eq!(result.value_jpy, Some(1059960.0));
        assert_eq!(result.price, Some(529980.0)); // per bar
    }

    #[test]
    fn us_stock_value() {
        let h = make_holding("us_stock", 10.0);
        let result = calculate_value(&h, Some(150.0), "USD", 150.0, 0.0, 0.0);
        // 10 shares × $150 × 150 JPY/USD = 225,000
        assert_eq!(result.value_jpy, Some(225000.0));
    }

    #[test]
    fn fund_value_per_10000_units() {
        let h = make_holding("fund", 50000.0);
        let result = calculate_value(&h, Some(25000.0), "JPY", 150.0, 0.0, 0.0);
        // 50,000口 / 10,000 × 25,000 = 125,000
        assert_eq!(result.value_jpy, Some(125000.0));
    }

    #[test]
    fn crypto_jpy_value() {
        let h = make_holding("crypto", 0.5);
        let result = calculate_value(&h, Some(10000000.0), "JPY", 150.0, 0.0, 0.0);
        // 0.5 BTC × 10,000,000 = 5,000,000
        assert_eq!(result.value_jpy, Some(5000000.0));
    }

    #[test]
    fn missing_price_returns_none() {
        let h = make_holding("us_stock", 10.0);
        let result = calculate_value(&h, None, "USD", 150.0, 0.0, 0.0);
        assert_eq!(result.value_jpy, None);
    }

    #[test]
    fn estimate_quantity_no_tsumitate() {
        let h = make_holding("fund", 10000.0);
        // price_per_unit for fund: 基準価額 25000 / 10000 = 2.5
        assert_eq!(estimate_quantity(&h, 2.5), 10000.0);
    }

    #[test]
    fn estimate_quantity_with_tsumitate() {
        let h = Holding {
            as_of: Some("2025-01-01".to_string()),
            monthly_amount: Some(50000.0),
            ..make_holding("fund", 100000.0)
        };
        // price_per_unit for fund: 基準価額 33265 / 10000 = 3.3265
        let result = estimate_quantity(&h, 3.3265);
        // Months from 2025-01 to 2026-04 = 15 months
        // Additional = 15 × 50000 / 3.3265 = 225,518口
        // Total = 100,000 + 225,518 = 325,518
        assert!(result > 300000.0);
    }

    #[test]
    fn fund_with_tsumitate_value() {
        // 100,000口, 基準価額 33,265, 月額50,000円, 2026-01-01確認
        let h = Holding {
            as_of: Some("2026-01-01".to_string()),
            monthly_amount: Some(50000.0),
            ..make_holding("fund", 100000.0)
        };
        let result = calculate_value(&h, Some(33265.0), "JPY", 150.0, 0.0, 0.0);
        // 3 months elapsed (Jan to Apr 2026)
        // per_unit = 33265/10000 = 3.3265
        // additional = 3 × 50000 / 3.3265 = 45,094口
        // estimated = 100,000 + 45,094 = 145,094口
        // value = 145,094 / 10000 × 33265 = ~482,615円
        assert!(result.value_jpy.unwrap() > 400000.0);
        assert!(result.estimated_quantity.is_some());
    }

    #[test]
    fn us_stock_tsumitate_converts_jpy_to_usd() {
        // NVDA: 0 shares, $177, USD/JPY=150, 月額50,000円, 2025-10-01確認
        let h = Holding {
            as_of: Some("2025-10-01".to_string()),
            monthly_amount: Some(50000.0),
            ..make_holding("us_stock", 0.0)
        };
        let result = calculate_value(&h, Some(177.0), "USD", 150.0, 0.0, 0.0);
        // 6 months elapsed (Oct 2025 to Apr 2026)
        // price_per_unit_jpy = 177 * 150 = 26,550 JPY/share
        // additional = 6 × 50,000 / 26,550 = 11.3 shares
        let est = result.estimated_quantity.unwrap();
        assert!(est > 10.0 && est < 13.0, "expected ~11.3, got {}", est);
        // value = 11.3 × $177 × 150 = ~300,015
        assert!(result.value_jpy.unwrap() > 250000.0);
    }
}
