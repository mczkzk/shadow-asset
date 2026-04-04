use std::collections::HashSet;

use chrono::Local;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

use crate::commands::accounts::Account;
use crate::commands::holdings::Holding;
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
}

fn account_color(account_type: &str) -> &'static str {
    match account_type {
        "nisa" => "#4F46E5",
        "ideco" => "#7C3AED",
        "tokutei" => "#2563EB",
        "crypto" => "#D97706",
        "gold" => "#CA8A04",
        "dc" => "#DC2626",
        _ => "#6B7280",
    }
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

fn is_gold(holding_type: &str) -> bool {
    gold_coin_oz(holding_type).is_some() || gold_bar_grams(holding_type).is_some()
}

fn estimate_quantity(holding: &Holding, current_price: f64) -> f64 {
    let as_of = match &holding.as_of {
        Some(d) if !d.is_empty() => d,
        _ => return holding.quantity,
    };
    let monthly = match holding.monthly_amount {
        Some(m) if m > 0.0 && current_price > 0.0 => m,
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

    let additional = (months_elapsed as f64 * monthly) / current_price;
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
            }
        }
    };

    let estimated_qty = estimate_quantity(holding, price);
    let is_estimated = (estimated_qty - holding.quantity).abs() > 0.001;

    let value_jpy = if holding.holding_type == "fund" || holding.holding_type == "dc_fund" {
        // Japanese funds: price is per 10,000 units
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
    }
}

use chrono::Datelike;

#[tauri::command]
pub async fn fetch_portfolio(state: State<'_, AppState>) -> Result<PortfolioResponse, String> {
    // Read DB data
    let (accounts, all_holdings) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.as_ref().ok_or("database not initialized")?;

        let mut stmt = conn
            .prepare("SELECT id, name, type, sort_order FROM accounts ORDER BY sort_order, id")
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
                "SELECT id, account_id, ticker, name, quantity, holding_type, as_of, monthly_amount
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
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        (accounts, holdings)
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

    let (usd_jpy, gold_prices, crypto_prices, stock_prices, fund_prices) = tokio::join!(
        forex::fetch_usd_jpy(),
        gold::fetch_gold_prices(),
        crypto::fetch_crypto_prices_jpy(&crypto_list),
        yahoo::fetch_stock_prices(&stock_list),
        fund::fetch_fund_prices(&fund_list),
    );

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

    let breakdown: Vec<CategoryBreakdown> = accounts_with_holdings
        .iter()
        .filter(|a| a.total_jpy > 0.0)
        .map(|a| CategoryBreakdown {
            name: a.account.name.clone(),
            account_type: a.account.account_type.clone(),
            value: a.total_jpy,
            color: account_color(&a.account.account_type).to_string(),
        })
        .collect();

    // Save daily snapshot
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let conn = db.as_ref().ok_or("database not initialized")?;
        let today = Local::now().format("%Y-%m-%d").to_string();
        let breakdown_json = serde_json::to_string(&breakdown).unwrap_or_default();
        let _ = conn.execute(
            "INSERT OR REPLACE INTO snapshots (date, total_jpy, breakdown_json) VALUES (?1, ?2, ?3)",
            params![today, grand_total, breakdown_json],
        );
    }

    Ok(PortfolioResponse {
        total_jpy: grand_total,
        usd_jpy,
        gold_coin_oz_jpy: gold_prices.coin_1oz_jpy,
        gold_bar_gram_jpy: gold_prices.bar_per_gram_jpy,
        accounts: accounts_with_holdings,
        breakdown,
    })
}
