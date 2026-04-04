use std::collections::HashMap;

pub async fn fetch_crypto_prices_jpy(symbols: &[String]) -> HashMap<String, f64> {
    if symbols.is_empty() {
        return HashMap::new();
    }

    let id_map: HashMap<&str, &str> = HashMap::from([
        ("BTC", "bitcoin"),
        ("ETH", "ethereum"),
        ("BCH", "bitcoin-cash"),
    ]);

    let ids: Vec<&str> = symbols
        .iter()
        .filter_map(|s| {
            let upper = s.to_uppercase();
            id_map.get(upper.as_str()).copied()
        })
        .collect();

    if ids.is_empty() {
        return HashMap::new();
    }

    let url = format!(
        "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=jpy",
        ids.join(",")
    );

    let result = async {
        let client = super::http_client();
        let resp: HashMap<String, HashMap<String, f64>> = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0")
            .send()
            .await?
            .json()
            .await?;

        let mut prices = HashMap::new();
        for symbol in symbols {
            let upper = symbol.to_uppercase();
            if let Some(id) = id_map.get(upper.as_str()) {
                if let Some(data) = resp.get(*id) {
                    if let Some(jpy) = data.get("jpy") {
                        prices.insert(upper, *jpy);
                    }
                }
            }
        }
        Ok::<HashMap<String, f64>, reqwest::Error>(prices)
    }
    .await;

    result.unwrap_or_default()
}
