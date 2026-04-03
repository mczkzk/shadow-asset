# mvp - Shadow Asset: Tauri デスクトップアプリ

## コンセプト
個人情報を一切介さず、「公開されている市場価格」と「自分が書き込んだ数量」だけで資産総額を算出する、プライバシーファーストの資産シミュレーター。ワンクリックで起動してざっと確認できるデスクトップアプリ。

## 要件
- **保存するのは数量のみ、金額は全てリアルタイム計算**
- 口座(NISA, iDeCo, 特定口座, 米国株, 仮想通貨, ゴールド, DC) + 銘柄の2層構造
- 積立銘柄は as_of(確認日) + monthly_amount(月額) で現在の口数を推定
- 対象: 投信, 米国株/ETF, 仮想通貨(BTC/ETH/BCH), ゴールド現物(金貨1oz, 金地金20g), DC年金
- UIは日本語、マネーフォワード風ダッシュボード
- 数量データはローカルSQLite(gitignore対象)
- リポジトリはpublic化可能(銘柄名OK、数量は絶対に含めない)

## 技術スタック
- **アプリ**: Tauri v2 (Rust + WebView)
- **フロント**: React + TypeScript + Tailwind CSS + Recharts
- **DB**: SQLite via rusqlite (Rust側で管理、Node.js不要)
- **価格取得**: Rust側のHTTPクライアント(reqwest)で外部API呼び出し
- **ビルド**: Vite (フロントバンドル)

### Tauriを選んだ理由
- Node.js v24 + Next.js 16の互換性問題を完全回避(spike/mvp-v1で判明)
- SQLiteはRustのrusqliteで安定動作(ネイティブモジュール問題なし)
- 軽量(~5MB)、ワンクリック起動
- CORS問題なし(Rust側で外部API呼び出し)

## データモデル

### accounts テーブル
| Column | Type | 説明 |
|--------|------|------|
| id | INTEGER PK | |
| name | TEXT | 口座名 (例: "つみたてNISA") |
| type | TEXT | nisa/ideco/tokutei/us_stock/crypto/gold/dc |
| sort_order | INTEGER | 表示順 |

### holdings テーブル
| Column | Type | 説明 |
|--------|------|------|
| id | INTEGER PK | |
| account_id | INTEGER FK | |
| ticker | TEXT | 銘柄コード (例: NVDA, BTC, 0331418A) |
| name | TEXT | 表示名 |
| quantity | REAL | 保有数量 |
| holding_type | TEXT | fund/us_stock/us_etf/crypto/gold_coin_1oz/gold_bar_20g/dc_fund |
| as_of | TEXT | 数量確認日 (積立用) |
| monthly_amount | REAL | 月額積立額 (円) |

### snapshots テーブル
| Column | Type | 説明 |
|--------|------|------|
| id | INTEGER PK | |
| date | TEXT UNIQUE | 日付 |
| total_jpy | REAL | 総資産額 |
| breakdown_json | TEXT | 口座別内訳JSON |

## 価格取得API
| データ | API | 認証 | 備考 |
|--------|-----|------|------|
| 株/ETF/投信 | Yahoo Finance (query2) | 不要 | User-Agentヘッダー必要 |
| 金(USD/oz) | gold-api.com | 不要 | |
| USD/JPY | frankfurter.dev | 不要 | ECBソース、平日日次更新 |
| 仮想通貨 | CoinGecko | 不要 | JPY建て取得可 |

### 投信ティッカー
- eMAXIS Slim オルカン: `0331418A`
- eMAXIS Slim S&P500: `03311187`
- SBI V S&P500: Yahoo Finance Japanで要確認
- 東証ETF: `{4桁}.T` (例: 1540.T)
- 楽天DC系ファンド: Yahoo Finance Japanで要確認

### 金の換算
- 1トロイオンス = 31.1035g
- 金貨1oz: gold_usd_oz x USD/JPY
- 金地金20g: (gold_usd_oz / 31.1035) x USD/JPY x 20

## UI構成 (MVP)
1. **ダッシュボード**: 総資産額、口座別内訳(ドーナツチャート)、口座別リスト
2. **保有管理**: 口座の追加/編集/削除、銘柄の追加/編集/削除
3. **資産推移**: 日次スナップショット、折れ線グラフ

## 実装計画

### Phase 1: Tauri + React セットアップ
- [ ] Tauri v2 プロジェクト作成 (React + TypeScript + Vite)
- [ ] Tailwind CSS セットアップ
- [ ] rusqlite 導入、DB初期化コマンド
- [ ] 基本レイアウト (ヘッダー、ナビゲーション)

### Phase 2: Rust バックエンド
- [ ] Tauri コマンド: accounts CRUD
- [ ] Tauri コマンド: holdings CRUD
- [ ] Tauri コマンド: 価格取得 (reqwest + Yahoo Finance, gold-api, frankfurter, CoinGecko)
- [ ] Tauri コマンド: 積立口数推定ロジック
- [ ] Tauri コマンド: スナップショット保存/読み出し

### Phase 3: フロント UI
- [ ] ダッシュボード (TotalAssets, CategoryBreakdown, AccountList)
- [ ] 保有管理 (AccountForm, HoldingForm)
- [ ] 資産推移グラフ (AssetHistory)
- [ ] Recharts によるチャート描画

### Phase 4: 仕上げ
- [ ] アプリアイコン
- [ ] .dmg ビルド確認
- [ ] エラーハンドリング

## spike/mvp-v1 からの知見
- better-sqlite3, @libsql/client, Prisma v7 は全てNode.js v24で問題あり
- Next.js 16 dev server は Node.js v24 で2-3リクエスト後にハング
- yahoo-finance2 v3 は ESM default export
- Recharts の Tooltip formatter は `unknown` 型で受ける必要あり
- フロントのReactコンポーネント(ダッシュボード、チャート)はspike branchから流用可能
