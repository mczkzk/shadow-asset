# PR #10 Review: Add traffic light deviation badges and percentage-based allocation targets

## Summary

| File | Changes |
|------|---------|
| `src/components/allocation/TargetJudgment.tsx` | Traffic light badges, PercentInputRow, noise filter, 6 new pct targets |
| `src/pages/Allocation.tsx` | Map-based value lookup, new props, layout fix, emergency fund note |
| `.claude/tasks/target-judgment-traffic-light/plan.md` | Task documentation |

## Verification Steps

1. `npx tsc --noEmit` で型チェック
2. `npm run install-app` でビルド後、アロケーションページで:
   - 生活費設定済み状態で各目標の3色表示を確認
   - ゴールド等の%入力 → blur/Enterで保存 → リロードで復元確認
   - 空欄入力で「判定しない」動作確認
   - 0%入力で「持たない」目標として赤表示確認
   - 月数0ヶ月選択時の動作確認

## Findings

### [MUST] docs/SPEC.md が未更新 (SSoT違反) (confidence: 100)

https://github.com/mczkzk/shadow-asset/blob/f4ab8376031a050d6ee6363fbe4ba35d9fe8a646/.claude/tasks/target-judgment-traffic-light/plan.md#L27-L31

CLAUDE.md: "You MUST keep docs/SPEC.md up-to-date at every implementation milestone. This is non-negotiable."

6つの新設定キー (`bond_target_pct`, `gold_target_pct`, `crypto_target_pct`, `forex_deposit_target_pct`, `insurance_target_pct`, `real_estate_target_pct`) と、トラフィックライト判定ロジック (±10%=緑/±25%=黄/超=赤)、ノイズフィルタ (総資産の0.5%未満は無視) が `docs/SPEC.md` に反映されていない。過去PRでも繰り返し指摘されたパターン。

> **PR Comment (EN):**
> `docs/SPEC.md` is not updated with the new percentage-based target settings and traffic light logic. CLAUDE.md requires SPEC.md to be kept up-to-date at every implementation milestone. The settings table documentation (line 206) still only lists the original 4 keys, and the goal assessment section (lines 197-203) doesn't mention the new percentage-based targets or the deviation thresholds.

### [SHOULD] 「生活費 × 0ヶ月」のラベルが意図を伝えていない (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/f4ab8376031a050d6ee6363fbe4ba35d9fe8a646/src/components/allocation/TargetJudgment.tsx#L123

旧コードでは `months=0` は「判定しない」と表示されバッジ非表示だった。新コードでは `months=0` = 目標ゼロ(持たない目標)として判定が走るが、ラベルは「生活費 × 0ヶ月」のままで、ユーザーに「資産があれば赤表示になる」という意味が伝わらない。%ベースの行では空欄=判定しない、0=持たない、と区別されているが、月数ベースでは空欄相当の選択肢がない。

> **PR Comment (EN):**
> The label `生活費 × 0ヶ月` doesn't convey that selecting 0 months means "target is zero, warn if assets exist." The old `判定しない` label was clearer. Consider renaming to something like `持たない (0円)` to match the percent rows where 0% clearly means "hold none."

### [NIT] `classifyDeviation` が inactive時にも呼ばれる (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/f4ab8376031a050d6ee6363fbe4ba35d9fe8a646/src/components/allocation/TargetJudgment.tsx#L152

`PercentInputRow` で `active === false` のとき `target=0` で `classifyDeviation` が呼ばれるが、結果は `{active && ...}` で非表示。無駄な計算であり、概念的にも不整合。

> **PR Comment (EN):**
> `classifyDeviation` is called unconditionally (line 152) but its result is only used inside `{active && ...}` guards. When inactive, consider `const level = active ? classifyDeviation(...) : "green"` to avoid unnecessary computation and conceptual inconsistency.

### [NIT] `commit()` が通常関数で定義されている (confidence: 75)

https://github.com/mczkzk/shadow-asset/blob/f4ab8376031a050d6ee6363fbe4ba35d9fe8a646/src/components/allocation/TargetJudgment.tsx#L154

ts-guidelines.md: "Callbacks and short functions: arrow function"。他のハンドラはすべてarrow functionで統一されている。

> **PR Comment (EN):**
> `function commit()` uses a function declaration, but `ts-guidelines.md` specifies arrow functions for callbacks. Other handlers in this file use arrow style consistently.
