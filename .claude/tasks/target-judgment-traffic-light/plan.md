# 目標判定セクション: トラフィックライト表示 + 割合ベース目標追加

## 概要
目標判定セクションの表示ロジックを改善し、新しい割合ベースの目標項目を追加する。

## 変更内容

### 1. FIRE目標額 (変更なし)
- 超えれば超えるほどOK (green/red 2色)

### 2. 月数ベース目標 (生活防衛資金/現金ポジション/個人向け国債)
- 旧: `+¥X OK` / `¥-X 不足` (green/red 2色)
- 新: 目標値からの乖離率でトラフィックライト (green/amber/red 3色)
  - ±10%以内 → 緑 "OK"
  - ±25%以内 → 黄 "要調整"
  - ±25%超 → 赤 "大幅乖離"

### 3. 割合ベース目標 (新規: ゴールド/保険/不動産)
- 総資産(生活防衛資金除外)の何%を目標にするかテキスト入力 (0-100)
- 0% = 判定しない
- 同じトラフィックライト表示

## 変更ファイル
- `src/components/allocation/TargetJudgment.tsx` - メイン実装
- `src/pages/Allocation.tsx` - props追加

## 新規設定キー (SQLite KV)
- `gold_target_pct`
- `insurance_target_pct`
- `real_estate_target_pct`

## Status: Complete
