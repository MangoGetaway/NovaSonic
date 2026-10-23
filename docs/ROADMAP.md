# Delivery roadmap

## Phase 0 — Foundation (in this change)
- [x] Product positioning, IA, style tokens, privacy policy, architecture and model-adapter boundaries.
- [x] Tauri desktop architecture with Rust-owned loopback HTTP and SQLite.
- [x] First-run/empty states, local discovery, model picker, chat stream/cancel and persistent conversations (implementation subject to native platform validation).
- [ ] Automated CI across desktop OS targets and signed installers.
- [ ] Native integration test against representative versions of Ollama/LM Studio/llama.cpp.

## Phase 1 — Reliable daily assistant
- [ ] Streaming parser tests, response retries, model/session context limits and generation settings.
- [ ] Rename, duplicate, pin, organize, export/import conversation history.
- [ ] Syntax highlighted code, copy/retry/regenerate/edit message, robust Markdown with safe links.
- [ ] Hardware diagnostics, performance metrics, cache and memory-pressure management.
- [ ] Error recovery, recovery from interrupted generations, complete keyboard shortcut system.
- [ ] OS packaged build + platform signing, accessibility and offline acceptance testing.

## Phase 2 — Bring any local model
- [ ] Direct GGUF runner with managed llama.cpp lifecycle, portable executable handling and hardware detection.
- [ ] User-controlled model directory scanning; model profiles and installed engine discovery.
- [ ] Expanded local formats/engines via signed adapters.
- [ ] Capability-based model filtering and controlled per-chat tuning.

## Phase 3 — Private knowledge
- [ ] Local file imports, text extraction, OCR (optional), chunking and embeddings.
- [ ] SQLite FTS / local vector index, citations, collection permissions, reindexing and deletion.
- [ ] Projects/spaces with scoped context, per-project instructions and data migration.

## Phase 4 — Trusted actions
- [ ] Approval-gated filesystem tools and document generation.
- [ ] Opt-in terminal actions with sandbox limits and audit trails.
- [ ] Local workflows, queued jobs, checkpoints and agent evaluation.
- [ ] Offline STT/TTS, optional accessible voice mode.

## Release gates

A milestone only ships as stable when (1) it works with internet physically disconnected, (2) privacy tests pass, (3) data migration/restore tests pass, (4) platform packaging succeeds, (5) accessibility checks pass, (6) supported-engine matrix passes. Marketing claims must reflect passing capabilities, not planned ones.
