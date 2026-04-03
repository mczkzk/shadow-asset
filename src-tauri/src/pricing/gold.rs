use serde::Deserialize;

#[derive(Deserialize)]
struct GoldApiResponse {
    price: f64,
}

pub async fn fetch_gold_usd_oz() -> f64 {
    let result = async {
        let resp: GoldApiResponse =
            reqwest::get("https://api.gold-api.com/price/XAU")
                .await?
                .json()
                .await?;
        Ok::<f64, reqwest::Error>(resp.price)
    }
    .await;

    result.unwrap_or(2300.0)
}
