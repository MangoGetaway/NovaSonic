# Security, privacy and trust boundaries

## Offline contract

The first-party NovaSonic application does not require an account and does not contact telemetry, analytics, model registries, license servers, or cloud inference services. The only application-initiated network calls in the alpha are to hard-coded IPv4 loopback addresses for local inference. Inference HTTP clients disable system proxies and HTTP redirects, preventing a local server from redirecting the app to a non-loopback destination. External engines may have their **own** network settings; NovaSonic cannot enforce those settings, so review external runtimes independently.

## Threat model

1. **Model prompt injection:** treat model output as untrusted text. No automatic filesystem reads or command execution from model output.
2. **Untrusted local endpoints:** provider URLs fixed in Rust; front-end may choose provider/model identifiers but not arbitrary hosts or URLs.
3. **XSS/HTML:** render response Markdown with escaped raw HTML and non-navigable text links. Never evaluate model-generated script or inject HTML directly.
4. **Data loss:** SQLite transactions, foreign keys, atomic durable writes and schema migration tests.
5. **Sensitive history:** SQLite is unencrypted at rest in alpha. OS disk encryption and secure OS accounts are necessary until optional encryption ships.
6. **Tool escalation:** tool/action system is not implemented yet. Future designs must require per-action approval, bounded allowlists, audit logs, and process isolation.
7. **Supply chain:** lockfiles, dependency audits, SBOM, signed builds and release provenance before stable.

## Permissions

- No broadly scoped filesystem plugin; app data is managed in Rust.
- No OS shell plugin exposed to the webview.
- No remote content loaded into the UI. CSP should disallow network connections from frontend scripts.
- Separate platform-specific capabilities for future device access; request least privilege.

## Offline acceptance test

1. Fully install runtime/model before disconnecting.
2. Disconnect WAN (airplane mode) while allowing loopback.
3. Start the desktop app, discover models, chat, reload history, delete chat.
4. Capture outbound network attempts. Expected: **zero non-loopback destinations from NovaSonic**.
5. Verify all failure modes (server unavailable, invalid model, cancellation) remain understandable offline.

## Reporting

Use private contact with project maintainers for security issues; do not publish private user data or exploit details in issues.
