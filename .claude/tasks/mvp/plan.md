# mvp - Shadow Asset: Tauri デスクトップアプリ

## コンセプト
個人情報を一切介さず、「公開されている市場価格」と「自分が書き込んだ数量」だけで資産総額を算出する、プライバシーファーストの資産シミュレーター。ワンクリックで起動してざっと確認できるデスクトップアプリ。

## 要件
- **保存するのは数量のみ、金額は全てリアルタイム計算**
- 口座(NISA, iDeCo, 特定口座, 仮想通貨, ゴールド, DC) + 銘柄の2層構造
- 積立銘柄は as_of(確認日) + monthly_amount(月額) で現在の口数を推定
- 対象: 投信, 米国株/ETF, 仮想通貨(BTC/ETH/BCH), ゴールド現物(金貨1oz, 金地金20g), DC年金
- UIは日本語、マネーフォワード風ダッシュボード
- 数量データはローカルSQLite(gitignore対象)
- リポジトリはpublic化可能(銘柄名OK、数量は絶対に含めない)

## 技術スタック
- **アプリ**: Tauri v2 (Rust + WebView)
- **フロント**: React + TypeScript + Tailwind CSS v4 + Recharts
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
| type | TEXT | nisa/ideco/tokutei/crypto/gold/dc |
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
- [x] Tauri v2 プロジェクト作成 (React + TypeScript + Vite)
- [x] Tailwind CSS v4 セットアップ
- [x] rusqlite 導入、DB初期化コマンド
- [x] 基本レイアウト (ヘッダー、ナビゲーション)

### Phase 2: Rust バックエンド
- [x] Tauri コマンド: accounts CRUD
- [x] Tauri コマンド: holdings CRUD
- [x] Tauri コマンド: 価格取得 (reqwest + Yahoo Finance, gold-api, frankfurter, CoinGecko)
- [x] Tauri コマンド: 積立口数推定ロジック
- [x] Tauri コマンド: スナップショット保存/読み出し

### Phase 3: フロント UI
- [x] ダッシュボード (TotalAssets, CategoryBreakdown, AccountList)
- [x] 保有管理 (AccountForm, HoldingForm)
- [x] 資産推移グラフ (AssetHistory)
- [x] Recharts によるチャート描画

### Phase 4: 仕上げ
- [x] アプリアイコン
- [x] .dmg ビルド確認
- [x] エラーハンドリング

## Implementation Notes

### プロジェクト構造
```
src/                          # React フロントエンド
├── components/dashboard/     # TotalAssets, AccountList, CategoryBreakdownChart, AssetHistory
├── hooks/                    # usePortfolio (Tauri invoke wrapper)
├── lib/                      # types, format, api (invoke wrappers)
├── pages/                    # Dashboard, Accounts
├── App.tsx                   # react-router-dom でルーティング
└── main.tsx

src-tauri/src/
├── lib.rs                    # Tauri setup, AppState (Mutex<Option<Connection>>)
├── db.rs                     # rusqlite: schema初期化
├── commands/
│   ├── accounts.rs           # accounts CRUD
│   ├── holdings.rs           # holdings CRUD
│   ├── prices.rs             # 全API並列呼び出し + 計算 + スナップショット保存
│   └── snapshots.rs          # snapshot CRUD
└── pricing/
    ├── yahoo.rs              # Yahoo Finance query2 API (Rust reqwest)
    ├── gold.rs               # gold-api.com
    ├── forex.rs              # frankfurter.dev
    └── crypto.rs             # CoinGecko
```

### DB保存先
- `~/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db`
- Tauri の `app_data_dir()` を使用

### ビルド成果物
- `Shadow Asset.app` (macOS)
- `Shadow Asset_0.1.0_aarch64.dmg`

## 今後の実装 (Post-MVP)

### アセットクラス別内訳
- holdingにユーザーがタグ付け (株式, 債券, ゴールド/コモディティ, 不動産, 仮想通貨 等)
- GLDM等の金ETFも「ゴールド」としてカウント可能に
- 商品種類別(現状)とアセットクラス別の両方を表示

### 暴落時モード
- 前日比の表示機能を追加した上で、非表示にできるトグル
- 暴落時に株を売らないためのメンタルガード
- 前日比が一定以上のマイナスのとき自動で有効化も検討

### その他
- 損益計算 (取得価額との比較)
- ~~エクスポート/インポート機能~~ (実装済み: feature/export-import)
- ~~アプリアイコン~~ (実装済み)

## spike/mvp-v1 からの知見
- better-sqlite3, @libsql/client, Prisma v7 は全てNode.js v24で問題あり
- Next.js 16 dev server は Node.js v24 で2-3リクエスト後にハング
- yahoo-finance2 v3 は ESM default export
- Recharts の Tooltip formatter は `unknown` 型で受ける必要あり
- フロントのReactコンポーネント(ダッシュボード、チャート)はspike branchから流用可能
