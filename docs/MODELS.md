# Model compatibility strategy

**Honest promise:** NovaSonic can discover and use a broad range of already-installed models **when a compatible local inference runtime can serve them**. No desktop application can execute every possible model format or architecture through one universal API.

## Foundation support

| Runtime | Local discovery | Local chat stream | Requirements |
|---|---|---|---|
| Ollama | GET http://127.0.0.1:11434/api/tags | POST /api/chat (NDJSON) | Ollama running and a model installed |
| LM Studio | GET http://127.0.0.1:1234/v1/models | POST /v1/chat/completions (SSE) | Local server started, a compatible model loaded/available |
| llama.cpp server | GET http://127.0.0.1:8080/v1/models | POST /v1/chat/completions (SSE) | Local llama-server running with a model |

If multiple servers listen at the same endpoint port, the implementation identifies them by the configured adapter, not by universal protocol fingerprinting. If a provider fails, NovaSonic reports that provider unavailable.

## Planned expanded support

1. **Direct GGUF launch:** user selects local file and llama.cpp executable (bundled/signed or user-supplied); spawn **without a shell** on a random loopback port; clean child lifecycle; detect architecture compatibility.
2. **Model directories:** explicit user-selected paths, metadata and file-size reading; scan only selected roots, no unsolicited whole-disk crawling.
3. **Additional engines:** MLX, llama.cpp variants, Transformers/safetensors via installed Python runtime, ONNX, vLLM and other explicitly local OpenAI-compatible APIs.
4. **Capabilities:** per-model support for vision, tools, structured outputs, embeddings, audio and maximum context. Never assume all models implement all capabilities.
5. **Hardware advisor:** RAM/VRAM estimates, context and quantization options, GPU support and graceful loading failures.
6. **Profiles:** model presets and deterministic routing; opt-in advanced overrides.

No automatic downloads, model license bypass, or remote model execution without a separately designed explicit user action. Document any future cloud integration as **non-offline optional**, visibly isolated and disabled by default.

## Upstream protocol references

- Ollama API: https://docs.ollama.com/api
- LM Studio local server: https://lmstudio.ai/docs/developer/core/server
- llama.cpp server: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
