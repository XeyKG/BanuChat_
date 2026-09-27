# Backend

Frontera síncrona diseñada: Mobile → REST Backend API → Intent Router → fast path o Agent/RAG.

- `api/`: REST público consumido por la app móvil y especificación del Intent Router.
- `rag/`: ingesta, chunking, embeddings, retrieval y lógica futura relacionada.
- `mcp-server/`: tools internas para Agent/RAG, que actúa como cliente MCP.

Fast path y MCP reutilizarán Application Services. La app no consume MCP ni N8N
directamente; N8N queda fuera del camino síncrono y orquestará la ingesta asíncrona
de releases sintéticas completas.

PostgreSQL contiene representaciones procesadas de `/data/synthetic`.
Esta fase define el diseño; no existen implementaciones de estas aplicaciones.
El proveedor/modelo del LLM generador sigue pendiente. Embeddings del MVP está fijado
en Ollama local + `qwen3-embedding:0.6b`, 1024 dimensiones y `cosine`.
