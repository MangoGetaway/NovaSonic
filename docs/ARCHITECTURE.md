# Architecture and system boundaries

```text
┌─────────────────────────────────────────────────┐
│ Tauri desktop: React/TypeScript                 │
│ Navigation · Chats · Model Hub · Settings       │
└───────────────────┬─────────────────────────────┘
                    │ typed Tauri invoke / events
┌───────────────────▼─────────────────────────────┐
│ Rust application service                         │
│ input validation · chat coordinator · cancellation│
│ storage access · lifecycle · model discovery     │
├────────────────────┬────────────────────────────┤
│ SQLite (app data)  │ Provider adapter registry  │
│ chats, messages    │ Ollama / OpenAI-compatible  │
└────────────────────┴─────────────┬──────────────┘
                                   │ HTTP loopback only
                        ┌──────────▼─────────────┐
                        │ Local runtime/model     │
                        │ Ollama, LM Studio,      │
                        │ llama.cpp server        │
                        └────────────────────────┘
```

## Selected stack

Tauri v2 provides native packaging and Rust boundaries without bundling a remote service. React+TS enables polished composable UI. SQLite is embedded, schema-versioned, and stored in the OS app-data directory. Rust owns network connections; the browser view cannot issue arbitrary provider requests.

## Backend commands

| Command | Purpose |
|---|---|
| `discover_models` | Probe fixed loopback endpoints with short timeouts; return available model descriptors |
| `list_conversations` | Ordered metadata for sidebar |
| `create_conversation` | Transactional local chat creation with selected model |
| `list_messages` | Ordered messages for one chat |
| `append_message` | Add user message after validating role/text |
| `delete_conversation` | Delete chat and children with FK cascade |
| `start_chat` | Stream model tokens via per-request Tauri event |
| `cancel_chat` | Abort one in-progress local request |

Events: `novasonic://chat-delta` (request_id, text), `novasonic://chat-finished` (request_id, text, error). The final assistant message is inserted by the Rust service on successful completion. All events carry a request ID; the UI ignores stale events.

## Core domain entities

```text
Provider { id, display_name, base_url [fixed loopback], protocol }
Model { key = provider/id, provider, id, label }
Conversation { id UUID, title, model_key, created_at, updated_at }
Message { id UUID, conversation_id, role, content, created_at }
Generation { request_id, conversation_id, provider, model_id, status }
```

There is intentionally no credential table or remote provider in the alpha.

## Inference pipeline

```text
user submits -> validate -> persist user message
  -> choose selected local provider -> start streaming HTTP
  -> parse Ollama NDJSON or OpenAI SSE -> emit text deltas
  -> persist complete assistant message -> final event
  -> front-end refreshes durable messages
```

Future adapters implement a versioned `discover, capabilities, start, cancel, health` contract and enforce endpoint security independently from UI code.

## Storage strategy

- Local SQLite app data; WAL mode and foreign keys enabled.
- Schema created idempotently on boot; additive/versioned migrations required for later releases.
- Timestamps as RFC 3339 strings in UTC, stable UUID primary keys.
- Service serializes DB access; no raw SQL is accepted from UI.
- Database encryption at rest is **not** included yet; use OS disk encryption until the feature ships.
- Documents, vector indexes, embeddings, cache, and memory will live in separately scoped local directories.

## Performance

- Discovery timeouts per runtime; failure of one provider cannot block the others.
- Stream rather than wait for full completion.
- Cap history sent to the inference engine, exposing context usage in a later release.
- Model loading occurs in the external runtime; NovaSonic does not duplicate model weights.
- Provide cancellation and release stream resources when conversation/model changes.

## Engineering principles

Small interfaces; no silent external fallbacks; input bounds; typed IPC; tests for stream parsing, adapter response normalization, database migrations, cancellation races, and zero-network offline mode. Keep optional future functionality behind capabilities and explicit user consent.
