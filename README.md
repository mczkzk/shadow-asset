<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="Shadow Asset">
</p>

# Shadow Asset

A privacy-first asset simulator. Without connecting to any external financial services, this desktop app calculates your total assets in real time using only "public market prices x quantities you enter."

## Features

- **Stores only quantities; values are calculated in real time** (prices fetched from Yahoo Finance, CoinGecko, Tanaka Kikinzoku, etc.)
- **Fully local** (no cloud, no account required)
- **Two-layer structure: accounts + holdings** (NISA, iDeCo, taxable brokerage, crypto, gold, DC)
- **Accumulation simulation** (estimates current units from a start date and monthly contribution)
- **Repository can be made public** (personal data lives only in local SQLite)

## Tech Stack

- **App**: [Tauri v2](https://tauri.app/) (Rust + WebView)
- **Frontend**: React + TypeScript + Tailwind CSS v4 + Recharts
- **DB**: SQLite via rusqlite (managed on the Rust side)
- **Price fetching**: reqwest (Rust HTTP client)

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) v20+
- macOS (current target platform)

## Development

```bash
# Install dependencies
npm install

# Start in dev mode (with hot reload)
npm run tauri dev
```

The first run takes a few minutes for Rust compilation. Subsequent runs use incremental builds and are much faster.

Frontend code changes are reflected instantly in the Tauri window.
Rust code changes are reflected after automatic recompilation.

## Production Build

```bash
npm run tauri build          # DMG + .app
npm run install-app          # Build + install to /Applications + ad-hoc signing
```

## Project Structure

```
src/                        # React frontend
├── components/dashboard/   # Dashboard UI
├── hooks/                  # Tauri invoke wrappers
├── lib/                    # Type definitions, formatters, presets
└── pages/                  # Dashboard, holdings management

src-tauri/src/              # Rust backend
├── commands/               # Tauri commands (CRUD, price fetching)
├── pricing/                # External APIs (Yahoo Finance, CoinGecko, etc.)
├── db.rs                   # SQLite initialization
└── lib.rs                  # Entry point
```

## Data Storage

```
~/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db
```

Only account names, tickers, and quantities are stored in the SQLite file. It is not tracked by git.
