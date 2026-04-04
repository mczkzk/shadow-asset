# PR #3 Review: Add CSV import for fund holdings (SBI/Rakuten)

## Summary

CSV取込機能の追加。SBI証券(保有一覧CSV)と楽天証券(取引履歴CSV)からファンド保有口数を自動更新する。プレビュー→確認→適用の2段階フロー。

**Changed files:**
- `src-tauri/src/commands/csv_import.rs` (new, 367 lines) - CSV解析、名前マッチング、preview/applyコマンド
- `src/pages/Accounts.tsx` - CSV取込UI (ドロップダウン、プレビュー表示、適用ボタン)
- `src/lib/api.ts` - `previewCsvImport` / `applyCsvImport` API
- `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs` - コマンド登録
- `src-tauri/Cargo.toml` - csv, encoding_rs クレート追加
- `docs/SPEC.md` - CSV取込手順のドキュメント
- `.claude/tasks/csv-import/plan.md` - 設計ドキュメント

## Verification Steps

1. SBI証券CSVを取込 → プレビューに6件表示 → 「適用する」で更新確認
2. 楽天証券CSV(全移管済み) → 「0件の更新候補」と表示確認
3. DBに未登録の銘柄がある場合 → 「未マッチ」として黄色表示確認
4. 適用前に閉じる → DBが変更されていないことを確認

## Findings

### [MUST] plan.md SSoT違反: 関数名が古い (confidence: 100)

https://github.com/mczkzk/shadow-asset/blob/84eb4d47245c3ac0eec0d9f139e72d4d52169075/.claude/tasks/csv-import/plan.md#L29

plan.md の Architecture セクションに `importCsvHoldings(path, broker)` と記載されているが、実装は `previewCsvImport` / `applyCsvImport` の2関数に分割されている。`importCsvHoldings` は存在しない。CLAUDE.md の SSoT ルールに違反。

> **PR Comment (EN):**
> `plan.md` line 29 references `importCsvHoldings(path, broker)` which doesn't exist.
> Actual API is `previewCsvImport` / `applyCsvImport`. Please update per CLAUDE.md SSoT rule.

### [SHOULD] `account_matches` にデッドブランチ (confidence: 100)

https://github.com/mczkzk/shadow-asset/blob/84eb4d47245c3ac0eec0d9f139e72d4d52169075/src-tauri/src/commands/csv_import.rs#L242

`account_matches` の match アームに `"nisa_seichou" | "nisa_tsumitate" | "nisa_old"` が含まれるが、`build_preview` (L263-267) で事前に `"nisa"` / `"tokutei"` にマージされるため、これらの値は絶対に到達しない。コードを読む人に誤った意図を伝える。

> **PR Comment (EN):**
> The `"nisa_seichou" | "nisa_tsumitate" | "nisa_old"` arms in `account_matches` are
> dead code. `build_preview` merges these to `"nisa"` or `"tokutei"` before calling
> this function. Simplify to just `"tokutei"` and `"nisa"`.

### [NIT] `names_match` の `min_len` がバイト長で文字数ではない (confidence: 50)

https://github.com/mczkzk/shadow-asset/blob/84eb4d47245c3ac0eec0d9f139e72d4d52169075/src-tauri/src/commands/csv_import.rs#L225

`str::len()` はUTF-8バイト数を返す。日本語は1文字3バイトなので `>= 8` は約2-3文字分。実用上は全ファンド名が長いため問題にならないが、意図と実装にギャップがある。

> **PR Comment (EN):**
> `str::len()` returns byte count, not character count. 8 bytes = ~2-3 Japanese chars.
> Not a practical issue with current fund names, but `chars().count()` would match intent.

### [NIT] `normalize_rakuten_name` にひらがなバリアント未対応 (confidence: 50)

https://github.com/mczkzk/shadow-asset/blob/84eb4d47245c3ac0eec0d9f139e72d4d52169075/src-tauri/src/commands/csv_import.rs#L195-L203

`"(オルカン)"` (カタカナ) のみ除去するが、`names_match` では `"(おるかん)"` (ひらがな) も処理している。楽天は実際にはカタカナのみ使用するため実害なし。

> **PR Comment (EN):**
> `normalize_rakuten_name` only handles katakana "(オルカン)" but `names_match` also
> handles hiragana "(おるかん)". Low risk since Rakuten uses katakana exclusively.
