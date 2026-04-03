# mvp - Shadow Asset: 公開市場価格ベースの資産シミュレーター

## コンセプト
個人情報を一切介さず、「公開されている市場価格」と「自分が書き込んだ数量」だけで資産総額を算出するシミュレーター。ワンクリックで開いてざっと確認できる形。

## 要件
- **保存するのは数量のみ、金額は全てリアルタイム計算**
- 口座(NISA, iDeCo, 特定口座, 米国株, 仮想通貨, ゴールド, DC) + 銘柄の2層構造
- 積立銘柄は as_of(確認日) + monthly_amount(月額) で現在の口数を推定
- 対象: 投信, 米国株/ETF, 仮想通貨(BTC/ETH/BCH), ゴールド現物(金貨1oz, 金地金20g), DC年金
- UIは日本語、マネーフォワード風ダッシュボード
- 数量データはgitignore対象のローカルDB
- リポジトリ自体はpublic化可能(銘柄名OK、数量は絶対に含めない)

## 配布形態の検討

### 選択肢
1. **デスクトップアプリ (Electron/Tauri)** - ワンクリックで起動、ローカル完結
2. **ローカルWebアプリ (Next.js)** - `npm run dev` で起動、ブラウザで表示
3. **静的サイト + ローカルJSON** - Vercel等にデプロイ、設定JSONをlocalStorageに保存
4. **CLIツール** - ターミナルで `shadow-asset` 実行

### 判断基準
- 「ワンクリックで開いて確認」→ デスクトップアプリかURLアクセスが最適
- URL公開はDB(数量データ)の保存先が問題(localStorageなら可能だがバックアップしにくい)
- デスクトップアプリならローカルSQLiteでDB完結、バックアップも容易

### 次回決定事項
- 配布形態を確定してから技術スタック再選定

## 価格取得API (検証済み)
| データ | API | 認証 | 備考 |
|--------|-----|------|------|
| 株/ETF/投信 | yahoo-finance2 | 不要 | サーバーサイド専用(CORS) |
| 金(USD/oz) | gold-api.com | 不要 | |
| USD/JPY | frankfurter.dev | 不要 | ECBソース、平日日次更新 |
| 仮想通貨 | CoinGecko | 不要 | JPY建て取得可 |

## 投信ティッカー
- eMAXIS Slim オルカン: `0331418A`
- eMAXIS Slim S&P500: `03311187`
- 東証ETF: `{4桁}.T` (例: 1540.T)

## 金の換算
- 1トロイオンス = 31.1035g
- 金貨1oz: gold_usd_oz x USD/JPY
- 金地金20g: (gold_usd_oz / 31.1035) x USD/JPY x 20

## 技術的知見 (v1 spike で判明)

### Node.js v24 + SQLite
- **better-sqlite3**: ネイティブABI v137未対応。ビルド不可
- **@libsql/client (file:モード)**: 並行アクセスでデッドロック
- **Prisma v7 + SQLite adapter**: better-sqlite3依存 + ESM/Turbopack非互換
- **node:sqlite (DatabaseSync)**: 動作する。Node v24内蔵、同期API。ただしexperimental

### Next.js 16 + Node.js v24
- **致命的**: dev serverがAPI routeを2-3回呼んだ後にハング
- DB無関係のhealth checkエンドポイントでも再現
- `next build` は成功する(productionビルド自体は問題なし)
- **対策**: Node.js v22 LTSへのダウングレード、またはNext.js以外のフレームワーク検討

### yahoo-finance2 v3
- ESM default export: `require("yahoo-finance2").default` で使用
- TypeScript型定義はquote()の返り値が`never`になるケースあり
