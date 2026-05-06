/// Today as a `YYYY-MM-DD` string in the local timezone, matching the format
/// used for the `as_of` and snapshot `date` columns in the database.
pub fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}
