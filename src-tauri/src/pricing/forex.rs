use serde::Deserialize;

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
}

pub async fn fetch_usd_jpy() -> f64 {
    let result = async {
        let client = reqwest::Client::new();
        let resp: YahooChartResponse = client
            .get("https://query2.finance.yahoo.com/v8/finance/chart/JPY=X?range=1d&interval=1d")
            .header("User-Agent", "Mozilla/5.0")
            .send()
            .await?
            .json()
            .await?;

        let price = resp
            .chart
            .result
            .and_then(|r| r.into_iter().next())
            .and_then(|r| r.meta.regular_market_price)
            .unwrap_or(150.0);

        Ok::<f64, reqwest::Error>(price)
    }
    .await;

    result.unwrap_or(150.0)
}
