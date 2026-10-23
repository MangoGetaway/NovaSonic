# Build, test and verification

## Development

Requirements: Node.js 20+, npm, Rust stable, and platform Tauri dependencies. Tauri prerequisites: https://tauri.app/start/prerequisites/

```bash
npm install
npm run typecheck
npm run build
npm run tauri:dev
```

To run Rust unit tests:
```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

The Tauri config currently has `bundle.active=false`: this is a development foundation, not a signed/distributable installer. When enabling bundling, add approved app icons, license, code signing, platform smoke tests and release workflows first.

## Manual acceptance matrix

| Check | Ollama | LM Studio | llama.cpp |
|---|---|---|---|
| Absent server doesn't crash discovery | [ ] | [ ] | [ ] |
| Installed model appears | [ ] | [ ] | [ ] |
| User input persists | [ ] | [ ] | [ ] |
| Response streams with UTF-8 | [ ] | [ ] | [ ] |
| Finished response persists | [ ] | [ ] | [ ] |
| Cancellation releases stream | [ ] | [ ] | [ ] |
| Invalid model shows error | [ ] | [ ] | [ ] |
| WAN disconnected, loopback works | [ ] | [ ] | [ ] |

Additional checks: tab order, theme contrast, restore after restart, deletion cascade, multiple conversations, window resize, server restart during chat, unexpected process termination, disk full, read-only app directory, long prompt, malformed model output, and no non-loopback outbound traffic.

## Validation status

- GitHub code has been authored and reviewed statically.
- CI workflows are configured, but a passing run is **not yet claimed**.
- Native package builds on Windows/macOS/Linux and model integration tests remain required before public alpha binaries.
