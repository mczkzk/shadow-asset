# public-pension-paid - 公的年金（保険料納付総額）の追加

## Applicable Rules & Skills
*To be filled after codebase exploration.*

## Requirements

年金ネットで確認できる「これまでの保険料納付総額（総合計）」を、shadow-asset の手入力資産として追加する。

### 機能要件
- 新しい資産クラス `公的年金` を `manual_assets` に追加（スキーマ変更なし）
- アセットアロケーションページから手入力でCRUD可能（既存の手入力資産CRUDフローを利用）
- 入力値は円建て（`value_jpy` のみ使用、`currency`/`amount` は null）
- 年金ネットからの自動取得（スクレイピング/API）は**行わない** -- ログイン必須かつ公開APIなし

### 表示要件（生活防衛資金と同じ「配分対象外」パターン）
| 項目 | 扱い |
|---|---|
| 総資産 (ダッシュボードTotalAssets) | 含める |
| アセットアロケーションチャート | **除外** |
| FIRE目標（4%ルール）の母数 | **除外**（流動性ゼロのため取り崩しできない） |
| 割合ベース判定（債券%/ゴールド%等）の母数 | **除外** |
| 月数ベース判定（生活防衛資金/現金ポジ等） | **対象外**（独自目標は持たない） |
| 注記表示 | `※ 公的年金 ¥xxx は配分対象外のため除外` をチャート下に表示 |

### スコープ外（やらないこと）
- 年金ネットのスクレイピング/API連携（手入力のみ）
- 将来の年金受給額の推定
- 確定拠出年金（DC）との統合 -- DCは既に `holding_type=投資信託` で銘柄管理されているため別物

## Related Context

### 既存の類似パターン: 生活防衛資金
- `src/pages/Allocation.tsx:113-128` -- チャート/テーブルから除外、注記表示
- `src/components/allocation/TargetJudgment.tsx:297` -- `totalExcludingEmergency` でFIRE判定母数から除外
- `src/lib/types.ts:119` -- `MANUAL_ASSET_CLASS_ORDER` に登録

### 既存の関連カラム
- MoneyForward CSV の `年金` 列は **確定拠出年金（DC）** を指しており、`投資信託` カテゴリにマージされる（`docs/SPEC.md`）。公的年金とは別物なので混同しないこと。

### 影響ファイル（推定）
- `src/lib/types.ts` -- `MANUAL_ASSET_CLASS_ORDER` に `公的年金` 追加
- `src/pages/Allocation.tsx` -- 生活防衛資金と対称に `pensionValue` 除外ロジック、注記追加
- `src/components/allocation/TargetJudgment.tsx` -- `totalExcludingEmergency` を年金分も差し引くよう拡張
- `docs/SPEC.md` -- 手入力資産クラス一覧と「配分対象外」記述を更新

## Applicable Rules & Skills
- `~/.claude/CLAUDE.md` -- Japanese response, no em dashes, run `date` for date-dependent code
- `~/.claude/rules/ts-guidelines.md` -- strict TypeScript, prefer interface for object shapes, avoid any
- `CLAUDE.md` -- 個人データポリシー（数量/金額禁止）、リビルド最小化（cargo check + tsc で検証、install-app は最後に1回）
- SSoT: plan.md と docs/SPEC.md を更新

## Investigation Notes
- ドロップダウンの実体は `ManualAssetForm.tsx` の `ASSET_CLASS_OPTIONS`（`MANUAL_ASSET_CLASS_ORDER` ではない）
- Rust の `dashboard_category()` は `other => other` フォールバックで、未マップのクラス名はそのままダッシュボードカテゴリになる。「公的年金」を新カテゴリとして出すなら追加マッピング不要
- 生活防衛資金は `dashboard_category()` で「預金・現金・暗号資産」に統合される（流動性が高い現金扱い）が、公的年金は性質が異なるため独自カテゴリとして残す
- `holding_snapshots` には手入力資産は保存されない（既存仕様）。`snapshots.total_jpy` には手入力資産分も加算される
- TargetJudgment の `totalExcludingEmergency` プロップは公的年金も除外するようになったため `totalForJudgment` にリネーム

## Implementation Notes

### 変更ファイル
| ファイル | 変更内容 |
|---|---|
| `src/lib/types.ts` | `MANUAL_ASSET_CLASS_ORDER` に `"公的年金"` を追加（保険と生活防衛資金の間） |
| `src/components/allocation/ManualAssetForm.tsx` | `ASSET_CLASS_OPTIONS` に公的年金エントリ追加。`autoName` を `autoNameClasses` マップに汎化（生活防衛資金と公的年金で共通利用） |
| `src/pages/Allocation.tsx` | `EXCLUDED_FROM_ALLOCATION` 配列で除外ロジックを集約、`pensionValue` 計算と注記表示を追加 |
| `src/components/allocation/TargetJudgment.tsx` | プロップ名 `totalExcludingEmergency` → `totalForJudgment` にリネーム（15箇所） |
| `src-tauri/src/commands/allocation.rs` | `class_order` に `"公的年金"` 追加（保険と生活防衛資金の間） |
| `src-tauri/src/commands/prices.rs` | `asset_class_color` に `"公的年金" => "#A855F7"` 追加 |
| `docs/SPEC.md` | 手入力資産クラス一覧と MVP セクションの説明を更新 |

### 検証
- `npx tsc --noEmit`: ✅ エラーなし
- `cd src-tauri && cargo check`: ✅ エラーなし
- `cargo test`: 1件失敗するが私の変更とは無関係（`us_stock_tsumitate_converts_jpy_to_usd` が `2025-10-01` からの経過月数を6想定でハードコードしており、現在日付2026-05-17では7ヶ月経過で範囲外。pre-existing な時間依存テスト）

### スキーマ変更
なし。`manual_assets.asset_class` は文字列カラムでバリデーション無しのため、新クラス追加に DB マイグレーション不要。

### レビュー指摘の修正
- `prices.rs` ダッシュボード集計の `class_order` 配列にも `"公的年金"` を追加（L424-427）。これがないと将来カテゴリ追加時に並びが壊れる
- `ManualAssetForm.tsx` の onChange ハンドラを `autoNameClasses` 参照に変更し、編集モードでクラス切替時に name が空にならないよう堅牢化

### 動作確認すべきこと（次のステップで `npm run install-app`）
1. アセットアロケーション画面の「手入力資産を追加」で「公的年金」が選択肢に出る
2. 公的年金を追加すると名前が自動で「公的年金」になる
3. ダッシュボードの総資産に金額が加算される
4. アセットアロケーションチャートには公的年金が表示されず、下に「※ 公的年金 ¥xxx は配分対象外のため除外」と注記
5. 目標判定（FIRE/割合ベース）の母数から公的年金が除外されている
6. ダッシュボードのカテゴリ別内訳には「公的年金」が独自カテゴリとして表示される
