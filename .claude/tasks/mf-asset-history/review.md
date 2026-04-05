# PR #4 Review: Add MoneyForward CSV import and stacked area chart

## Summary

MoneyForward「資産推移月次」CSVインポート機能と積み上げエリアチャートを追加するPR。

**変更ファイル (13件)**: +590/-94 lines

## Findings (全件修正済み)

| # | Severity | Finding | Confidence | Status |
|---|----------|---------|------------|--------|
| 1 | ~~MUST~~ | 旧カテゴリ名の互換性 | 75 | **対象外** (後方互換不要) |
| 2 | MUST | preview期間表示がCSV行順に依存 | 75 | **Fixed** (min/max date計算) |
| 3 | SHOULD | 「適用する」ボタンに二重クリック防止なし | 75 | **Fixed** (importing state再利用) |
| 4 | SHOULD | テストデータの金額がPersonal Data Policyに抵触 | 75 | **Fixed** (小さなダミー値に変更) |
| 5 | SHOULD | 色定数が3箇所で重複 | 68 | **Fixed** (AREA_COLORS削除、breakdown_jsonのcolorを直接利用、asset_class_color pub(crate)化) |
| 6 | SUGGESTION | catch節のString(e)パターン不統一 | 75 | **Fixed** |
| 7 | SUGGESTION | get_snapshotsのdays負値ガードなし | 75 | **Fixed** (days <= 0 でエラー) |
| 8 | NIT | MfPreviewRowをinterface extendsに統一 | 75 | **Fixed** |
| 9 | NIT | useSnapshotsスキップガードのコメント未更新 | 50 | **Fixed** |
