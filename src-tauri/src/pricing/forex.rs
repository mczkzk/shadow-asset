use serde::Deserialize;

#[derive(Deserialize)]
struct FrankfurterResponse {
    rates: Rates,
}

#[derive(Deserialize)]
struct Rates {
    #[serde(rename = "JPY")]
    jpy: f64,
}

pub async fn fetch_usd_jpy() -> f64 {
    let result = async {
        let resp: FrankfurterResponse = reqwest::get(
            "https://api.frankfurter.dev/v2/latest?base=USD&symbols=JPY",
        )
        .await?
        .json()
        .await?;
        Ok::<f64, reqwest::Error>(resp.rates.jpy)
    }
    .await;

    result.unwrap_or(150.0)
}
