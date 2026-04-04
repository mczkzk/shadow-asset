# PR #1 Review: Implement Tauri v2 desktop app for asset tracking

## Summary

42 commits on `feature/mvp` → `main`. Tauri v2 デスクトップアプリの初期実装。Rust バックエンド (rusqlite, reqwest) + React フロントエンド (TypeScript, Tailwind, Recharts)。

**変更ファイル**: 68 files (Rust backend, React frontend, icons, config, docs)

**レビュー対象ルール**: `CLAUDE.md` (個人データポリシー), `ts-guidelines.md` (TypeScript規約)

---

## Findings

### [MUST] 価格フェッチにタイムアウトが設定されていない (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/fund.rs#L17-L28
https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/yahoo.rs#L33-L48

全 pricing モジュール (`fund.rs`, `yahoo.rs`, `gold.rs`, `forex.rs`) で `reqwest::Client::new()` をタイムアウトなしで生成している。`tokio::join!` で並列実行しているため、1つの API がハングすると全体がブロックされアプリがフリーズする。

**修正案**: `reqwest::Client::builder().timeout(Duration::from_secs(10)).build()` を使用する。

---

### [MUST] fund/stock の価格取得がシリアル実行 (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/fund.rs#L17-L28
https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/yahoo.rs#L33-L48

`fetch_fund_prices` と `fetch_stock_prices` は `for ticker { .await }` でシリアル実行。保有銘柄数に比例してローディング時間が増加する。

**修正案**: `futures::future::join_all` で全ティッカーを並列フェッチする。

---

### [SHOULD] SPEC.md がゴールドモデルと口座タイプで実装と大きく乖離 (confidence: 92)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/docs/SPEC.md#L55-L63

- ゴールド: 2サイズ (金貨1oz, 金地金20g) のみ記載 → 実装は11サイズ
- `米国株` が独立アカウントカテゴリとして記載 → 実装では `us_stock` アカウントタイプは削除済み
- holdings テーブルの `holding_type` 例が旧モデルのまま

---

### [SHOULD] CSP が無効化されている (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/tauri.conf.json#L23

`"csp": null` で Content Security Policy が完全に無効。現在 XSS ベクタはないが、深層防御として `"default-src 'self'; script-src 'self'"` を設定すべき。

---

### [SHOULD] Yahoo Finance レスポンス型が yahoo.rs と forex.rs で完全重複 (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/forex.rs#L3-L21
https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/yahoo.rs#L11-L31

`YahooChartResponse`, `YahooChart`, `YahooChartResult`, `YahooMeta` が2箇所に同一定義。一方だけ変更するとバグになる。

**修正案**: 共通モジュールに切り出すか、`forex.rs` から `yahoo.rs` の型を再利用する。

---

### [SHOULD] ACCOUNT_TYPE_LABELS が2ファイルに重複定義 (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src/pages/Accounts.tsx#L7-L14
https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src/components/dashboard/AccountList.tsx#L16-L23

同じ key-value ペアだが型が異なる (`Record<AccountType, string>` vs `Record<string, string>`)。`src/lib/` に統合すべき。

---

### [SHOULD] Tanaka 金価格パーサのインデックスが脆弱 (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/gold.rs#L76-L84

ハードコードされた配列インデックス `[1]`, `[9]` で金地金/金貨の買取価格を取得。田中貴金属のページ構造が変わると、プラチナ等の別金属の価格が無言で使われる。

**修正案**: 値の妥当性チェック (例: 金地金 > 10,000円/g, 金貨1oz > 100,000円) を追加するか、HTML 構造のマーカーテキストで位置を特定する方式に変更する。

---

### [SHOULD] fund.rs のドキュメントコメントが実行順序と不一致 (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/fund.rs#L3-L4

「ISIN なら Rakuten SEC を直接使う」と記載しているが、実装は ISIN でもまず Yahoo Finance JP を試みる (失敗後に Rakuten SEC fallback)。コメントが実際の動作を誤解させる。

---

### [SHOULD] スナップショット取得と保存のレース条件 (confidence: 72)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src/pages/Dashboard.tsx
https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src/components/dashboard/AssetHistory.tsx#L13

`fetchPortfolio` (スナップショット保存含む) と `getSnapshots` が独立した `useEffect` で同時発火。`getSnapshots` が先に解決すると当日分データが表示されない。

**修正案**: `fetchPortfolio` 完了後に `getSnapshots` を呼ぶ、または `fetchPortfolio` の戻り値にスナップショットを含める。

---

### [NIT] ティッカー入力の URL バリデーションなし (confidence: 25)

https://github.com/mczkzk/shadow-asset/blob/0bfbcc2a2c909d480d9893dca365157f4d7132a5/src-tauri/src/pricing/yahoo.rs#L54-L56

ユーザー入力のティッカーが URL に直接埋め込まれる。ローカルアプリで自分のデータを入力するため実質的リスクは極めて低い。

---

## Verification Steps

1. **タイムアウト検証**: ネットワークを切断した状態で「更新」を押し、アプリがフリーズしないことを確認
2. **シリアルフェッチ検証**: 5銘柄以上の保有で価格更新時間を計測。並列化後に改善を確認
3. **スナップショット競合検証**: 初回起動時に AssetHistory に当日データが表示されるか確認
4. **Tanaka パーサ検証**: 実際の田中貴金属ページを `curl` で取得し、インデックス [1]/[9] が正しい値を指すことを確認
