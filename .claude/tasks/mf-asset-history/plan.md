# mf-asset-history - マネフォCSV取込 + 資産推移の積み上げエリアチャート

## Applicable Rules & Skills
- Personal Data Policy: 数量・金額はDB(gitignore対象)にのみ保存
- Always use feature branch + PR
- TypeScript strict mode, Rust conventions
- Minimize app rebuilds (Yahoo API rate limit対策)

## Requirements
1. MoneyForward「資産推移月次」CSVをインポートし、過去の資産推移データをDBに保存
2. 積み上げエリアチャートでカテゴリ別の資産推移を表示
3. 既存snapshotsデータ優先、MFデータで過去を補完

## Related Context
- マネフォのカテゴリ → アプリカテゴリへのマッピング: 投資信託+年金 → 投資信託、株式(現物) → 株式、債券 → 債券
- 預金・保険・ポイント・その他は取り込まない (アプリ管理対象外)

## Design Decisions
- **2層カテゴリ体系**: 商品種別(holding_type) = ダッシュボードTOP表示用、資産クラス(asset_class) = 将来のアロケーションページ用
- **snapshotsテーブルに直接INSERT**: 別テーブル不要。`INSERT OR IGNORE` で既存データ優先
- **preview → apply 2ステップ**: 既存CSV取込 (SBI/楽天) と同じUIパターン
- **カテゴリ名変更**: 米国株+米国ETF → 株式、仮想通貨 → 暗号資産

## Implementation Notes

### Rust
- `commands/mf_import.rs`: Shift_JIS CSV読込(csv_import.rsのread_shift_jis共用) → パース → preview/applyの2コマンド
- `commands/snapshots.rs`: `get_snapshots` にdays=None対応(全件取得)追加
- `commands/prices.rs`: `asset_class_name`/`asset_class_color` を新カテゴリに変更

### Frontend
- `AssetHistory.tsx`: LineChart → AreaChart (stackId="1")。breakdown_jsonを動的にパースしてArea要素生成。useMemoでメモ化。MF CSV取込UIを統合
- `api.ts`: `previewMfImport`, `applyMfImport` 追加
- `types.ts`: `MfPreviewRow = Omit<Snapshot, "id">`, `MfImportPreview`, `MfImportResult` 追加

### 変更ファイル一覧
- `src-tauri/src/commands/mf_import.rs` - 新規
- `src-tauri/src/commands/csv_import.rs` - read_shift_jisをpub(crate)に変更
- `src-tauri/src/commands/mod.rs` - mf_import追加
- `src-tauri/src/commands/snapshots.rs` - get_snapshotsのdays=None対応
- `src-tauri/src/commands/prices.rs` - カテゴリ名変更
- `src-tauri/src/lib.rs` - コマンド登録
- `src/lib/types.ts` - MfPreviewRow, MfImportPreview, MfImportResult追加
- `src/lib/api.ts` - previewMfImport, applyMfImport追加
- `src/components/dashboard/AssetHistory.tsx` - 全面書き換え
- `src/hooks/usePortfolio.ts` - useSnapshotsにreload追加、days任意化
- `docs/SPEC.md` - カテゴリ体系・MF取込仕様・未実装リスト追記
- `CLAUDE.md` - リビルド回数最小化ルール追記
