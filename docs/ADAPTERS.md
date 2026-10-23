# Local model adapter specification

## Goal

Integrate additional installed local runtimes without changes to chat, storage or product UI. The alpha uses two response stream protocols and three fixed loopback providers. Future adapters must not weaken the default offline contract.

## Interface proposal (v1)

```rust
trait ModelAdapter {
    fn id(&self) -> &'static str;
    fn discover(&self) -> Future<Vec<ModelDescriptor>>;
    fn capabilities(&self, model_id: &str) -> Future<ModelCapabilities>;
    fn generate(&self, request: GenerationRequest) -> Stream<GenerationEvent>;
    fn cancel(&self, request_id: Uuid) -> Future<()>;
    fn health(&self) -> Future<RuntimeHealth>;
}
```

This is an **architectural interface sketch**, not a compiled trait in the current alpha.

Descriptors include stable local ID, runtime identifier, optional quantization, context limit, modality, tool support, embedding capability, GPU residency and memory estimate. A missing capability must be reported as unknown rather than invented.

## Trust rules

- All app-owned inference/network I/O runs in Rust, not the webview.
- Adapter installation is a user-confirmed action with signature and API-version checks.
- Remote hosts are rejected under offline mode. User-configured ports, if introduced, must still be bound to validated IPv4 or IPv6 loopback addresses.
- No implicit shell invocation or dynamic path execution.
- Future direct model launch must use OS-native process APIs, explicit binary/file selection, sandbox constraints, random local ports, lifecycle cleanup and user-visible logs.
- Adapter execution and tool execution are **different privileges**: inference plugins cannot automatically gain filesystem/terminal access.

## Interoperability test contract

Each adapter is tested against model listing, schema normalization, first token, UTF-8 chunk boundaries, multiline SSE/NDJSON, cancel-before-first-token, cancel-midstream, server crash, empty model list, absent server, invalid model, large outputs and no external DNS/WAN traffic.

## Architecture boundaries

Frontend is only responsible for display and user intent. Coordinator owns concurrency/cancel/retry. Adapter owns protocol and server connection. Database owns durable conversation history. Tools (later) run behind a separate approval/sandbox service.
