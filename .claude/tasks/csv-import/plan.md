# CSV Import Feature

## Overview
Import fund holdings from broker CSV files to automatically update quantities in the database.

## Supported Brokers

### SBI Securities
- **CSV type**: Portfolio holdings list (保有資産一覧)
- **Encoding**: Shift-JIS
- **Sections**: 特定預り, NISA成長投資枠, NISAつみたて投資枠, 旧NISA預り
- **Data**: Fund name (full-width) + quantity directly available
- **Mapping**: 旧NISA → tokutei, 成長/つみたて → nisa

### Rakuten Securities
- **CSV type**: Trade history (取引履歴)
- **Encoding**: Shift-JIS
- **Transactions**: 買付 (buy), 解約 (sell), 出庫 (transfer out)
- **Data**: Sum buy - sell - transfer to get final holdings

## Architecture
- **Backend**: `src-tauri/src/commands/csv_import.rs`
  - Shift-JIS decoding via `encoding_rs`
  - CSV parsing via `csv` crate
  - Full-width to half-width normalization for SBI fund names
  - Name matching with substring fallback
  - Account matching by broker name + account type
- **Frontend**: 
  - `src/lib/api.ts`: `previewCsvImport(path, broker)`, `applyCsvImport(updates)`
  - `src/pages/Accounts.tsx`: Dropdown button (CSV取込) with broker selection, preview/confirm flow

## Matching Logic
1. Parse CSV, aggregate quantities per fund per account section
2. Match to existing DB holdings by normalized fund name within matching account
3. Update quantity only (preserves ticker, as_of, monthly_amount)
4. Report updated and unmatched funds

## Decisions
- 旧NISA holdings treated as 特定口座 (will eventually move there)
- Only `holding_type = 'fund'` holdings are matched (not stocks/ETFs/crypto)
- Unmatched funds are reported but not auto-created (user must add them manually first)
