use super::yahoo_types::YahooChartResponse;

pub async fn fetch_usd_jpy() -> f64 {
    let result = async {
        let client = super::http_client();
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
