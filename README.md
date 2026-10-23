# NovaSonic

**Your intelligence. Your machine. Your rules.**

NovaSonic is a privacy-first, offline-first desktop AI assistant with a premium workspace, multi-runtime model discovery, and local conversation storage.

> **Status: foundation / alpha.** This repository provides a designed desktop shell and initial local-model chat path. It is not yet a production-ready, universally compatible model runner.

## Principles

- **No required account, cloud API, telemetry, or hosted inference.**
- **Localhost-only model connections.** External URLs are not accepted by the first-party provider adapters.
- **Bring your existing models.** The alpha connects to running local Ollama, LM Studio, and llama.cpp-compatible servers. Direct GGUF launch and additional runtimes are on the roadmap.
- **Local ownership.** Conversation history is stored in an application-specific SQLite database.
- **No hidden execution.** Future tools, file access, and terminal commands require explicit user approval.

## Stack

Tauri 2 · Rust · React 19 · TypeScript · Vite · SQLite · CSS design tokens.

## Quick start

Prerequisites: Node.js 20+, Rust stable, and the Tauri 2 system dependencies for your OS; start at https://tauri.app/start/prerequisites/.

```bash
npm install
npm run tauri:dev
```

Start a local inference server separately. Examples:

- Ollama: http://127.0.0.1:11434 (GET /api/tags)
- LM Studio: http://127.0.0.1:1234 (GET /v1/models; enable its local server)
- llama.cpp server: http://127.0.0.1:8080 (GET /v1/models)

The desktop interface detects available models on launch and on **Refresh models**. Select a model, create a conversation, and chat. There is **no browser-only inference mode**: the UI requires the Tauri/Rust desktop host to access the local database and runtime adapters.

```bash
npm run build
npm run typecheck
npm run tauri:build
```

## Repository map

```text
src/                Desktop UI, model selection, conversation experience
src-tauri/src/      Local Rust commands, provider adapters, SQLite storage
src-tauri/          Tauri manifest, least-privilege capabilities
docs/               Product direction, system contracts, security, design, roadmap
```

Read [Product](docs/PRODUCT.md), [Architecture](docs/ARCHITECTURE.md), [Design system](docs/DESIGN_SYSTEM.md), [Security](docs/SECURITY.md), [Compatibility](docs/MODELS.md), and [Roadmap](docs/ROADMAP.md).

## Alpha boundaries

This foundation targets Windows, macOS, and Linux, but packaged binaries and native builds have **not yet been validated on all three platforms**. No direct GGUF loading, document indexing, tool execution, voice, connectors, encrypted database, auto-updater, or installer signing are claimed here. These remain planned milestones.

## License

No open-source license has been selected yet; contributions and redistribution should not be assumed to be licensed until one is added.
