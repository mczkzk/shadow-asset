# Shadow Asset - Project Specification

## Purpose
個人情報を一切介さず、「公開されている市場価格」と「自分が書き込んだ数量」だけで資産総額を算出する、プライバシーファーストの資産シミュレーター。

## Core Principle
**保存するのは数量のみ。金額は全てリアルタイム計算。**

- `NVDA, <数量>` → 現在の株価 x 数量 x USD/JPY = 評価額
- `BTC, <数量>` → 現在のBTC/JPY x 数量 = 評価額
- `1oz_coin, <数量>` → 現在の金1oz売却価格 x 数量 = 評価額
- 外部金融サービスAPI (Zaim, MoneyForward等) は使用しない

## Delivery Format
Tauriデスクトップアプリ (.app/.dmg)。ワンクリックで起動、ローカル完結。

## Tech Stack
- **App Framework**: Tauri v2 (Rust + WebView)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts
- **Database**: SQLite via rusqlite (Rust側で管理)
- **Price Data**: Rust HTTP client (reqwest) で外部API呼び出し
  - Yahoo Finance (stocks/ETFs/funds)
  - gold-api.com (gold price)
  - frankfurter.dev (USD/JPY)
  - CoinGecko (crypto)

## Asset Categories

### 口座 + 銘柄の2層構造

```
NISA
├─ eMAXIS Slim S&P500       積立あり
└─ eMAXIS Slim オルカン      積立あり

iDeCo
└─ eMAXIS Slim オルカン      積立あり

特定口座
├─ eMAXIS Slim S&P500
├─ SBI V S&P500
├─ eMAXIS Slim オルカン
└─ SBI V S&P500

米国株
├─ GLDM (SPDRゴールド ミニシェアーズ)
├─ GOOGL (アルファベット)
└─ NVDA (エヌビディア)

仮想通貨
├─ BTC
├─ ETH
└─ BCH

ゴールド現物
├─ 金貨1oz
└─ 金地金20g

確定拠出年金(DC)
├─ 楽天全世界INDEX楽天DC
├─ 楽天全米INDEX楽天DC
└─ 楽天INDEXバランス楽天DC
```

※ 数量はDB(gitignore対象)にのみ保存。このファイルには記載しない。

### 積立シミュレーション

定額積立のある銘柄は、確認時点からの経過月数で口数を推定:

```
推定保有数 = 確認時の口数 + (経過月数 x 月額 / 現在の基準価額)
```

## Data Storage

```
shadow-asset.db     ← SQLite, .gitignoreで除外
```

### バックアップ
- DBファイルは個人データ(銘柄コード+数量)のみ含む
- Time Machine、手動コピー、エクスポート機能で対応
- コード自体に個人情報はゼロ → リポジトリはpublic化可能

## Key Decisions
- No authentication, no user accounts
- All personal data in SQLite (gitignored), never in code
- Store quantities only, derive all JPY values from market prices
- Tauri desktop app (not web) for one-click launch and local-only data

## MVP Scope
1. **ダッシュボード**: 総資産額、口座別内訳(ドーナツチャート)、口座別リスト
2. **保有管理**: 口座の追加/編集/削除、銘柄の追加/編集/削除
3. **リアルタイム価格**: 株/ETF/投信/金/為替/仮想通貨の現在価格取得
4. **資産推移**: 日次スナップショット保存、折れ線グラフ表示

### 後回し
- 積立シミュレーション(将来の資産予測)
- 損益計算(取得価額との比較)
- エクスポート/インポート機能
