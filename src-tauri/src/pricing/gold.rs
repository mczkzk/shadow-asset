use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct GoldPrices {
    pub coin_1oz_jpy: f64,
    pub bar_per_gram_jpy: f64,
}

/// Fetch gold buyback prices from Tanaka Kikinzoku (田中貴金属 店頭買取価格 税込)
pub async fn fetch_gold_prices() -> GoldPrices {
    let result = async {
        let client = reqwest::Client::new();
        let html = client
            .get("https://gold.tanaka.co.jp/commodity/souba/")
            .header(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            )
            .send()
            .await?
            .text()
            .await?;

        Ok::<GoldPrices, reqwest::Error>(parse_tanaka_prices(&html))
    }
    .await;

    result.unwrap_or(GoldPrices {
        coin_1oz_jpy: 800000.0,
        bar_per_gram_jpy: 25000.0,
    })
}

fn parse_tanaka_prices(html: &str) -> GoldPrices {
    // Tanaka's page has yen values in order:
    // [0] gold bar retail/g, [1] gold bar buyback/g, ...
    // [8] coin 1oz retail, [9] coin 1oz buyback, ...
    let mut yen_values: Vec<f64> = Vec::new();
    let bytes = html.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        // Match >XX,XXX 円< pattern
        if bytes[i] == b'>' {
            i += 1;
            let start = i;
            let mut num_str = String::new();
            let mut has_digit = false;

            while i < len && (bytes[i].is_ascii_digit() || bytes[i] == b',') {
                if bytes[i] != b',' {
                    num_str.push(bytes[i] as char);
                    has_digit = true;
                }
                i += 1;
            }

            // Check for " 円<" or "円<" after the number
            if has_digit && i + 4 < len {
                let mut j = i;
                // skip optional whitespace
                while j < len && bytes[j] == b' ' {
                    j += 1;
                }
                // Check for 円 (3 bytes in UTF-8: E5 86 86)
                if j + 3 <= len && &bytes[j..j + 3] == "円".as_bytes() {
                    if let Ok(val) = num_str.parse::<f64>() {
                        yen_values.push(val);
                    }
                }
            }
            // Reset to start if no match to avoid skipping
            if !has_digit {
                i = start;
            }
        }
        i += 1;
    }

    // [1] = gold bar buyback per gram (税込)
    // [9] = coin 1oz buyback (税込)
    let bar_per_gram = yen_values.get(1).copied().unwrap_or(25000.0);
    let coin_1oz = yen_values.get(9).copied().unwrap_or(800000.0);

    GoldPrices {
        coin_1oz_jpy: coin_1oz,
        bar_per_gram_jpy: bar_per_gram,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_tanaka_prices() {
        // Simulated Tanaka HTML with >XX,XXX 円< pattern
        let html = concat!(
            "<td>26,856 円</td>",  // [0] bar retail
            "<td>26,499 円</td>",  // [1] bar buyback
            "<td>11,455 円</td>",  // [2] platinum retail
            "<td>11,032 円</td>",  // [3] platinum buyback
            "<td>26,856 円</td>",  // [4] (duplicate section)
            "<td>26,499 円</td>",  // [5]
            "<td>11,455 円</td>",  // [6]
            "<td>11,032 円</td>",  // [7]
            "<td>886,141 円</td>", // [8] coin 1oz retail
            "<td>806,132 円</td>", // [9] coin 1oz buyback
        );
        let prices = parse_tanaka_prices(html);
        assert_eq!(prices.bar_per_gram_jpy, 26499.0);
        assert_eq!(prices.coin_1oz_jpy, 806132.0);
    }

    #[test]
    fn returns_defaults_for_empty_html() {
        let prices = parse_tanaka_prices("");
        assert_eq!(prices.bar_per_gram_jpy, 25000.0);
        assert_eq!(prices.coin_1oz_jpy, 800000.0);
    }
}
