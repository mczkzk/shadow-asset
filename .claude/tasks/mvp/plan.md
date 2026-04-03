# mvp - Shadow Asset: 公開市場価格ベースの資産シミュレーター

## Applicable Rules & Skills
- CLAUDE.md: SSoT (plan.md, SPEC.md) を各マイルストーンで更新必須
- ~/.claude/CLAUDE.md: 日本語で応答、em dash禁止、簡潔に

## Requirements
- 個人情報を一切使わず、「公開市場価格」と「ユーザーが入力した数量」のみで資産総額を算出
- **保存するのは数量のみ、金額は全てリアルタイム計算**
- 口座(NISA, iDeCo等) + 銘柄の2層構造
- 積立銘柄は as_of + monthly_amount で口数を推定
- 対象資産: 投信、米国株/ETF、仮想通貨(BTC/ETH/BCH)、ゴールド現物、DC年金
- UIは日本語、マネーフォワード風ダッシュボード
- データはSQLite(gitignore対象)

## Architecture Decisions
- **DB**: SQLite via @libsql/client (Node v24対応、ネイティブモジュール不要)
- **API**: Next.js API Routes経由で外部価格取得(CORS回避)
- **Charts**: Recharts
- **Price Sources**:
  - yahoo-finance2 → 株/ETF/投信
  - gold-api.com → 金(USD/oz)
  - frankfurter.dev → USD/JPY
  - CoinGecko等 → 仮想通貨
- **Snapshots**: アプリアクセス時に1日1回、総資産をsnapshotsテーブルに記録

## Implementation Plan

### Phase 1: Project Setup
- [ ] Next.js + TypeScript + Tailwind CSS セットアップ
- [ ] SQLite (Prisma or better-sqlite3) セットアップ
- [ ] .gitignore に DB ファイル追加
- [ ] 基本レイアウト (ヘッダー、ナビゲーション)

### Phase 2: Data Layer
- [ ] DB スキーマ定義 (accounts, holdings, snapshots)
- [ ] マイグレーション実行
- [ ] CRUD API Routes (accounts, holdings)
- [ ] サンプルデータ投入用 seed スクリプト

### Phase 3: Price Fetching
- [ ] API Route: /api/prices (yahoo-finance2)
- [ ] API Route: /api/gold (gold-api.com)
- [ ] API Route: /api/fx (frankfurter.dev)
- [ ] API Route: /api/crypto (CoinGecko等)
- [ ] 積立口数の推定ロジック

### Phase 4: Dashboard UI
- [ ] 総資産額表示 (TotalAssets)
- [ ] 口座別内訳ドーナツチャート (CategoryBreakdown)
- [ ] 口座別リスト + 銘柄詳細 (AccountList)
- [ ] 資産推移折れ線グラフ (AssetHistory)

### Phase 5: Holdings Management UI
- [ ] 口座の追加/編集/削除フォーム
- [ ] 銘柄の追加/編集/削除フォーム
- [ ] 積立設定 (monthly_amount, as_of)

### Phase 6: Snapshot System
- [ ] 日次スナップショット保存ロジック
- [ ] 推移データの読み出し + グラフ表示

## Related Context
- 新規プロジェクト。git init済み、コードなし
- ユーザーの保有データはDB(gitignore対象)にのみ保存
- リポジトリは当面 private、安定後に public 化検討

## Investigation Notes
- 日本の投信ティッカー: 0331418A(オルカン), 03311187(S&P500) -- Yahoo Finance Japanのコード
- yahoo-finance2はサーバーサイド専用(CORS)、User-Agentヘッダー必要
- 金価格: 1トロイオンス = 31.1035g で換算
- Frankfurterは日次更新(平日のみ)

## Implementation Notes
- better-sqlite3はNode.js v24.0.1のネイティブABI(v137)未対応でビルド不可
- Prisma v7はESM + import.meta.url + adapter必須でTurbopackと相性が悪くハング
- **@libsql/client** (pure JS) を採用。ネイティブモジュール不要でNode v24でも動作
- DB初期化は `ensureTables()` をAPI route先頭でawait
- yahoo-finance2 v3はESM default export。`require("yahoo-finance2").default` で使用
