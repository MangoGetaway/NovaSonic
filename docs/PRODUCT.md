# Product vision & functional specification

## Positioning

**NovaSonic — your intelligence, entirely yours.** A polished desktop co-pilot that keeps model inference, data, documents, and memory under local control. Unlike a hosted chatbot, NovaSonic should remain useful without internet access once supported models and runtimes are installed.

### Personas
1. **Everyday user:** wants a dependable, approachable local chat assistant.
2. **Professional creator:** drafts, summarizes, compares, and reasons over sensitive local content.
3. **Developer and power user:** brings custom quantized models, tunes context and generation, and eventually enables approved tools.
4. **Privacy-focused organization:** needs explainable data boundaries and repeatable deployment.

### Non-negotiables
- Offline functional core; no sign-in requirement, analytics, hosted authentication, or remote fallback.
- User-visible model identity on every conversation; never silently switch to a remote model.
- No unsolicited network connections. Model endpoints must resolve to loopback in the alpha.
- Conversations locally persistent; per-chat deletion.
- Accessible keyboard navigation, reduced-motion support, readable contrast, clear empty/error/loading states.
- Local-first updates, optional explicit import/export, deterministic migrations.

## Information architecture

**Workspace**
- Home: greeting, status, suggestions, resume history.
- Chats: search, create, rename (planned), delete, model selection, stream/cancel, retry (planned), markdown rendering.
- Model Hub: discovered runtimes and models, refresh, running/stopped states, performance and capability metadata (later).
- Library: import files, chunk/index/search with offline embeddings (milestone 2).
- Studio: prompt presets, specialized assistant configurations, reusable workflows (milestone 3).
- Settings: appearance, privacy, storage, provider management and model defaults.

## Interaction contract

1. Launch always shows usable navigation, even with no runtime.
2. Provider discovery is non-blocking and does not call the internet.
3. When no model is found, explain which local server needs starting; do not offer cloud fallback.
4. A chat is stored locally before any inference request. User message is committed before generation.
5. Token output appears incrementally; cancel stops the local request. Interrupted assistant messages are marked incomplete.
6. Provider errors display actionable causes, not generic failure. Failed requests do not erase user text.
7. A selected model is pinned to the conversation; switching models is an explicit user action.
8. Closing/reopening restores stored chats.

## Success measures

- 100% inference requests to explicitly permitted loopback endpoints in the initial implementation.
- Zero third-party network calls in offline acceptance testing.
- Model discovery works for the three initial runtime families.
- Conversation integrity after app termination and restart.
- Keyboard-only completion of core chat flow; WCAG AA-oriented contrast.
- Measurable first-token latency, throughput and crash-free sessions **locally** (no remote telemetry).

## Future differentiators

Model orchestration (route locally by workload), opt-in private memory, searchable knowledge collections, offline voice (STT/TTS), safe action approvals, batch document workflows, project workspaces, local-only agent runs, restore/export and advanced model diagnostics.

Feature priority must always favor predictable privacy and reliability over cosmetic AI automation.
