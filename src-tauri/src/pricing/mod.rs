pub mod crypto;
pub mod forex;
pub mod fund;
pub mod gold;
pub mod yahoo;
mod yahoo_types;

use std::time::Duration;

pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}
