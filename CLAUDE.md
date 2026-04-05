## SSoT (Single Source of Truth) -- DO NOT REMOVE
**You MUST keep these files up-to-date at every implementation milestone. This is non-negotiable.**
- `.claude/tasks/*/plan.md` -- investigation findings, implementation progress, decisions
- `docs/SPEC.md` -- project specification (if exists)

Update these files BEFORE moving to the next task. They are the persistent record that survives context resets.

## Build

**Build + install to /Applications + ad-hoc sign:**
```bash
npm run install-app
```

**リビルド回数を最小限にすること。** アプリ起動ごとに `fetch_portfolio` が外部API (Yahoo Finance等) を叩くため、繰り返しビルド→起動するとレート制限にかかる。
- 検証は `npx tsc --noEmit` + `cargo test` で行う
- `npm run install-app` はまとめて1回だけ実行する

## Personal Data Policy -- DO NOT REMOVE
- **銘柄名・ティッカーの記載: OK** (公開情報)
- **保有数量・口数・金額の記載: 絶対禁止** (個人資産を特定できる情報)
- 数量はSQLite DB (gitignore対象) にのみ保存する
- サンプルデータの数量部分はダミー値を使うこと
