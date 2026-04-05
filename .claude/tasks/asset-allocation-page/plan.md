# asset-allocation-page - アセットアロケーションページ

## Applicable Rules & Skills
- `CLAUDE.md`: リビルド最小化 (検証は `npx tsc --noEmit` + `cargo test`)、個人データポリシー
- `ts-guidelines.md`: strict TS, interface for objects, type for unions, no enum
- `commit` skill: コミット時に使用
- `custom-simplify` skill: 実装完了後のレビュー

## Requirements
- **目的**: 現時点の資産を見て、アセットアロケーションの方針を考えるページ
- **資産クラス別ビュー**: ドーナツチャート + 一覧表で資産クラス別の配分比率を表示
- **資産クラス**: 株式, 債券, ゴールド, 暗号資産, 現金(円), 外貨預金, 不動産, 保険(解約返戻金), 生活防衛資金
- **holding_typeとasset_classは別軸**: ダッシュボードTOP=商品種別(GLDM→ETF)、アロケーション=資産クラス(GLDM→ゴールド)
- **銘柄ごとにasset_classを持たせる**: holding_typeからの自動推定では不十分
- **手入力資産**: 現金(円), 外貨預金, 不動産, 保険, 生活防衛資金
  - 不動産: 「今売却したら手元に残る金額」をJPY手入力
  - 保険: 名前+JPY金額を手入力 (例: 「養老保険(2036年満期)」200万円)
  - 外貨預金: 通貨+金額入力、為替レートで自動JPY換算 (USD,EUR,GBP,AUD等)
- **バランスファンドの扱い**: 株式として分類
- **4%ルール判定**: 今回は対象外

## Related Context
- SPEC.md「カテゴリ体系(2層構造)」セクションに資産クラス定義あり
- 既存の`CategoryBreakdownChart`コンポーネントをベースにできる
- `asset_class_name()` (prices.rs) が現在holding_type→資産クラスの静的マッピング
- `breakdown`は既に資産クラス単位で集計されている(ただしholding_typeベース)

## Investigation Notes

### 現在のデータフロー
- `fetch_portfolio` → `PortfolioResponse` に `breakdown: Vec<CategoryBreakdown>` (資産クラス別)
- `asset_class_name()` で holding_type → 資産クラス名に変換
- GLDM等は `us_etf` → 「株式」に分類される (アロケーション的には不正確)

### DBスキーマ
- `holdings` テーブルに `asset_class` カラムなし
- 手入力資産の格納先なし

## Implementation Notes

### 完了した変更

**Rust バックエンド:**
- `db.rs`: `holdings`に`asset_class TEXT`カラム追加(ALTER TABLE)、`manual_assets`テーブル新規作成
- `commands/allocation.rs`: `fetch_allocation`コマンド。`holding_snapshots`最新日 + `manual_assets`を集計
- `commands/manual_assets.rs`: CRUD 4コマンド
- `pricing/forex.rs`: `fetch_forex_rates`で複数通貨の為替レート並列取得
- `commands/prices.rs`: `asset_class_name()`/`asset_class_color()`をpub(crate)に、新カテゴリの色追加、`breakdown`集計で`asset_class`オーバーライド対応
- `commands/holdings.rs`: `Holding`に`asset_class`フィールド追加

**TypeScript フロントエンド:**
- `types.ts`: `ManualAsset`, `ManualAssetWithJpy`, `AllocationItem`, `AllocationData`追加、`CategoryBreakdown.type`を`string`に修正
- `api.ts`: `fetchAllocation`, CRUD 4関数追加
- `hooks/useAllocation.ts`: allocation用データフェッチフック
- `pages/Allocation.tsx`: メインページ(ドーナツチャート + 配分詳細テーブル)
- `components/allocation/ManualAssetForm.tsx`: 手入力資産フォーム
- `components/allocation/ManualAssetList.tsx`: 手入力資産一覧
- `components/dashboard/CategoryBreakdownChart.tsx`: props汎用化(title追加、BreakdownEntry型)
- `App.tsx`: ルート + ナビゲーション追加

### 設計判断
- `fetch_allocation`は`holding_snapshots`を読むだけで外部APIを叩かない(外貨為替のみ例外)
- `asset_class`がNULLの場合は`holding_type`から自動推論(後方互換性)
- バランスファンドは株式として分類
