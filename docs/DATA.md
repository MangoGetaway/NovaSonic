# Local data model and lifecycle

SQLite resides in the operating system's per-application data directory under the NovaSonic Tauri application identifier.

## Alpha schema

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

The app enables foreign keys and WAL. Data is not uploaded by NovaSonic. No per-message cloud IDs or remote sync attributes exist.

## Evolution

Before the first breaking schema change, introduce `PRAGMA user_version` and forward-only ordered migrations with preflight backup. Support user-controlled export/import of JSON and Markdown, a visible local data reset function, secure file permissions, and optional at-rest encryption keyed through the OS credential manager.

## Retention

Conversation records persist until explicitly deleted. Deletion cascades to messages, but SQLite WAL pages and operating-system backups can retain historical bytes; **secure erase is not guaranteed** in the alpha. Implement VACUUM/checkpoint and privacy-aware backup/retention controls before claiming secure deletion.
