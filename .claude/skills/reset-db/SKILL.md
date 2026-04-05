---
name: reset-db
description: Reset the Shadow Asset SQLite database by deleting DB files. Use when user wants to clear all data or start fresh.
disable-model-invocation: true
---

# Reset DB

Delete the Shadow Asset SQLite database files. The app will create a fresh empty DB on next launch.

Run:

```bash
rm -f "$HOME/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db" \
      "$HOME/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db-shm" \
      "$HOME/Library/Application Support/com.mczkzk.shadow-asset/shadow-asset.db-wal"
```

After running, confirm deletion to the user and remind them to import a backup if needed.
