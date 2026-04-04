use serde::Deserialize;

#[derive(Deserialize)]
pub(super) struct YahooChartResponse {
    pub(super) chart: YahooChart,
}

#[derive(Deserialize)]
pub(super) struct YahooChart {
    pub(super) result: Option<Vec<YahooChartResult>>,
}

#[derive(Deserialize)]
pub(super) struct YahooChartResult {
    pub(super) meta: YahooMeta,
}

#[derive(Deserialize)]
pub(super) struct YahooMeta {
    #[serde(rename = "regularMarketPrice")]
    pub(super) regular_market_price: Option<f64>,
    pub(super) currency: Option<String>,
    pub(super) symbol: Option<String>,
}
