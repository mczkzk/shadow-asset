use std::collections::HashMap;

/// Fetch Japanese mutual fund prices from Yahoo Finance Japan.
/// Tickers like "0331418A", "03311187" are fund association codes.
pub async fn fetch_fund_prices(tickers: &[String]) -> HashMap<String, f64> {
    let mut result = HashMap::new();
    let client = reqwest::Client::new();

    for ticker in tickers {
        if let Some(price) = fetch_single_fund_price(&client, ticker).await {
            result.insert(ticker.clone(), price);
        }
    }

    result
}

async fn fetch_single_fund_price(client: &reqwest::Client, ticker: &str) -> Option<f64> {
    let url = format!("https://finance.yahoo.co.jp/quote/{}", ticker);

    let html = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        )
        .send()
        .await
        .ok()?
        .text()
        .await
        .ok()?;

    parse_fund_price(&html)
}

fn parse_fund_price(html: &str) -> Option<f64> {
    // Yahoo Finance JP shows fund prices as comma-separated numbers like ">33,265<"
    // Find all such numbers and return the first one in fund price range (5,000-200,000)
    let bytes = html.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        // Look for ">" followed by digits (pattern: >XX,XXX<)
        if bytes[i] == b'>' && i + 1 < len && bytes[i + 1].is_ascii_digit() {
            i += 1;
            let mut num_str = String::new();
            while i < len && (bytes[i].is_ascii_digit() || bytes[i] == b',') {
                if bytes[i] != b',' {
                    num_str.push(bytes[i] as char);
                }
                i += 1;
            }
            // Must end with "<" to be an HTML text node
            if i < len && bytes[i] == b'<' {
                if let Ok(val) = num_str.parse::<f64>() {
                    if val >= 5000.0 && val <= 200000.0 {
                        return Some(val);
                    }
                }
            }
        }
        i += 1;
    }

    None
}
