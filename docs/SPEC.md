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
- **Price Data**: Rust HTTP client (reqwest, timeout 10s) で外部API呼び出し。全て認証不要。

### 外部API一覧

| API | 種別 | エンドポイント | 対象資産 |
|-----|------|---------------|---------|
| Yahoo Finance v8 | REST/JSON | `query2.finance.yahoo.com/v8/finance/chart/{ticker}` | 米国株/ETF, USD/JPY為替 |
| Yahoo ファイナンス JP | HTMLスクレイピング | `finance.yahoo.co.jp/quote/{ticker}` | 日本の投資信託 |
| 楽天証券 | HTMLスクレイピング | `rakuten-sec.co.jp/web/fund/detail/?ID={ISIN}` | DC/iDeCo投信 (ISIN直接指定), 一般投信のフォールバック |
| 田中貴金属 | HTMLスクレイピング | `gold.tanaka.co.jp/commodity/souba/` | 金地金/金貨の買取価格 |
| Gold API | REST/JSON | `api.gold-api.com/price/XAU/JPY` | 金スポット価格 (田中失敗時のフォールバック) |
| CoinGecko v3 | REST/JSON | `api.coingecko.com/api/v3/simple/price` | 暗号資産 (BTC, ETH, BCH) |

- **フォールバック戦略**: 金(田中貴金属 → Gold API)
- **投信の価格取得ルート**: 一般投信(SBI等)はYahoo JPがプライマリ。DC/iDeCo銘柄はISINコードで登録されておりYahoo JPにマッチしないため、常に楽天証券から取得
- **HTMLスクレイピング系**: User-Agentヘッダでブラウザを偽装。サイト仕様変更で壊れるリスクあり
- **価格バリデーション**: 各ソースで妥当な範囲チェックあり(異常値の取り込み防止)

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

仮想通貨
├─ BTC
├─ ETH
└─ BCH

ゴールド現物
├─ 金貨 (1oz / 1/2oz / 1/4oz / 1/10oz)
└─ 金地金 (5g / 10g / 20g / 50g / 100g / 500g / 1kg)

確定拠出年金(DC)
├─ 楽天・全米株式インデックス・ファンド (JP90C000FHD2)
├─ 楽天・全世界株式インデックス・ファンド (JP90C000FHC4)
└─ 楽天・インデックス・バランス(DC年金) (JP90C000GCQ3)
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

## カテゴリ体系 (2層構造)

商品種別(holding_type)と資産クラス(asset_class)の2層でカテゴリを管理する。

### 商品種別 (holding_type) = ダッシュボードTOP
「何を持っているか」の一覧表示用。MoneyForward CSVのカテゴリと揃えて推移チャートの整合性を確保。

| 商品種別 | 対象 | MF対応カラム |
|---|---|---|
| 投資信託 | オルカン, S&P500等のインデックスファンド, DC投信 | 投資信託 + 年金 |
| 株式 | 個別米国株, ETF全般 (GLDM等の金ETFも含む) | 株式(現物) |
| 債券 | 債券ファンド/ETF (将来用) | 債券 |
| 預金・現金・暗号資産 | 現金 + 生活防衛資金 + 暗号資産 + 外貨預金 | 預金・現金・暗号資産 |
| 保険 | 保険 | 保険 |
| ゴールド(現物) | 金貨, 金地金 | (MF該当なし) |
| 不動産 | 不動産 | (MF該当なし) |

### 資産クラス (asset_class) = アセットアロケーションページ
「リスク配分がどうなっているか」の戦略判断用。

| 資産クラス | 算出方法 |
|---|---|
| 株式 | 投資信託(株式ファンド) + 個別株 + 株式ETF。バランスファンドも株式扱い |
| 債券 | 債券ファンド/ETF (例: AGG) |
| ゴールド | 金現物 + 金ETF (GLDM等。TOPでは「株式」だがここでは「ゴールド」) |
| 暗号資産 | BTC, ETH等 |
| 現金 | 手入力 (円建て預金等) |
| 外貨預金 | 手入力 (通貨+金額、為替自動換算) |
| 不動産 | 手入力 (今売却したら手元に残る金額) |
| 保険 | 手入力 (解約返戻金・満期金額) |
| 生活防衛資金 | 手入力 (現金とは別枠) |

- `holdings`テーブルに`asset_class`カラムあり。NULLの場合は`holding_type`から自動推論
- 銘柄ごとに資産クラスを上書き可能 (例: GLDM→ゴールド, AGG→債券)
- 手入力資産は`manual_assets`テーブルに格納
- 外貨預金はYahoo FinanceのForexレートで自動JPY換算 (USD,EUR,GBP,AUD等)

## MVP Scope (全て実装済み)
1. **ダッシュボード**: 総資産額(手入力資産含む)、商品種別内訳(ドーナツチャート、手入力資産含む)、口座別リスト
2. **保有管理**: 口座の追加/編集/削除、銘柄の追加/編集/削除
3. **リアルタイム価格**: 株/ETF/投信/金/為替/仮想通貨の現在価格取得
4. **資産推移**: 日次スナップショット保存、折れ線グラフ表示(90日)
5. **前回比表示**: 総資産および個別銘柄の前回比(金額・%)を表示。`holding_snapshots`テーブルに銘柄別の日次評価額を保存し、前回データと比較。前回データがなければ非表示
6. **アセットアロケーション**: 資産クラス別ドーナツチャート+配分詳細テーブル。手入力資産(現金/外貨預金/不動産/保険/生活防衛資金)のCRUD。外貨預金は為替自動換算。`holding_snapshots`の最新データを使用し外部API呼び出しなし(外貨為替のみ)

### CSV取込 (保有数量の一括更新)

保有管理画面の「CSV取込」ボタンから、証券会社のCSVをインポートして投資信託の保有口数を自動更新できる。
DBに銘柄が事前登録されている必要あり(未登録の銘柄は「未マッチ」として報告)。

#### SBI証券
- **取得方法**: ポートフォリオ → 「CSVダウンロード」
- **CSVの種類**: 保有資産一覧 (ファンド名 + 数量が直接記載)
- **口座セクション**: 特定預り / NISA成長投資枠 / NISAつみたて投資枠 / 旧NISA預り
- **マッピング**: 成長+つみたて → NISA口座、旧NISA → 特定口座扱い

#### 楽天証券
- **取得方法**: 取引履歴 → 投資信託タブ → 表示期間「すべて」→ 「CSVで保存」
- **CSVの種類**: 取引履歴 (買付/解約/出庫の全取引)
- **算出方法**: 買付口数の合計 - 解約口数 - 出庫口数 = 現在の保有口数

### MoneyForward CSV取込 (資産推移の過去データ)

MoneyForward「資産推移月次」CSVをインポートして、過去の資産推移データを補完する。

- **CSV仕様**: Shift_JIS、日次データ
- **カラム**: 日付, 合計(円), 預金・現金・暗号資産(円), 株式(現物)(円), 投資信託(円), 債券(円), 保険(円), 年金(円), ポイント(円), その他の資産(円)
- **取り込む列**: 日付, 合計, 預金・現金・暗号資産, 株式(現物), 投資信託, 債券, 保険, 年金
- **マッピング**: 株式(現物) → 株式、投資信託 + 年金 → 投資信託、債券 → 債券、預金・現金・暗号資産 → 預金・現金・暗号資産、保険 → 保険
- **取り込まない列**: ポイント, その他の資産
- **アプリ独自スナップショット優先**: holding_snapshotsがある日付はスキップ。過去のMFデータは上書き(カテゴリ追加時の再インポートに対応)
- **UIの位置**: ダッシュボードの資産推移チャート横にCSV取込ボタン
- **チャート表示**: 積み上げエリアチャート (商品種別の内訳)。MFデータとsnapshotデータで同じカテゴリ名を使用

### 未実装

#### 機能
- **アセットアロケーション 4%ルール判定**: 年間生活費からFIRE達成額を算出
- **暴落時メンタルガードモード**: 暴落時に前回比を非表示に切替 (パニック売り防止)
- **積立シミュレーション**: 将来の資産予測
- **損益計算**: 取得価額との比較

#### 技術的改善
- **HTTPタイムアウト未設定**: pricing全モジュールで `reqwest::Client::new()` にタイムアウトなし。APIハングでアプリ全体がフリーズする
- **価格取得の直列実行**: `fetch_fund_prices`/`fetch_stock_prices` が銘柄を1つずつ順番に取得。`join_all` で並列化すべき
- **CSP無効**: `tauri.conf.json` で `"csp": null`。`"default-src 'self'; script-src 'self'"` に設定すべき
- **Yahoo APIレスポンス型の重複**: `forex.rs` と `yahoo.rs` で同じ型定義。共通モジュールに抽出すべき
- **田中貴金属パーサーの脆弱性**: HTMLテーブルのインデックス `[1]`, `[9]` がハードコード。サイト変更で壊れる
- **スナップショット取得のレース条件**: `fetchPortfolio` と `getSnapshots` が同時発火し、当日分が初回ロードで表示されない場合がある
