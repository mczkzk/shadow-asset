use serde::Deserialize;

#[derive(Deserialize)]
pub struct YahooChartResponse {
    pub chart: YahooChart,
}

#[derive(Deserialize)]
pub struct YahooChart {
    pub result: Option<Vec<YahooChartResult>>,
}

#[derive(Deserialize)]
pub struct YahooChartResult {
    pub meta: YahooMeta,
}

#[derive(Deserialize)]
pub struct YahooMeta {
    #[serde(rename = "regularMarketPrice")]
    pub regular_market_price: Option<f64>,
    pub currency: Option<String>,
    pub symbol: Option<String>,
}
