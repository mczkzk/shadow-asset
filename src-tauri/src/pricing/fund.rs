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
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        .send()
        .await
        .ok()?
        .text()
        .await
        .ok()?;

    // Look for the price pattern in Yahoo Finance JP HTML
    // The fund price (基準価額) appears as a comma-separated number
    // Pattern: "stoksPrice" or similar class with the price value
    parse_fund_price(&html)
}

fn parse_fund_price(html: &str) -> Option<f64> {
    // Yahoo Finance JP embeds fund prices in multiple formats.
    // Look for patterns like >"33,265"< (the nav/base price)
    // The price appears after "基準価額" text in the page

    // Strategy: find "基準価額" then extract the next number pattern
    let nav_marker = html.find("基準価額")?;
    let after_marker = &html[nav_marker..];

    // Find the first number pattern like "33,265" or "33265"
    let mut i = 0;
    let bytes = after_marker.as_bytes();
    let len = bytes.len().min(500); // only search nearby

    while i < len {
        if bytes[i].is_ascii_digit() {
            let mut num_str = String::new();
            while i < len && (bytes[i].is_ascii_digit() || bytes[i] == b',') {
                if bytes[i] != b',' {
                    num_str.push(bytes[i] as char);
                }
                i += 1;
            }
            if let Ok(val) = num_str.parse::<f64>() {
                // Fund prices are typically 5,000-100,000 range
                if val >= 1000.0 && val <= 500000.0 {
                    return Some(val);
                }
            }
        }
        i += 1;
    }

    None
}
