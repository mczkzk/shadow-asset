# PR #2 Review: Add export/import feature with JSON backup and restore

## Summary

| File | Change |
|------|--------|
| `src-tauri/src/commands/export_import.rs` | New: export_data / import_data Tauri commands |
| `src-tauri/src/lib.rs` | Plugin registration + command handler |
| `src-tauri/src/commands/mod.rs` | Module declaration |
| `src-tauri/Cargo.toml` | `tauri-plugin-dialog` dependency |
| `src-tauri/capabilities/default.json` | `dialog:default` permission |
| `src/lib/api.ts` | exportData / importData wrappers |
| `src/pages/Accounts.tsx` | Export/import buttons + confirmation UI |
| `package.json` / `package-lock.json` | `@tauri-apps/plugin-dialog` |
| `.claude/tasks/export-import/plan.md` | New task plan |
| `.claude/tasks/mvp/plan.md` | Updated checklist |
| `docs/SPEC.md` | Removed export/import from unimplemented list |

## Verification Steps

1. **Export**: click export button, save JSON, verify file contains accounts/holdings/snapshots
2. **Import**: click import button, select a previously exported file, confirm warning, verify data fully replaced
3. **Import cancel**: click cancel on amber confirmation banner, verify no data changes
4. **Error handling**: import an invalid JSON file, verify error message appears and data unchanged
5. **Empty DB export**: export with no data, verify valid JSON with empty arrays

## Findings

**No blocking or must-fix issues found.**

All candidate findings scored below confidence threshold (50):

- `breakdown_json` stored without JSON validation (confidence: 25). Frontend never parses this field from snapshots; it uses server-generated breakdown data instead. No practical impact.
- NaN/Infinity in f64 fields (confidence: 8). `serde_json` rejects non-finite floats by default during deserialization. Not a real vulnerability.
- Convention: "What" comments in Rust code (confidence: 55). Existing codebase uses same pattern pervasively (prices.rs). Consistent with project style.
- Convention: `catch (e)` without `unknown` type (confidence: 60). Pre-existing pattern throughout Accounts.tsx. PR is consistent.
- Export struct duplication (confidence: 0). Intentional design: Export structs omit `id` fields, add nesting, and have different serde attributes.

## Notes

- Mutex lock scope was correctly minimized in 2nd commit (export builds JSON in lock scope, releases before fs::write)
- Import uses `unchecked_transaction` with automatic rollback on drop (rusqlite guarantee)
- CASCADE delete leveraged correctly (accounts deletion cascades to holdings)
- Cross-platform path extraction handled with regex `replace(/.*[/\\]/, "")`
