use std::collections::HashMap;

use super::yahoo_types::YahooChartResponse;

async fn fetch_rate(ticker: &str) -> Option<f64> {
    let client = super::http_client();
    let url = format!(
        "https://query2.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=1d",
        ticker
    );
    let resp: YahooChartResponse = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    resp.chart
        .result
        .and_then(|r| r.into_iter().next())
        .and_then(|r| r.meta.regular_market_price)
}

pub async fn fetch_usd_jpy() -> f64 {
    fetch_rate("JPY=X").await.unwrap_or(150.0)
}

pub async fn fetch_forex_rates(currencies: &[String]) -> HashMap<String, f64> {
    let mut rates = HashMap::new();
    let futures: Vec<_> = currencies
        .iter()
        .map(|c| {
            let ticker = if c == "USD" {
                "JPY=X".to_string()
            } else {
                format!("{}JPY=X", c)
            };
            let currency = c.clone();
            async move {
                let rate = fetch_rate(&ticker).await;
                (currency, rate)
            }
        })
        .collect();

    let results = futures::future::join_all(futures).await;
    for (currency, rate) in results {
        if let Some(r) = rate {
            rates.insert(currency, r);
        }
    }
    rates
}
