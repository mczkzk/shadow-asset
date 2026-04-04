use std::collections::HashMap;

/// Known ISIN codes for funds not found on Yahoo Finance JP.
/// DC-specific funds can use their general version's ISIN (same NAV).
fn isin_for_ticker(ticker: &str) -> Option<&'static str> {
    match ticker {
        "JP90C000FHD2" => Some("JP90C000FHD2"), // 楽天・全米 (ISIN直接入力)
        "JP90C000FHC4" => Some("JP90C000FHC4"), // 楽天・全世界 (ISIN直接入力)
        "9I312179" => Some("JP90C000FHD2"),      // 楽天・全米 (Yahoo JP ticker)
        _ => None,
    }
}

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
    // Try Yahoo Finance JP first
    if let Some(price) = fetch_from_yahoo_jp(client, ticker).await {
        return Some(price);
    }

    // Fallback: try Rakuten Securities page via ISIN
    if let Some(isin) = isin_for_ticker(ticker) {
        if let Some(price) = fetch_from_rakuten_sec(client, isin).await {
            return Some(price);
        }
    }

    None
}

async fn fetch_from_yahoo_jp(client: &reqwest::Client, ticker: &str) -> Option<f64> {
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

    parse_fund_price(&html)
}

async fn fetch_from_rakuten_sec(client: &reqwest::Client, isin: &str) -> Option<f64> {
    let url = format!(
        "https://www.rakuten-sec.co.jp/web/fund/detail/?ID={}",
        isin
    );
    let html = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        .send()
        .await
        .ok()?
        .text()
        .await
        .ok()?;

    parse_fund_price(&html)
}

fn parse_fund_price(html: &str) -> Option<f64> {
    let bytes = html.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        if bytes[i] == b'>' && i + 1 < len && bytes[i + 1].is_ascii_digit() {
            i += 1;
            let mut num_str = String::new();
            while i < len && (bytes[i].is_ascii_digit() || bytes[i] == b',') {
                if bytes[i] != b',' {
                    num_str.push(bytes[i] as char);
                }
                i += 1;
            }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_fund_price_from_html() {
        let html = r#"<p>stuff</p><td>10,253,628</td><td>319,505</td><td>33,265</td>"#;
        assert_eq!(parse_fund_price(html), Some(33265.0));
    }

    #[test]
    fn skips_values_outside_fund_range() {
        let html = r#"<td>100</td><td>10,253,628</td><td>33,265</td>"#;
        assert_eq!(parse_fund_price(html), Some(33265.0));
    }

    #[test]
    fn returns_none_for_no_match() {
        let html = r#"<td>100</td><td>10,000,000</td>"#;
        assert_eq!(parse_fund_price(html), None);
    }

    #[test]
    fn returns_none_for_empty() {
        assert_eq!(parse_fund_price(""), None);
    }

    #[test]
    fn isin_lookup() {
        assert_eq!(isin_for_ticker("9I312179"), Some("JP90C000FHD2"));
        assert_eq!(isin_for_ticker("0331418A"), None);
    }
}
