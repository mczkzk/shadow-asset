# PR #11 Review - Add public pension as out-of-allocation manual asset

- **Commit**: `7c0e5e5aece8ceb551e620c113bdaa2d3beb95cb`
- **Base**: `main`
- **State**: OPEN (Draft)
- **Title**: Add public pension as out-of-allocation manual asset
- **Title/body language**: English (PR comments below include EN copy)

## Summary

「公的年金」を `manual_assets` の新クラスとして追加。生活防衛資金と完全に対称な「配分対象外」パターン: 総資産には含めるが、アロケーションチャート / FIRE目標母数 / 割合判定母数からは除外。スキーマ変更なし、9ファイル変更。

7並列エージェント (general/convention/comment/symmetry/tracer/reuse/past-pr) で全観点をスキャン。**重大なバグ・規約違反はゼロ**。視覚と凝集の軽微な指摘が2件。

## Verification Steps

### Prerequisites
- Tauri dev サーバが起動していること (`npm run tauri dev` or `npm run install-app` 後の本体起動)
- 既存の `manual_assets` データがあると望ましい

### Test scenarios
1. **追加フロー**: 保有管理 → 手入力資産 → 「+ 追加」 → 資産クラスで「公的年金」を選択 → 名前が自動で「公的年金」になる → 金額入力 → 保存
2. **総資産反映**: ダッシュボードの TotalAssets に金額が加算されている
3. **配分除外**: アセットアロケーション画面で
   - チャートに「公的年金」が表示されない
   - チャート下に `※ 公的年金 ¥xxx は配分対象外のため除外` の注記が出る
   - FIRE 目標額のプログレスバーで公的年金の金額が母数から引かれている
   - 割合ベース判定（債券%等）の母数からも引かれている
4. **ダッシュボード商品種別**: 「公的年金」が独自カテゴリとしてカテゴリ別内訳に表示される（パープル系の色）
5. **CRUD**: 編集（金額更新）と削除が動作する
6. **後方互換**: 公的年金エントリ無しの既存DB/snapshot で挙動が壊れない（`valueByName.get("公的年金") ?? 0` でフォールバック）

### Expected results
- 金額が総資産に加算される
- アロケーションチャートと FIRE 目標母数からは除外される
- ダッシュボードに独自カテゴリで表示される

---

## Findings

### [SHOULD] 「公的年金」と「債券」の色がパープル系で近すぎる (confidence: 70)

https://github.com/mczkzk/shadow-asset/blob/7c0e5e5aece8ceb551e620c113bdaa2d3beb95cb/src-tauri/src/commands/prices.rs#L111-L114

`asset_class_color` で `"債券" => "#8B5CF6"` (violet-500) と `"公的年金" => "#A855F7"` (purple-500) が両方ともパープル系。ダッシュボードのカテゴリ別内訳チャートで両者が並んだとき、小さいスライスや凡例なしの場面で識別しづらくなる懸念がある。

既存の色配置を見ると、`#10B981` (緑/現金)、`#06B6D4` (シアン/外貨預金)、`#84CC16` (ライム/生活防衛資金) など同系色を避けて配色しているので、ここだけ色相が重なるのは違和感がある。

候補: `#EC4899` 系（ピンク）はすでに保険で使用済みなので、`#F472B6` (pink-400)、`#FB923C` (orange-400)、または `#6366F1` (indigo-500) など使われていない色相にすると区別しやすい。

> **PR Comment (EN):**
> `asset_class_color` assigns `#8B5CF6` (violet-500) to `債券` and `#A855F7` (purple-500) to `公的年金`. Both are in the same purple range and can be hard to distinguish in side-by-side chart slices. Other categories deliberately use distinct hues (cash → green, forex → cyan, 生活防衛資金 → lime). Consider switching `公的年金` to a non-purple shade, e.g. `#F472B6` (pink-400) or `#6366F1` (indigo-500).

---

### [SUGGESTION] `EXCLUDED_FROM_ALLOCATION` と `AUTO_NAME_CLASSES` が同じ要素を持つ (confidence: 35)

https://github.com/mczkzk/shadow-asset/blob/7c0e5e5aece8ceb551e620c113bdaa2d3beb95cb/src/pages/Allocation.tsx#L8

https://github.com/mczkzk/shadow-asset/blob/7c0e5e5aece8ceb551e620c113bdaa2d3beb95cb/src/components/allocation/ManualAssetForm.tsx#L74

両 Set は現状で要素が完全一致 (`{"生活防衛資金", "公的年金"}`) しているが、意味的には独立した概念（「配分対象から除外する」と「名前を自動入力する」）。

現時点では偶然一致しているだけなので統合すると将来の片方の変更時に結合度が上がる。**統合非推奨**。ただし `src/lib/types.ts` の `MANUAL_ASSET_CLASS_ORDER` の近くに `EXCLUDED_FROM_ALLOCATION` を移動すると、手入力資産クラスの一元管理として座りが良くなる可能性はある。

confidence が低いので任意の改善（保留もOK）。

> **PR Comment (EN):**
> `EXCLUDED_FROM_ALLOCATION` and `AUTO_NAME_CLASSES` happen to contain the same two strings today, but they encode independent concepts (exclusion from allocation chart vs auto-naming on the form). Keeping them separate is fine; merging would coincidentally couple unrelated behaviors. Optional: move `EXCLUDED_FROM_ALLOCATION` next to `MANUAL_ASSET_CLASS_ORDER` in `src/lib/types.ts` if you want all "manual asset class" knowledge to live in one place.

---

## Verified clean (報告対象外)

- **TypeScript 規約**: `any` なし、interface/type の使い分け OK、型キャスト撤廃済み（/simplify で対応済み）
- **個人データポリシー**: 具体的な金額/数量のハードコードなし（`amountPlaceholder` 内の例示値は UI ガイドとして既存パターン踏襲）
- **コメント**: `// 配分対象外: ...` は Why を説明しており規約準拠
- **対称性**: 生活防衛資金と公的年金は値抽出・フィルタ・保存ロジック・Rust 並び順・色定義の全てで対称に実装されている
- **波及**: `totalForJudgment` リネームは TargetJudgment 内15箇所 + Allocation.tsx 1箇所すべて整合。`MANUAL_ASSET_CLASS_ORDER` の参照箇所も影響なし
- **後方互換**: 旧データに公的年金エントリがなくても `?? 0` と `unwrap_or(99)` でフォールバックが効く
- **過去PR**: 人間レビューコメントは過去ゼロ件、転用すべきパターンなし
