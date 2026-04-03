use std::collections::HashMap;
use serde::Deserialize;

#[derive(Debug)]
pub struct StockPrice {
    pub price: f64,
    pub currency: String,
}

#[derive(Deserialize)]
struct YahooChartResponse {
    chart: YahooChart,
}

#[derive(Deserialize)]
struct YahooChart {
    result: Option<Vec<YahooChartResult>>,
}

#[derive(Deserialize)]
struct YahooChartResult {
    meta: YahooMeta,
}

#[derive(Deserialize)]
struct YahooMeta {
    #[serde(rename = "regularMarketPrice")]
    regular_market_price: Option<f64>,
    currency: Option<String>,
    symbol: Option<String>,
}

pub async fn fetch_stock_prices(tickers: &[String]) -> HashMap<String, StockPrice> {
    let mut result = HashMap::new();
    let client = reqwest::Client::new();

    for ticker in tickers {
        if let Some(price) = fetch_single_price(&client, ticker).await {
            let symbol = price.2.to_uppercase();
            result.insert(symbol, StockPrice {
                price: price.0,
                currency: price.1,
            });
        }
    }

    result
}

async fn fetch_single_price(
    client: &reqwest::Client,
    ticker: &str,
) -> Option<(f64, String, String)> {
    let url = format!(
        "https://query2.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=1d",
        ticker
    );

    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .ok()?;

    let data: YahooChartResponse = resp.json().await.ok()?;
    let results = data.chart.result?;
    let first = results.into_iter().next()?;
    let price = first.meta.regular_market_price?;
    let currency = first.meta.currency.unwrap_or_else(|| "USD".to_string());
    let symbol = first.meta.symbol.unwrap_or_else(|| ticker.to_string());

    Some((price, currency, symbol))
}
