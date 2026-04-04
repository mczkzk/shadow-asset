# export-import - エクスポート/インポート機能

## Applicable Rules & Skills
- ts-guidelines (TypeScript coding standards)
- CLAUDE.md SSoT rules
- Personal Data Policy (quantities OK in export file, but file is user-local only)

## Requirements
- [x] SQLiteに保存されている全データ(accounts, holdings, snapshots)をJSONファイルにエクスポート
- [x] JSONファイルからデータをインポート(全置換モード)
- [x] OSネイティブのファイルダイアログで保存先/読み込み元を選択
- [x] インポート時に確認UIを表示(破壊的操作のため)
- [x] トランザクション内でアトミックにインポート

## Related Context
- DBパス: `~/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db`
- テーブル: accounts, holdings, snapshots
- 数量データはローカルSQLiteのみに保存(プライバシーファースト)

## Investigation Notes
- Tauri v2の`tauri-plugin-dialog`でファイルダイアログを実装
- Rust側で`std::fs`を使ってファイルI/O、フロント側はパス選択のみ
- `unchecked_transaction()`でトランザクション管理(Mutex越しのため)
- CASCADE削除を活用(accounts削除でholdings自動削除)

## Implementation Notes

### 変更ファイル
- `src-tauri/Cargo.toml` - `tauri-plugin-dialog` 依存追加
- `src-tauri/src/lib.rs` - プラグイン登録 + コマンド登録
- `src-tauri/src/commands/mod.rs` - モジュール宣言追加
- `src-tauri/src/commands/export_import.rs` - **新規**: export_data / import_data コマンド
- `src-tauri/capabilities/default.json` - `dialog:default` 権限追加
- `src/lib/api.ts` - exportData / importData 関数追加
- `src/pages/Accounts.tsx` - エクスポート/インポートボタン + 確認UI
- `package.json` - `@tauri-apps/plugin-dialog` 追加

### JSONフォーマット (version: 1)
```json
{
  "version": 1,
  "exported_at": "2026-04-04T12:00:00+09:00",
  "accounts": [
    {
      "name": "...",
      "type": "nisa",
      "sort_order": 0,
      "holdings": [{ "ticker": "...", "name": "...", "quantity": 0, "holding_type": "fund", ... }]
    }
  ],
  "snapshots": [{ "date": "2026-04-04", "total_jpy": 0, "breakdown_json": "..." }]
}
```
