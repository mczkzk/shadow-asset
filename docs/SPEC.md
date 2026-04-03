# Shadow Asset - Project Specification

## Purpose
個人情報を一切介さず、「公開されている市場価格」と「自分が書き込んだ数量」だけで資産総額を算出する、プライバシーファーストの資産シミュレーター。

## Core Principle
**保存するのは数量のみ。金額は全てリアルタイム計算。**

- `NVDA, <数量>` → 現在の株価 x 数量 x USD/JPY = 評価額
- `BTC, <数量>` → 現在のBTC/JPY x 数量 = 評価額
- `1oz_coin, <数量>` → 現在の金1oz売却価格 x 数量 = 評価額
- 外部金融サービスAPI (Zaim, MoneyForward等) は使用しない

## Asset Categories & Data Model

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

口座タイプ: NISA, iDeCo, 特定口座, 米国株, 仮想通貨, ゴールド現物, 確定拠出年金(DC)
銘柄タイプ: 投資信託, 米国株/ETF, 仮想通貨, 金貨, 金地金

※ 数量はDB(gitignore対象)にのみ保存。このファイルには記載しない。

### 積立シミュレーション

定額積立のある銘柄は、確認時点からの経過月数で口数を推定:

```
推定保有数 = 確認時の口数 + (経過月数 x 月額 / 現在の基準価額)
```

各holdingに `as_of` (確認日) と `monthly_amount` (積立額) を持つ。

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via @libsql/client (ファイル1つ、gitignore対象)
- **Charts**: Recharts
- **Market Data**:
  - 株/ETF/投信: yahoo-finance2 (サーバーサイド、APIキー不要)
  - 金価格: gold-api.com (APIキー不要、USD/oz)
  - 為替: frankfurter.dev (APIキー不要、ECBソース)
  - 仮想通貨: 公開API (CoinGecko等)
- **UI言語**: 日本語

## Data Storage

```
shadow-asset.db     ← SQLite、.gitignoreで除外
```

### テーブル設計

- **accounts**: 口座 (id, name, type)
- **holdings**: 保有銘柄 (id, account_id, ticker, name, quantity, as_of, monthly_amount, holding_type)
- **snapshots**: 日次スナップショット (date, total_jpy, breakdown_json)

### バックアップ

- DBファイルは個人データ(銘柄コード+数量)のみ含む
- Time Machine、手動コピー、エクスポート機能で対応
- コード自体に個人情報はゼロ → リポジトリはpublic化可能

## Key Decisions

- No authentication, no user accounts
- All personal data in SQLite (gitignored), never in code
- Prices fetched via Next.js API routes (CORS回避)
- Store quantities only, derive all JPY values from market prices
- Private repo initially, public化は安定後に判断

## MVP Scope

1. **ダッシュボード**: 総資産額、口座別内訳(ドーナツチャート)、口座別リスト
2. **保有管理**: 口座の追加/編集/削除、銘柄の追加/編集/削除
3. **リアルタイム価格**: 株/ETF/投信/金/為替/仮想通貨の現在価格取得
4. **資産推移**: 日次スナップショット保存、折れ線グラフ表示

### 後回し
- 積立シミュレーション(将来の資産予測)
- 損益計算(取得価額との比較)
- エクスポート/インポート機能
