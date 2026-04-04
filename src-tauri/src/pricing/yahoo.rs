use std::collections::HashMap;
use super::yahoo_types::YahooChartResponse;

#[derive(Debug)]
pub struct StockPrice {
    pub price: f64,
    pub currency: String,
}

pub async fn fetch_stock_prices(tickers: &[String]) -> HashMap<String, StockPrice> {
    let client = super::http_client();

    let futures: Vec<_> = tickers
        .iter()
        .map(|ticker| {
            let client = client.clone();
            let ticker = ticker.as_str().to_owned();
            async move { fetch_single_price(&client, &ticker).await }
        })
        .collect();

    let results = futures::future::join_all(futures).await;
    let mut map = HashMap::new();
    for result in results.into_iter().flatten() {
        map.insert(result.2.to_uppercase(), StockPrice {
            price: result.0,
            currency: result.1,
        });
    }
    map
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
